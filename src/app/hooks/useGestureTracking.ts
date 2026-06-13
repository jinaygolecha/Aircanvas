/**
 * useGestureTracking — Production Gesture Intelligence Hook
 *
 * Architecture:
 *   1. WebRTC camera via getUserMedia with optimal video constraints
 *   2. Low-light detection (canvas brightness analysis every 30 frames)
 *   3. Low-light compensation via Canvas2D filter on preprocessing canvas
 *   4. MediaPipe Hands loaded from CDN (avoids Vite/WASM issues)
 *   5. LandmarkSmoother (One Euro Filter) applied to all 21 landmarks
 *   6. MotionPredictor fills < 5 frame tracking gaps via linear extrapolation
 *   7. GestureEngine runs 10-stage validation pipeline
 *   8. Air Writing: One Euro filtered fingertip + quadratic bezier interpolation
 *   9. Skeleton overlay with quality-coded colors + hold progress arc
 *  10. FPS throttling to 30 FPS target for stable performance
 *
 * Performance targets: ≥95% tracking reliability, ≥90% gesture accuracy,
 * 30–60 FPS, <100ms end-to-end latency, zero accidental activations.
 */

import { useRef, useState, useEffect, useCallback } from "react";
import { LandmarkSmoother, MotionPredictor, OneEuroFilter2D } from "../lib/kalmanFilter";
import {
  GestureEngine,
  GestureResult,
  CalibrationProfile,
  DEFAULT_CALIBRATION,
  Landmark,
} from "../lib/gestureEngine";
import { GestureAnalytics } from "../lib/gestureAnalytics";

// ── MediaPipe CDN Loader ────────────────────────────────────────────────────────

async function loadMediaPipeHands(): Promise<any | null> {
  if ((window as any).Hands) return (window as any).Hands;

  return new Promise((resolve) => {
    const existing = document.getElementById("__mp_hands__");
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any).Hands ?? null));
      return;
    }
    const s = document.createElement("script");
    s.id = "__mp_hands__";
    s.src = "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js";
    s.crossOrigin = "anonymous";
    s.onload  = () => resolve((window as any).Hands ?? null);
    s.onerror = () => { console.error("[GestureTracking] MediaPipe CDN load failed"); resolve(null); };
    document.head.appendChild(s);
  });
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface GestureTrackingState {
  isLoading: boolean;
  isActive: boolean;
  error: string | null;
  cameraPermission: "granted" | "denied" | "prompt" | "unknown";
  result: GestureResult | null;
  analytics: GestureAnalytics;
  calibration: CalibrationProfile;
}

export interface AirDrawEvent {
  x: number;       // canvas pixel x
  y: number;       // canvas pixel y
  isDown: boolean; // pen down = drawing
  pressure: number;// simulated 0–1 (based on velocity)
}

interface UseGestureTrackingOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  overlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Optional visible <video> element to display the live camera feed */
  videoDisplayRef?: React.RefObject<HTMLVideoElement | null>;
  onGestureActivated?: (gesture: string) => void;
  onAirDraw?: (event: AirDrawEvent) => void;
  calibration?: Partial<CalibrationProfile>;
  autoStart?: boolean;
}

// ── MediaPipe Hand Connections ─────────────────────────────────────────────────
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],          // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],          // index
  [5, 9], [9, 10], [10, 11], [11, 12],     // middle
  [9, 13], [13, 14], [14, 15], [15, 16],   // ring
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20], // pinky + palm
];

// Colors per finger segment for clear visual feedback
const FINGER_COLORS = ["#ef4444", "#f59e0b", "#10b981", "#06B6D4", "#8b5cf6"];
const FINGER_RANGES: [number, number][] = [[0, 4], [5, 8], [9, 12], [13, 16], [17, 20]];

const QUALITY_COLORS: Record<string, string> = {
  EXCELLENT: "#10b981",
  GOOD: "#06B6D4",
  FAIR: "#f59e0b",
  POOR: "#ef4444",
  LOST: "#6b6890",
};

// ── Low-Light Compensation ────────────────────────────────────────────────────

const BRIGHTNESS_SAMPLE_W = 80;
const BRIGHTNESS_SAMPLE_H = 60;

let brightnessCanvas: HTMLCanvasElement | null = null;
let brightnessCtx: CanvasRenderingContext2D | null = null;

function getFrameBrightness(video: HTMLVideoElement): number {
  if (!brightnessCanvas) {
    brightnessCanvas = document.createElement("canvas");
    brightnessCanvas.width = BRIGHTNESS_SAMPLE_W;
    brightnessCanvas.height = BRIGHTNESS_SAMPLE_H;
    brightnessCtx = brightnessCanvas.getContext("2d", { willReadFrequently: true });
  }
  if (!brightnessCtx) return 128;
  brightnessCtx.drawImage(video, 0, 0, BRIGHTNESS_SAMPLE_W, BRIGHTNESS_SAMPLE_H);
  const d = brightnessCtx.getImageData(0, 0, BRIGHTNESS_SAMPLE_W, BRIGHTNESS_SAMPLE_H).data;
  let sum = 0;
  // Sample every 4th pixel for performance
  for (let i = 0; i < d.length; i += 16) {
    sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  }
  return sum / (BRIGHTNESS_SAMPLE_W * BRIGHTNESS_SAMPLE_H / 4);
}

function buildLightFilter(brightness: number): string {
  if (brightness < 40) {
    const boost = Math.min(2.8, 60 / Math.max(brightness, 10));
    return `brightness(${boost.toFixed(2)}) contrast(1.4) saturate(0.9)`;
  }
  if (brightness < 75) {
    const boost = 1 + (75 - brightness) / 100;
    return `brightness(${boost.toFixed(2)}) contrast(1.2)`;
  }
  return "none";
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useGestureTracking({
  canvasRef,
  overlayCanvasRef,
  videoDisplayRef,
  onGestureActivated,
  onAirDraw,
  calibration = {},
  autoStart = false,
}: UseGestureTrackingOptions) {

  const videoRef              = useRef<HTMLVideoElement | null>(null);
  const preprocessCanvasRef   = useRef<HTMLCanvasElement | null>(null);
  const preprocessCtxRef      = useRef<CanvasRenderingContext2D | null>(null);
  const handsRef              = useRef<any>(null);
  const streamRef             = useRef<MediaStream | null>(null);
  const animFrameRef          = useRef<number | null>(null);

  const engineRef             = useRef(new GestureEngine({ ...DEFAULT_CALIBRATION, ...calibration }));
  const analyticsRef          = useRef(new GestureAnalytics());

  // Smoothers
  const landmarkSmootherRef   = useRef(new LandmarkSmoother(21, 1.2, 0.008));
  const airWritingFilterRef   = useRef(new OneEuroFilter2D(30, 2.0, 0.025));
  const motionPredictorRef    = useRef(new MotionPredictor());

  // Air writing state
  const drawingActiveRef      = useRef(false);
  const lastAirPosRef         = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastGestureRef        = useRef<string>("NONE");

  // Low-light
  const lightFilterRef        = useRef<string>("none");
  const lightCheckCountRef    = useRef(0);

  // FPS throttling — target 30fps
  const lastProcessTimeRef    = useRef(0);
  const FRAME_INTERVAL        = 1000 / 30;

  const [state, setState] = useState<GestureTrackingState>({
    isLoading: false,
    isActive: false,
    error: null,
    cameraPermission: "unknown",
    result: null,
    analytics: analyticsRef.current,
    calibration: engineRef.current.getCalibration(),
  });

  // ── Skeleton Overlay ─────────────────────────────────────────────────────────

  const drawSkeleton = useCallback((
    ctx: CanvasRenderingContext2D,
    landmarks: Landmark[],
    result: GestureResult,
  ) => {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!landmarks?.length) return;

    const quality = result.trackingQuality;
    const baseColor = QUALITY_COLORS[quality] ?? "#7C3AED";
    const now = performance.now();

    // ── Draw connections ────────────────────────────────────────────────────
    ctx.lineCap = "round";
    HAND_CONNECTIONS.forEach(([i, j]) => {
      const a = landmarks[i];
      const b = landmarks[j];
      if (!a || !b) return;

      // Color-code connections by finger
      let connColor = baseColor + "88";
      for (let fi = 0; fi < FINGER_RANGES.length; fi++) {
        const [start, end] = FINGER_RANGES[fi];
        if ((i >= start && i <= end) && (j >= start && j <= end)) {
          connColor = FINGER_COLORS[fi] + "66";
          break;
        }
      }

      ctx.strokeStyle = connColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo((1 - a.x) * w, a.y * h);
      ctx.lineTo((1 - b.x) * w, b.y * h);
      ctx.stroke();
    });

    // ── Draw landmark dots ──────────────────────────────────────────────────
    landmarks.forEach((lm, i) => {
      const x = (1 - lm.x) * w;
      const y = lm.y * h;

      // Fingertips are larger
      const isTip = [4, 8, 12, 16, 20].includes(i);
      const isWrist = i === 0;
      const isIndexTip = i === 8;
      const r = isIndexTip ? 8 : isTip ? 5 : isWrist ? 5 : 3;

      // Glow effect for index fingertip when drawing
      if (isIndexTip && result.gesture === "INDEX_FINGER") {
        const pulse = 0.7 + 0.3 * Math.sin(now * 0.012);
        ctx.beginPath();
        ctx.arc(x, y, r + 6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(124,58,237,${0.2 * pulse})`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);

      if (isIndexTip) {
        ctx.fillStyle = result.gesture === "INDEX_FINGER" ? "#a78bfa" : "#7C3AED";
      } else if (isWrist) {
        ctx.fillStyle = "#06B6D4";
      } else {
        // Color by finger
        let color = baseColor;
        for (let fi = 0; fi < FINGER_RANGES.length; fi++) {
          const [start, end] = FINGER_RANGES[fi];
          if (i >= start && i <= end) { color = FINGER_COLORS[fi]; break; }
        }
        ctx.fillStyle = color;
      }
      ctx.fill();
    });

    // ── Hold progress arc at index fingertip ────────────────────────────────
    if (result.holdProgress > 0 && result.gesture !== "NONE") {
      const tip = landmarks[8];
      const tx = (1 - tip.x) * w;
      const ty = tip.y * h;
      const arcR = 18;

      // Background ring
      ctx.beginPath();
      ctx.arc(tx, ty, arcR, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(124,58,237,0.15)";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Progress arc
      ctx.beginPath();
      ctx.arc(tx, ty, arcR, -Math.PI / 2, -Math.PI / 2 + result.holdProgress * Math.PI * 2);
      ctx.strokeStyle = result.holdProgress >= 1 ? "#10b981" : "#7C3AED";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // ── Gesture label ───────────────────────────────────────────────────────
    if (result.gesture !== "NONE") {
      const tip = landmarks[8];
      const lx = (1 - tip.x) * w;
      const ly = tip.y * h - 32;

      const label = result.gesture.replace(/_/g, " ");
      const confPct = result.confidence;

      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      const tw = ctx.measureText(`${label} ${confPct}%`).width;

      // Background pill
      ctx.fillStyle = "rgba(7,7,14,0.88)";
      ctx.beginPath();
      ctx.roundRect(lx - tw / 2 - 8, ly - 15, tw + 16, 22, 6);
      ctx.fill();

      // Text
      ctx.fillStyle = result.isActivated ? "#10b981" : "#a78bfa";
      ctx.textAlign = "center";
      ctx.fillText(`${label} ${confPct}%`, lx, ly);
      ctx.textAlign = "left";
    }

    // ── FPS / latency watermark ──────────────────────────────────────────────
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(107,104,144,0.7)";
    ctx.fillText(`${result.fps} FPS  ${result.latency}ms`, 6, h - 6);

    // ── Predicted indicator ─────────────────────────────────────────────────
    if (result.isPredicted) {
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#f59e0b88";
      ctx.fillText("PREDICTED", w - 80, 14);
    }
  }, []);

  // ── Frame Processor ─────────────────────────────────────────────────────────

  const processFrameRef = useRef<() => void>(null!);

  // We use a ref for processFrame so onResults (which depends on it) is stable
  const onResultsRef = useRef<(results: any) => void>(null!);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const hands = handsRef.current;

    if (!video || !hands) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    if (video.readyState < 2 || video.paused) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // FPS throttle
    const now = performance.now();
    if (now - lastProcessTimeRef.current < FRAME_INTERVAL - 1) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }
    lastProcessTimeRef.current = now;

    // Periodic brightness check (every 45 frames ≈ every 1.5s)
    lightCheckCountRef.current++;
    if (lightCheckCountRef.current % 45 === 1) {
      try {
        const brightness = getFrameBrightness(video);
        lightFilterRef.current = buildLightFilter(brightness);
      } catch {
        lightFilterRef.current = "none";
      }
    }

    // Apply low-light compensation to preprocessing canvas
    const preCanvas = preprocessCanvasRef.current;
    const preCtx    = preprocessCtxRef.current;
    if (preCanvas && preCtx) {
      preCtx.filter = lightFilterRef.current;
      preCtx.drawImage(video, 0, 0, 640, 480);
      preCtx.filter = "none";
      hands.send({ image: preCanvas });
    } else {
      hands.send({ image: video });
    }

    animFrameRef.current = requestAnimationFrame(processFrame);
  }, [FRAME_INTERVAL]);

  // Store ref to stable processFrame for cleanup
  processFrameRef.current = processFrame;

  // ── MediaPipe Results Handler ─────────────────────────────────────────────

  const onResults = useCallback((results: any) => {
    const frameTime = performance.now();

    let rawLandmarks: Landmark[] | null = null;
    let handedness: string | null = null;
    let isPredicted = false;

    if (results.multiHandLandmarks?.length > 0) {
      rawLandmarks = results.multiHandLandmarks[0] as Landmark[];
      handedness = results.multiHandedness?.[0]?.label ?? "Right";
      // Update motion predictor with good frame
      motionPredictorRef.current.update(rawLandmarks, frameTime);
    } else if (motionPredictorRef.current.hasHistory()) {
      // Hand momentarily lost — try motion prediction
      const predicted = motionPredictorRef.current.predict();
      if (predicted) {
        rawLandmarks = predicted as Landmark[];
        handedness = "Right"; // assume dominant hand
        isPredicted = true;
      }
    }

    // Apply One Euro Filter to all 21 landmarks
    const landmarks = rawLandmarks
      ? (landmarkSmootherRef.current.smooth(rawLandmarks, frameTime) as Landmark[])
      : null;

    // Run gesture engine
    const result = engineRef.current.process(landmarks, handedness, frameTime, isPredicted);

    // Analytics
    analyticsRef.current.recordFrame(result.fps, result.latency, result.trackingQuality);
    if (result.gesture !== "NONE") {
      analyticsRef.current.recordGestureEvent({
        gesture: result.gesture,
        timestamp: frameTime,
        confidence: result.confidence,
        activated: result.isActivated,
        duration: result.holdProgress * engineRef.current.getCalibration().holdDuration,
        trackingQuality: result.trackingQuality,
      });
    }

    // Draw skeleton overlay
    const overlayCanvas = overlayCanvasRef.current;
    if (overlayCanvas && landmarks) {
      const ctx = overlayCanvas.getContext("2d");
      if (ctx) drawSkeleton(ctx, landmarks, result);
    } else if (overlayCanvas) {
      const ctx = overlayCanvas.getContext("2d");
      ctx?.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }

    // ── Air Writing (INDEX_FINGER gesture) ───────────────────────────────────
    if (landmarks && canvasRef.current) {
      const canvas = canvasRef.current;

      if (result.gesture === "INDEX_FINGER") {
        const tip = landmarks[8];
        // Mirror x for camera
        const rawX = (1 - tip.x) * canvas.width;
        const rawY = tip.y * canvas.height;

        // Apply One Euro filter for ultra-smooth air writing
        const smoothed = airWritingFilterRef.current.filter(rawX, rawY, frameTime);

        const now = frameTime;
        const lastPos = lastAirPosRef.current;

        if (!drawingActiveRef.current) {
          // Start new stroke
          drawingActiveRef.current = true;
          airWritingFilterRef.current.reset(); // Reset filter to avoid lag from previous position
          const s2 = airWritingFilterRef.current.filter(rawX, rawY, frameTime);
          onAirDraw?.({ x: s2.x, y: s2.y, isDown: true, pressure: 0.7 });
          lastAirPosRef.current = { x: s2.x, y: s2.y, t: now };
        } else if (lastPos) {
          const dx = smoothed.x - lastPos.x;
          const dy = smoothed.y - lastPos.y;
          const moveDist = Math.sqrt(dx * dx + dy * dy);

          // Skip micro-jitter (< 1.5px)
          if (moveDist < 1.5) {
            setState((prev) => ({ ...prev, result }));
            return;
          }

          // Velocity-based pressure (fast = lighter, slow = heavier)
          const dt = now - lastPos.t;
          const velocity = dt > 0 ? moveDist / dt : 0;
          const pressure = Math.max(0.35, Math.min(0.9, 0.8 - velocity * 0.3));

          // Interpolate large gaps (prevents jagged lines when hand moves fast)
          if (moveDist > 12 && moveDist < 80) {
            const steps = Math.ceil(moveDist / 6);
            for (let s = 1; s < steps; s++) {
              const t = s / steps;
              onAirDraw?.({
                x: lastPos.x + dx * t,
                y: lastPos.y + dy * t,
                isDown: true,
                pressure,
              });
            }
          }

          onAirDraw?.({ x: smoothed.x, y: smoothed.y, isDown: true, pressure });
          lastAirPosRef.current = { x: smoothed.x, y: smoothed.y, t: now };
        }
      } else {
        if (drawingActiveRef.current) {
          drawingActiveRef.current = false;
          onAirDraw?.({ x: lastAirPosRef.current?.x ?? 0, y: lastAirPosRef.current?.y ?? 0, isDown: false, pressure: 0 });
          lastAirPosRef.current = null;
          airWritingFilterRef.current.reset();
        }
      }
    } else {
      if (drawingActiveRef.current) {
        drawingActiveRef.current = false;
        onAirDraw?.({ x: 0, y: 0, isDown: false, pressure: 0 });
        lastAirPosRef.current = null;
        airWritingFilterRef.current.reset();
      }
    }

    // ── Gesture change → reset drawing ────────────────────────────────────────
    if (result.gesture !== lastGestureRef.current) {
      if (result.gesture !== "INDEX_FINGER" && drawingActiveRef.current) {
        drawingActiveRef.current = false;
        onAirDraw?.({ x: 0, y: 0, isDown: false, pressure: 0 });
        lastAirPosRef.current = null;
        airWritingFilterRef.current.reset();
      }
      lastGestureRef.current = result.gesture;
    }

    // ── Fire activation callback ─────────────────────────────────────────────
    if (result.isActivated) {
      onGestureActivated?.(result.gesture);
    }

    setState((prev) => ({ ...prev, result }));
  }, [canvasRef, overlayCanvasRef, onGestureActivated, onAirDraw, drawSkeleton]);

  // Store ref for hands.onResults registration
  onResultsRef.current = onResults;

  // ── Start Tracking ───────────────────────────────────────────────────────────

  const start = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // ── WebRTC camera stream ─────────────────────────────────────────────
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
            frameRate: { ideal: 30, max: 60 },
          },
          audio: false,
        });
      } catch {
        // Fallback: minimal constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
      }

      streamRef.current = stream;
      setState((prev) => ({ ...prev, cameraPermission: "granted" }));

      // ── Video element (hidden processing element) ────────────────────────
      let video = videoRef.current;
      if (!video) {
        video = document.createElement("video");
        video.id = "__aircanvas-gesture-video__";
        video.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;pointer-events:none;";
        video.playsInline = true;
        video.muted = true;
        document.body.appendChild(video);
        videoRef.current = video;
      }
      video.srcObject = stream;
      await video.play();

      // ── PiP video element (for recording engine) ─────────────────────────
      let pipVideo = document.getElementById("__aircanvas-pip-video__") as HTMLVideoElement | null;
      if (!pipVideo) {
        pipVideo = document.createElement("video");
        pipVideo.id = "__aircanvas-pip-video__";
        pipVideo.style.cssText = "position:fixed;bottom:-9999px;left:-9999px;width:1px;height:1px;";
        pipVideo.playsInline = true;
        pipVideo.muted = true;
        document.body.appendChild(pipVideo);
      }
      pipVideo.srcObject = stream;
      pipVideo.play().catch(() => {});

      // ── Visible display video (renders live feed in GesturePanel) ────────
      if (videoDisplayRef?.current) {
        videoDisplayRef.current.srcObject = stream;
        videoDisplayRef.current.play().catch(() => {});
      }

      // ── Preprocessing canvas for low-light compensation ──────────────────
      if (!preprocessCanvasRef.current) {
        const pc = document.createElement("canvas");
        pc.width = 640;
        pc.height = 480;
        preprocessCanvasRef.current = pc;
        preprocessCtxRef.current = pc.getContext("2d", { willReadFrequently: false });
      }

      // ── Load MediaPipe Hands ─────────────────────────────────────────────
      const HandsClass = await loadMediaPipeHands();
      if (!HandsClass) throw new Error("MediaPipe failed to load. Check your internet connection.");

      const hands = new HandsClass({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.55,
        minTrackingConfidence: 0.5,
      });

      // Use ref wrapper so onResults always calls the latest version
      hands.onResults((r: any) => onResultsRef.current(r));
      handsRef.current = hands;

      // Size overlay canvas
      const overlayCanvas = overlayCanvasRef.current;
      if (overlayCanvas) {
        overlayCanvas.width = 640;
        overlayCanvas.height = 480;
      }

      // Reset all state
      landmarkSmootherRef.current.reset();
      airWritingFilterRef.current.reset();
      motionPredictorRef.current.reset();
      engineRef.current.reset();
      analyticsRef.current.reset();
      drawingActiveRef.current = false;
      lastAirPosRef.current = null;
      lastGestureRef.current = "NONE";
      lastProcessTimeRef.current = 0;
      lightCheckCountRef.current = 0;
      lightFilterRef.current = "none";

      setState((prev) => ({
        ...prev,
        isLoading: false,
        isActive: true,
        error: null,
      }));

      animFrameRef.current = requestAnimationFrame(processFrame);

    } catch (err: any) {
      const isDenied = err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isActive: false,
        error: isDenied
          ? "Camera access denied. Please allow camera access in your browser settings and try again."
          : err?.message ?? "Failed to start gesture tracking.",
        cameraPermission: isDenied ? "denied" : "unknown",
      }));
    }
  }, [processFrame, overlayCanvasRef]);

  // ── Stop Tracking ────────────────────────────────────────────────────────────

  const stop = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    handsRef.current?.close?.();
    handsRef.current = null;

    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
      video.remove();
      videoRef.current = null;
    }

    // Clear display video
    if (videoDisplayRef?.current) {
      videoDisplayRef.current.srcObject = null;
    }

    drawingActiveRef.current = false;
    lastAirPosRef.current = null;
    airWritingFilterRef.current.reset();
    landmarkSmootherRef.current.reset();
    motionPredictorRef.current.reset();

    setState((prev) => ({ ...prev, isActive: false, result: null }));
  }, []);

  // ── Update Calibration ───────────────────────────────────────────────────────

  const updateCalibration = useCallback((profile: Partial<CalibrationProfile>) => {
    engineRef.current.updateCalibration(profile);
    setState((prev) => ({ ...prev, calibration: engineRef.current.getCalibration() }));
  }, []);

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (autoStart) start();
    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    };
  }, [autoStart, start]);

  return {
    start,
    stop,
    updateCalibration,
    videoRef,
    state,
    analytics: analyticsRef.current,
    getStats:    () => analyticsRef.current.getSessionStats(),
    getHistory:  () => analyticsRef.current.getRecentHistory(20),
    getUsageMap: () => analyticsRef.current.getUsageMap(),
  };
}

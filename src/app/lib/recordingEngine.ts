/**
 * Lecture Recording Engine
 *
 * Records the whiteboard canvas + optional webcam overlay + microphone audio.
 * Uses MediaRecorder API with composited canvas frames for high-quality output.
 *
 * Output formats: WebM (native) → can be downloaded directly.
 * PDF/DOCX export: handled separately via notes generation.
 */

export type RecordingState = "idle" | "recording" | "paused" | "stopped";

export interface RecordingOptions {
  fps?: number;
  includeAudio?: boolean;
  includeCamera?: boolean;
  quality?: "low" | "medium" | "high";
  canvasRef?: HTMLCanvasElement;
  cameraStream?: MediaStream;
}

export interface RecordingStats {
  duration: number;      // seconds
  fileSize: number;      // bytes
  frameCount: number;
  format: string;
}

const QUALITY_MAP = {
  low: 1_000_000,
  medium: 2_500_000,
  high: 5_000_000,
};

export class RecordingEngine {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private compositeCanvas: HTMLCanvasElement | null = null;
  private animFrameId: number | null = null;
  private startTime = 0;
  private pauseOffset = 0;
  private pauseStart = 0;
  private frameCount = 0;
  private state: RecordingState = "idle";
  private onStateChange?: (state: RecordingState) => void;
  private onDurationUpdate?: (seconds: number) => void;
  private durationInterval?: ReturnType<typeof setInterval>;
  private options: RecordingOptions = {};

  constructor(
    onStateChange?: (state: RecordingState) => void,
    onDurationUpdate?: (seconds: number) => void
  ) {
    this.onStateChange = onStateChange;
    this.onDurationUpdate = onDurationUpdate;
  }

  async start(options: RecordingOptions): Promise<void> {
    this.options = options;
    const { fps = 30, includeAudio = true, quality = "medium", canvasRef } = options;

    if (!canvasRef) throw new Error("Canvas ref required for recording");

    // Create composite canvas (same size as drawing canvas)
    this.compositeCanvas = document.createElement("canvas");
    this.compositeCanvas.width = canvasRef.width;
    this.compositeCanvas.height = canvasRef.height;

    const compositeCtx = this.compositeCanvas.getContext("2d")!;

    // Start composite frame loop
    const drawFrame = () => {
      compositeCtx.clearRect(0, 0, this.compositeCanvas!.width, this.compositeCanvas!.height);

      // Draw main whiteboard canvas
      compositeCtx.drawImage(canvasRef, 0, 0);

      // Draw camera overlay (PiP) if provided
      if (options.cameraStream && options.includeCamera) {
        // Camera PiP is drawn via VideoElement
        const vid = document.getElementById("__aircanvas-pip-video__") as HTMLVideoElement;
        if (vid && vid.readyState >= 2) {
          const pipW = this.compositeCanvas!.width * 0.2;
          const pipH = pipW * 0.75;
          compositeCtx.save();
          compositeCtx.beginPath();
          compositeCtx.roundRect(16, 16, pipW, pipH, 8);
          compositeCtx.clip();
          compositeCtx.drawImage(vid, 16, 16, pipW, pipH);
          compositeCtx.restore();
          compositeCtx.strokeStyle = "rgba(124,58,237,0.8)";
          compositeCtx.lineWidth = 2;
          compositeCtx.roundRect(16, 16, pipW, pipH, 8);
          compositeCtx.stroke();
        }
      }

      // Timestamp overlay
      const elapsed = this.getElapsed();
      const mins = Math.floor(elapsed / 60).toString().padStart(2, "0");
      const secs = Math.floor(elapsed % 60).toString().padStart(2, "0");
      compositeCtx.fillStyle = "rgba(0,0,0,0.4)";
      compositeCtx.fillRect(compositeCtx.canvas.width - 90, 12, 78, 28);
      compositeCtx.fillStyle = "#ef4444";
      compositeCtx.font = "14px 'JetBrains Mono', monospace";
      compositeCtx.fillText(`● ${mins}:${secs}`, compositeCtx.canvas.width - 82, 31);

      this.frameCount++;
      if (this.state === "recording") {
        this.animFrameId = requestAnimationFrame(drawFrame);
      }
    };

    // Set up audio stream
    let audioStream: MediaStream | undefined;
    if (includeAudio) {
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch {
        console.warn("RecordingEngine: Microphone not available");
      }
    }

    // Capture stream from composite canvas
    const canvasStream = this.compositeCanvas.captureStream(fps);

    // Merge streams
    const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
    if (audioStream) tracks.push(...audioStream.getAudioTracks());
    const finalStream = new MediaStream(tracks);

    // Configure MediaRecorder
    const mimeType = this.getSupportedMimeType();
    const recorderOptions: MediaRecorderOptions = {
      mimeType,
      videoBitsPerSecond: QUALITY_MAP[quality],
    };

    this.mediaRecorder = new MediaRecorder(finalStream, recorderOptions);
    this.chunks = [];

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.mediaRecorder.start(1000); // 1s timeslices for lower memory usage
    this.startTime = performance.now();
    this.frameCount = 0;
    this.state = "recording";
    this.onStateChange?.("recording");

    this.durationInterval = setInterval(() => {
      this.onDurationUpdate?.(Math.floor(this.getElapsed()));
    }, 1000);

    drawFrame();
  }

  pause() {
    if (this.state !== "recording" || !this.mediaRecorder) return;
    this.mediaRecorder.pause();
    this.pauseStart = performance.now();
    this.state = "paused";
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.onStateChange?.("paused");
  }

  resume() {
    if (this.state !== "paused" || !this.mediaRecorder) return;
    this.pauseOffset += performance.now() - this.pauseStart;
    this.mediaRecorder.resume();
    this.state = "recording";
    this.onStateChange?.("recording");
  }

  async stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("No active recording"));
        return;
      }

      if (this.animFrameId !== null) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }

      clearInterval(this.durationInterval);

      this.mediaRecorder.onstop = () => {
        const mimeType = this.getSupportedMimeType();
        const blob = new Blob(this.chunks, { type: mimeType });
        this.state = "stopped";
        this.onStateChange?.("stopped");
        resolve(blob);
      };

      this.mediaRecorder.stop();
      // Stop all tracks
      this.mediaRecorder.stream.getTracks().forEach((t) => t.stop());
    });
  }

  async stopAndDownload(filename = "aircanvas-lecture"): Promise<RecordingStats> {
    const blob = await this.stop();
    const ext = blob.type.includes("webm") ? "webm" : "mp4";
    this.downloadBlob(blob, `${filename}.${ext}`);
    return {
      duration: this.getElapsed(),
      fileSize: blob.size,
      frameCount: this.frameCount,
      format: blob.type,
    };
  }

  downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  getState(): RecordingState { return this.state; }

  getElapsed(): number {
    if (this.state === "idle") return 0;
    const now = performance.now();
    return (now - this.startTime - this.pauseOffset) / 1000;
  }

  getStats(): RecordingStats {
    const totalSize = this.chunks.reduce((s, c) => s + c.size, 0);
    return {
      duration: this.getElapsed(),
      fileSize: totalSize,
      frameCount: this.frameCount,
      format: this.getSupportedMimeType(),
    };
  }

  private getSupportedMimeType(): string {
    const types = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];
    return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "video/webm";
  }
}

// ── PDF/Text Export Helpers ─────────────────────────────────────────────────────

export function exportNotesAsText(notes: string, filename = "lecture-notes.txt") {
  const blob = new Blob([notes], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAsJSON(data: object, filename = "aircanvas-export.json") {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCanvasAsImage(canvas: HTMLCanvasElement, filename = "whiteboard.png") {
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

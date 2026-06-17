/**
 * GesturePanel — Floating gesture control panel for AirCanvas-Pro.
 *
 * Renders as a non-intrusive overlay panel. Provides:
 *   - Live camera feed with hand skeleton overlay
 *   - Real-time diagnostics (gesture, confidence, FPS, latency, quality)
 *   - Gesture reference card
 *   - Calibration sub-panel
 *   - Gesture history log
 *   - Analytics summary
 *
 * Does NOT modify any existing UI elements.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  X, Hand, Camera, CameraOff, Settings2, BarChart2, Activity,
  ChevronDown, ChevronUp, AlertCircle, CheckCircle, Loader2,
  Sliders, History, Info, Zap, Wifi, WifiOff, RefreshCw,
} from "lucide-react";
import { useGestureTracking, type AirDrawEvent } from "../hooks/useGestureTracking";
import { GestureCalibration } from "./GestureCalibration";
import type { CalibrationProfile } from "../lib/gestureEngine";

// ── Gesture Reference ──────────────────────────────────────────────────────────

const GESTURE_GUIDE = [
  { gesture: "☝️", name: "Index Finger", action: "Air Draw / Write",    color: "#7C3AED" },
  { gesture: "🤚", name: "Open Palm",    action: "Pause Drawing",       color: "#06B6D4" },
  { gesture: "🤚", name: "Palm Hold",    action: "Open AI Assistant",   color: "#8b5cf6" },
  { gesture: "✊", name: "Closed Fist",  action: "Stop Drawing",        color: "#ef4444" },
  { gesture: "👍", name: "Thumbs Up",   action: "Save Board",           color: "#10b981" },
  { gesture: "🤟", name: "3 Fingers",   action: "Undo",                 color: "#f59e0b" },
  { gesture: "🖖", name: "4 Fingers",   action: "Redo",                 color: "#ec4899" },
  { gesture: "🤏", name: "Pinch",       action: "Select",               color: "#8b5cf6" },
  { gesture: "👈", name: "Swipe Left",  action: "Prev Slide",           color: "#3b82f6" },
  { gesture: "👉", name: "Swipe Right", action: "Next Slide",           color: "#06B6D4" },
];

const QUALITY_COLORS: Record<string, string> = {
  EXCELLENT: "#10b981",
  GOOD: "#06B6D4",
  FAIR: "#f59e0b",
  POOR: "#ef4444",
  LOST: "#6b6890",
};

interface GesturePanelProps {
  onClose: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onGestureActivated: (gesture: string) => void;
  onAirDraw: (event: AirDrawEvent) => void;
}

export function GesturePanel({
  onClose,
  canvasRef,
  onGestureActivated,
  onAirDraw,
}: GesturePanelProps) {
  const overlayCanvasRef  = useRef<HTMLCanvasElement>(null);
  const videoDisplayRef   = useRef<HTMLVideoElement>(null);
  const [tab, setTab] = useState<"live" | "guide" | "calibrate" | "analytics">("live");
  const [isMinimized, setIsMinimized] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(true);

  const {
    start, stop, restart, switchCamera, updateCalibration,
    state, analytics, getHistory, getUsageMap,
  } = useGestureTracking({
    canvasRef,
    overlayCanvasRef: overlayCanvasRef as any,
    videoDisplayRef: videoDisplayRef as any,
    onGestureActivated,
    onAirDraw,
  });

  const result = state.result;
  const quality = result?.trackingQuality ?? "LOST";
  const qualityColor = QUALITY_COLORS[quality];

  // Stream health color
  const healthColors: Record<string, string> = {
    healthy: "#10b981",
    stalled: "#f59e0b",
    disconnected: "#ef4444",
    unknown: "#6b6890",
  };
  const healthColor = healthColors[state.streamHealth ?? "unknown"];

  const handleCalibrationSave = useCallback((profile: Partial<CalibrationProfile>) => {
    updateCalibration(profile);
  }, [updateCalibration]);

  return (
    <div
      className="fixed z-50 flex flex-col"
      style={{
        bottom: "80px",
        right: "16px",
        width: isMinimized ? "220px" : "320px",
        background: "#0b0b18",
        border: "1px solid rgba(124,58,237,0.25)",
        borderRadius: "16px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.1)",
        maxHeight: isMinimized ? "52px" : "90vh",
        overflow: "hidden",
        transition: "all 0.2s ease",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-3 shrink-0"
        style={{ borderBottom: isMinimized ? "none" : "1px solid rgba(124,58,237,0.1)" }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: state.isActive ? "rgba(16,185,129,0.2)" : "rgba(124,58,237,0.15)" }}
        >
          <Hand size={14} style={{ color: state.isActive ? "#10b981" : "#a78bfa" }} />
        </div>
        <span style={{ fontFamily: "var(--font-family-display)", fontWeight: 600, color: "#f0eefc", fontSize: "0.85rem", flex: 1 }}>
          Gesture Control
        </span>

        {state.isActive && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#10b981" }}>LIVE</span>
          </div>
        )}

        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/5 transition-colors"
          style={{ color: "#6b6890" }}
        >
          {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/5 transition-colors"
          style={{ color: "#6b6890" }}
        >
          <X size={14} />
        </button>
      </div>

      {!isMinimized && (
        <div className="flex flex-col overflow-y-auto" style={{ scrollbarWidth: "none", flex: 1 }}>
          {/* Start/Stop + Camera selector */}
          {!state.isActive && (
            <div className="p-4 space-y-3">
              {/* Error banner */}
              {state.error && (
                <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p style={{ fontFamily: "var(--font-family-body)", color: "#fca5a5", fontSize: "0.75rem", lineHeight: 1.5 }}>{state.error}</p>
                    {state.cameraPermission === "denied" && (
                      <p style={{ fontFamily: "var(--font-family-mono)", color: "#f87171", fontSize: "0.65rem", marginTop: "4px" }}>
                        Click the 🔒 icon in your browser address bar → allow camera
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Camera selector (shown when cameras are available) */}
              {state.cameras.length > 1 && (
                <div>
                  <p style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#6b6890", marginBottom: "6px" }}>SELECT CAMERA</p>
                  <select
                    value={state.selectedCameraId ?? ""}
                    onChange={(e) => switchCamera(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{
                      background: "#141425",
                      border: "1px solid rgba(124,58,237,0.2)",
                      color: "#f0eefc",
                      fontFamily: "var(--font-family-body)",
                    }}
                  >
                    {state.cameras.map((cam) => (
                      <option key={cam.deviceId} value={cam.deviceId}>{cam.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Start button */}
              <button
                onClick={start}
                disabled={state.isLoading}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #7C3AED, #5b21b6)", color: "white", fontFamily: "var(--font-family-display)" }}
              >
                {state.isLoading
                  ? <><Loader2 size={15} className="animate-spin" /> Initializing camera…</>
                  : <><Camera size={15} /> Start Gesture Control</>
                }
              </button>

              <p className="text-center" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#4a4a6a" }}>
                Requires camera permission · Works in Chrome, Edge, Firefox
              </p>
            </div>
          )}

          {state.isActive && (
            <>
              {/* Tabs */}
              <div className="flex border-b px-2 pt-1" style={{ borderColor: "rgba(124,58,237,0.1)" }}>
                {(["live", "guide", "calibrate", "analytics"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className="px-3 py-2 text-xs font-medium transition-colors capitalize"
                    style={{
                      fontFamily: "var(--font-family-display)",
                      color: tab === t ? "#a78bfa" : "#6b6890",
                      borderBottom: tab === t ? "2px solid #7C3AED" : "2px solid transparent",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Live Tab */}
              {tab === "live" && (
                <div className="p-3 space-y-3">
                  {/* Camera + Skeleton */}
                  <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "4/3", background: "#07070e", border: "1px solid rgba(124,58,237,0.15)" }}>
                    {/* Live camera feed — mirrored so user sees natural reflection */}
                    <video
                      ref={videoDisplayRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full"
                      style={{ objectFit: "cover", transform: "scaleX(-1)" }}
                    />
                    {/* Fallback when camera not yet active */}
                    {!state.isActive && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <Camera size={24} style={{ color: "rgba(124,58,237,0.3)", margin: "0 auto 8px" }} />
                          <p style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", color: "#4a4a6a" }}>Camera Preview</p>
                        </div>
                      </div>
                    )}
                    {/*
                      Skeleton overlay canvas — NO CSS mirror here.
                      drawSkeleton already draws at (1 - x) to mirror landmarks,
                      so this canvas aligns correctly with the CSS-mirrored video above.
                    */}
                    <canvas
                      ref={overlayCanvasRef}
                      className="absolute inset-0 w-full h-full"
                    />
                    {/* Tracking quality badge */}
                    <div
                      className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg"
                      style={{ background: "rgba(7,7,14,0.8)", backdropFilter: "blur(4px)" }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ background: qualityColor }} />
                      <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: qualityColor }}>
                        {quality}
                      </span>
                    </div>
                    {/* FPS badge */}
                    <div
                      className="absolute top-2 right-2 px-2 py-1 rounded-lg"
                      style={{ background: "rgba(7,7,14,0.8)", backdropFilter: "blur(4px)" }}
                    >
                      <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#6b6890" }}>
                        {result?.fps ?? 0} FPS · {result?.latency ?? 0}ms
                      </span>
                    </div>
                  </div>

                  {/* Current Gesture */}
                  <div
                    className="p-3 rounded-xl"
                    style={{ background: "#141425", border: "1px solid rgba(124,58,237,0.1)" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", color: "#6b6890" }}>DETECTED GESTURE</span>
                      <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", color: "#6b6890" }}>
                        {result?.handedness ?? "--"} hand
                      </span>
                    </div>
                    <div className="flex items-end justify-between">
                      <span style={{
                        fontFamily: "var(--font-family-display)",
                        fontWeight: 700,
                        fontSize: "1.1rem",
                        color: result?.gesture !== "NONE" ? "#a78bfa" : "#4a4a6a",
                      }}>
                        {result?.gesture?.replace(/_/g, " ") ?? "NONE"}
                      </span>
                      <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.8rem", color: "#06B6D4" }}>
                        {result?.confidence ?? 0}%
                      </span>
                    </div>

                    {/* Confidence bar */}
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(124,58,237,0.15)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-100"
                        style={{
                          width: `${result?.confidence ?? 0}%`,
                          background: `linear-gradient(90deg, #7C3AED, #06B6D4)`,
                        }}
                      />
                    </div>

                    {/* Hold progress */}
                    {(result?.holdProgress ?? 0) > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between mb-1">
                          <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#6b6890" }}>HOLD PROGRESS</span>
                          <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#f59e0b" }}>
                            {Math.round((result?.holdProgress ?? 0) * 100)}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(245,158,11,0.15)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-50"
                            style={{ width: `${(result?.holdProgress ?? 0) * 100}%`, background: "#f59e0b" }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Metrics row */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "STABILITY", value: `${result?.stability ?? 0}%`, color: "#10b981" },
                      { label: "FPS", value: `${result?.fps ?? 0}`, color: "#06B6D4" },
                      { label: "LATENCY", value: `${result?.latency ?? 0}ms`, color: "#f59e0b" },
                    ].map((m) => (
                      <div key={m.label} className="p-2 rounded-lg text-center" style={{ background: "#141425" }}>
                        <div style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#6b6890" }}>{m.label}</div>
                        <div style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "0.95rem", color: m.color }}>{m.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Recent gesture history */}
                  <div>
                    <p style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#6b6890", marginBottom: "6px" }}>
                      RECENT ACTIVATIONS
                    </p>
                    <div className="space-y-1">
                      {getHistory().slice(0, 5).map((h, i) => (
                        <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "#141425" }}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: h.activated ? "#10b981" : "#4a4a6a" }} />
                          <span style={{ fontFamily: "var(--font-family-display)", fontSize: "0.75rem", color: "#c4bff5", flex: 1 }}>
                            {h.gesture.replace(/_/g, " ")}
                          </span>
                          <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#6b6890" }}>
                            {h.confidence}%
                          </span>
                        </div>
                      ))}
                      {getHistory().length === 0 && (
                        <p style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", color: "#4a4a6a", textAlign: "center", padding: "8px" }}>
                          No activations yet
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stream health indicator */}
                  {state.streamHealth !== "unknown" && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl"
                      style={{ background: "#141425", border: "1px solid rgba(124,58,237,0.08)" }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: healthColor }} />
                        <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: healthColor }}>
                          STREAM {state.streamHealth.toUpperCase()}
                        </span>
                      </div>
                      {(state.streamHealth === "stalled" || state.streamHealth === "disconnected") && (
                        <button onClick={restart}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all hover:opacity-80"
                          style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa", fontFamily: "var(--font-family-display)" }}>
                          <RefreshCw size={11} /> Reconnect
                        </button>
                      )}
                    </div>
                  )}

                  {/* Camera selector (when multiple available) */}
                  {state.cameras.length > 1 && (
                    <div>
                      <p style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#6b6890", marginBottom: "4px" }}>CAMERA</p>
                      <select
                        value={state.selectedCameraId ?? ""}
                        onChange={(e) => switchCamera(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
                        style={{ background: "#141425", border: "1px solid rgba(124,58,237,0.15)", color: "#f0eefc", fontFamily: "var(--font-family-body)" }}
                      >
                        {state.cameras.map((cam) => (
                          <option key={cam.deviceId} value={cam.deviceId}>{cam.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Stop button */}
                  <button
                    onClick={stop}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-80"
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", fontFamily: "var(--font-family-display)" }}
                  >
                    <CameraOff size={14} /> Stop Tracking
                  </button>
                </div>
              )}

              {/* Guide Tab */}
              {tab === "guide" && (
                <div className="p-3 space-y-1.5">
                  <p className="pb-1" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#6b6890" }}>
                    GESTURE REFERENCE — Hold 0.8–1.2s to activate
                  </p>
                  {GESTURE_GUIDE.map((g) => (
                    <div
                      key={g.name}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: "#141425", border: "1px solid rgba(124,58,237,0.06)" }}
                    >
                      <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>{g.gesture}</span>
                      <div className="flex-1">
                        <div style={{ fontFamily: "var(--font-family-display)", fontWeight: 600, color: "#f0eefc", fontSize: "0.8rem" }}>{g.name}</div>
                        <div style={{ fontFamily: "var(--font-family-body)", color: "#6b6890", fontSize: "0.7rem" }}>{g.action}</div>
                      </div>
                      <div className="w-2 h-2 rounded-full" style={{ background: g.color }} />
                    </div>
                  ))}
                  <div className="p-3 rounded-xl mt-2" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)" }}>
                    <p style={{ fontFamily: "var(--font-family-body)", color: "#a0a0b8", fontSize: "0.75rem", lineHeight: 1.6 }}>
                      💡 Tip: Keep your hand 40–60 cm from the camera in good lighting. Use ☝️ Index Finger to draw. Gestures must be held stable for 0.9s before activating — this prevents accidental triggers.
                    </p>
                  </div>
                </div>
              )}

              {/* Calibrate Tab */}
              {tab === "calibrate" && (
                <GestureCalibration
                  currentCalibration={state.calibration}
                  onSave={handleCalibrationSave}
                />
              )}

              {/* Analytics Tab */}
              {tab === "analytics" && (
                <div className="p-3 space-y-3">
                  <p style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#6b6890" }}>SESSION ANALYTICS</p>

                  {(() => {
                    const stats = analytics.getSessionStats();
                    const usageMap = getUsageMap();
                    return (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: "Accuracy", value: `${stats.gestureAccuracy}%`, color: "#10b981" },
                            { label: "Stability", value: `${analytics.getTrackingStability()}%`, color: "#06B6D4" },
                            { label: "Air Strokes", value: `${stats.airWritingStrokes}`, color: "#7C3AED" },
                            { label: "Activations", value: `${stats.gestureEvents.filter(e => e.activated).length}`, color: "#f59e0b" },
                          ].map((s) => (
                            <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: "#141425" }}>
                              <div style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "1.2rem", color: s.color }}>{s.value}</div>
                              <div style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#6b6890" }}>{s.label}</div>
                            </div>
                          ))}
                        </div>

                        <div>
                          <p className="mb-2" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#6b6890" }}>GESTURE USAGE</p>
                          {Object.entries(usageMap).slice(0, 5).map(([gesture, data]) => (
                            <div key={gesture} className="flex items-center gap-2 mb-1.5">
                              <span style={{ fontFamily: "var(--font-family-display)", fontSize: "0.75rem", color: "#c4bff5", width: "100px" }}>
                                {gesture.replace(/_/g, " ")}
                              </span>
                              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(124,58,237,0.1)" }}>
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${data.successRate}%`, background: "#7C3AED" }}
                                />
                              </div>
                              <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#6b6890" }}>
                                {data.count}×
                              </span>
                            </div>
                          ))}
                          {Object.keys(usageMap).length === 0 && (
                            <p style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", color: "#4a4a6a", textAlign: "center", padding: "12px" }}>
                              Use gestures to see analytics
                            </p>
                          )}
                        </div>

                        <div className="p-3 rounded-xl" style={{ background: "#141425" }}>
                          <div className="flex justify-between mb-1">
                            <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#6b6890" }}>AVG CONFIDENCE</span>
                            <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#06B6D4" }}>{stats.avgConfidence}%</span>
                          </div>
                          <div className="flex justify-between mb-1">
                            <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#6b6890" }}>AVG FPS</span>
                            <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#10b981" }}>{stats.avgFps}</span>
                          </div>
                          <div className="flex justify-between">
                            <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#6b6890" }}>AVG LATENCY</span>
                            <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#f59e0b" }}>{stats.avgLatency}ms</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

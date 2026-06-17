/**
 * VideoNavigationPanel — AI Gesture-Controlled Video Player
 *
 * When this panel is open, gesture activations from the whiteboard are routed
 * here instead of firing whiteboard actions. The user can watch/control
 * educational videos entirely by gesture.
 *
 * Gesture Map (Video Mode):
 *   OPEN_PALM     → Play / Pause
 *   SWIPE_RIGHT   → Forward 10 seconds
 *   SWIPE_LEFT    → Backward 10 seconds
 *   FOUR_FINGER   → Forward 30 seconds
 *   THREE_FINGER  → Backward 30 seconds
 *   THUMBS_UP     → Volume Up
 *   CLOSED_FIST   → Volume Down
 *   PINCH         → Speed +0.25×
 *   PINCH_HOLD    → Speed −0.25×
 *   PALM_HOLD     → Toggle Fullscreen
 *   INDEX_FINGER  → Show / hide controls
 *
 * Exposed via forwardRef so WhiteboardApp can call handleGesture() directly.
 */

import {
  forwardRef, useImperativeHandle, useRef, useState, useEffect, useCallback,
} from "react";
import {
  X, Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipForward, SkipBack, RefreshCw, Upload, Link as LinkIcon,
  Hand, Tv2, ChevronRight, Zap, Info,
  FastForward, Rewind,
} from "lucide-react";
import { toast } from "sonner";

// ── Gesture → Video Action map ─────────────────────────────────────────────────

const GESTURE_ACTIONS: Record<string, { label: string; icon: string; color: string }> = {
  OPEN_PALM:    { label: "Play / Pause",       icon: "▶⏸",  color: "#06B6D4" },
  SWIPE_RIGHT:  { label: "Forward 10s",        icon: "▶▶",  color: "#10b981" },
  SWIPE_LEFT:   { label: "Backward 10s",       icon: "◀◀",  color: "#f59e0b" },
  FOUR_FINGER:  { label: "Forward 30s",        icon: "▶▶▶", color: "#10b981" },
  THREE_FINGER: { label: "Backward 30s",       icon: "◀◀◀", color: "#f59e0b" },
  THUMBS_UP:    { label: "Volume Up",          icon: "🔊",  color: "#a78bfa" },
  CLOSED_FIST:  { label: "Volume Down",        icon: "🔉",  color: "#8b5cf6" },
  PINCH:        { label: "Speed +0.25×",       icon: "⚡",  color: "#ec4899" },
  PINCH_HOLD:   { label: "Speed −0.25×",       icon: "🐢",  color: "#ef4444" },
  PALM_HOLD:    { label: "Toggle Fullscreen",  icon: "⛶",  color: "#7C3AED" },
  INDEX_FINGER: { label: "Toggle Controls",    icon: "☝️",  color: "#06B6D4" },
};

const GESTURE_GUIDE_ROWS = Object.entries(GESTURE_ACTIONS);

// ── Helpers ────────────────────────────────────────────────────────────────────

function isYouTubeUrl(url: string) {
  return /youtube\.com|youtu\.be/.test(url);
}

function getYouTubeEmbedUrl(url: string) {
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  const embedMatch = url.match(/embed\/([a-zA-Z0-9_-]{11})/);
  const id = watchMatch?.[1] ?? shortMatch?.[1] ?? embedMatch?.[1];
  return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=0&rel=0&modestbranding=1` : null;
}

function formatTime(s: number): string {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

// ── Exported ref type ──────────────────────────────────────────────────────────

export interface VideoNavRef {
  handleGesture: (gesture: string) => void;
}

interface VideoNavigationPanelProps {
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export const VideoNavigationPanel = forwardRef<VideoNavRef, VideoNavigationPanelProps>(
  function VideoNavigationPanel({ onClose }, ref) {
    const videoRef      = useRef<HTMLVideoElement>(null);
    const containerRef  = useRef<HTMLDivElement>(null);
    const iframeRef     = useRef<HTMLIFrameElement>(null);
    const fileInputRef  = useRef<HTMLInputElement>(null);

    const [tab, setTab]                   = useState<"player" | "map">("player");
    const [urlInput, setUrlInput]         = useState("");
    const [videoSrc, setVideoSrc]         = useState<string | null>(null);
    const [embedSrc, setEmbedSrc]         = useState<string | null>(null);
    const [isPlaying, setIsPlaying]       = useState(false);
    const [volume, setVolume]             = useState(1);
    const [isMuted, setIsMuted]           = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [currentTime, setCurrentTime]   = useState(0);
    const [duration, setDuration]         = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [lastGestureAction, setLastGestureAction] = useState<string | null>(null);
    const [gestureFlash, setGestureFlash] = useState<string | null>(null);

    // Auto-hide controls overlay on video
    const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Gesture action flash ─────────────────────────────────────────────────

    const showFlash = useCallback((message: string) => {
      setGestureFlash(message);
      setLastGestureAction(message);
      setTimeout(() => setGestureFlash(null), 1800);
    }, []);

    // ── Video control helpers ────────────────────────────────────────────────

    const togglePlay = useCallback(() => {
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) { v.play(); showFlash("▶ Play"); }
      else          { v.pause(); showFlash("⏸ Pause"); }
    }, [showFlash]);

    const seek = useCallback((delta: number) => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
      showFlash(delta > 0 ? `▶▶ +${delta}s` : `◀◀ ${delta}s`);
    }, [showFlash]);

    const changeVolume = useCallback((delta: number) => {
      const v = videoRef.current;
      if (!v) return;
      const newVol = Math.max(0, Math.min(1, v.volume + delta));
      v.volume = newVol;
      setVolume(newVol);
      showFlash(delta > 0 ? `🔊 Vol ${Math.round(newVol * 100)}%` : `🔉 Vol ${Math.round(newVol * 100)}%`);
    }, [showFlash]);

    const changeSpeed = useCallback((delta: number) => {
      const v = videoRef.current;
      if (!v) return;
      const newRate = Math.max(0.25, Math.min(3, parseFloat((v.playbackRate + delta).toFixed(2))));
      v.playbackRate = newRate;
      setPlaybackRate(newRate);
      showFlash(`⚡ ${newRate}×`);
    }, [showFlash]);

    const toggleFullscreen = useCallback(() => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
        showFlash("⛶ Exit Fullscreen");
      } else {
        containerRef.current?.requestFullscreen?.();
        showFlash("⛶ Fullscreen");
      }
    }, [showFlash]);

    const toggleControls = useCallback(() => {
      setShowControls((v) => !v);
    }, []);

    // ── Expose imperative handle ─────────────────────────────────────────────

    useImperativeHandle(ref, () => ({
      handleGesture: (gesture: string) => {
        const info = GESTURE_ACTIONS[gesture];
        if (info) toast.success(`🎬 ${info.label}`, { duration: 1500 });

        switch (gesture) {
          case "OPEN_PALM":    togglePlay();          break;
          case "SWIPE_RIGHT":  seek(10);              break;
          case "SWIPE_LEFT":   seek(-10);             break;
          case "FOUR_FINGER":  seek(30);              break;
          case "THREE_FINGER": seek(-30);             break;
          case "THUMBS_UP":    changeVolume(0.1);     break;
          case "CLOSED_FIST":  changeVolume(-0.1);    break;
          case "PINCH":        changeSpeed(0.25);     break;
          case "PINCH_HOLD":   changeSpeed(-0.25);    break;
          case "PALM_HOLD":    toggleFullscreen();    break;
          case "INDEX_FINGER": toggleControls();      break;
        }
      },
    }), [togglePlay, seek, changeVolume, changeSpeed, toggleFullscreen, toggleControls]);

    // ── Video event listeners ─────────────────────────────────────────────────

    useEffect(() => {
      const v = videoRef.current;
      if (!v) return;
      const onPlay    = () => setIsPlaying(true);
      const onPause   = () => setIsPlaying(false);
      const onTime    = () => setCurrentTime(v.currentTime);
      const onMeta    = () => { setDuration(v.duration); setCurrentTime(0); };
      const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);

      v.addEventListener("play",  onPlay);
      v.addEventListener("pause", onPause);
      v.addEventListener("timeupdate", onTime);
      v.addEventListener("loadedmetadata", onMeta);
      document.addEventListener("fullscreenchange", onFullscreenChange);

      return () => {
        v.removeEventListener("play",  onPlay);
        v.removeEventListener("pause", onPause);
        v.removeEventListener("timeupdate", onTime);
        v.removeEventListener("loadedmetadata", onMeta);
        document.removeEventListener("fullscreenchange", onFullscreenChange);
      };
    }, [videoSrc]);

    // ── URL / file loading ────────────────────────────────────────────────────

    const handleLoadUrl = () => {
      const url = urlInput.trim();
      if (!url) return;
      if (isYouTubeUrl(url)) {
        const embed = getYouTubeEmbedUrl(url);
        if (embed) {
          setEmbedSrc(embed);
          setVideoSrc(null);
          toast.success("YouTube video loaded");
        } else {
          toast.error("Could not parse YouTube URL");
        }
      } else {
        setVideoSrc(url);
        setEmbedSrc(null);
        toast.success("Video URL loaded");
      }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const blob = URL.createObjectURL(file);
      setVideoSrc(blob);
      setEmbedSrc(null);
      toast.success(`Loaded: ${file.name}`);
    };

    // Sync video element src
    useEffect(() => {
      const v = videoRef.current;
      if (!v || !videoSrc) return;
      v.src = videoSrc;
      v.volume = volume;
      v.playbackRate = playbackRate;
    }, [videoSrc]);

    // ── Seek bar interaction ──────────────────────────────────────────────────

    const handleSeekInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = parseFloat(e.target.value);
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
      <div
        className="fixed z-50 flex flex-col"
        style={{
          top: "60px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(700px, 96vw)",
          maxHeight: "calc(100vh - 72px)",
          background: "#0b0b18",
          border: "1px solid rgba(124,58,237,0.25)",
          borderRadius: "16px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,58,237,0.08)",
          overflow: "hidden",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(124,58,237,0.12)", background: "#0d0d1e" }}
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.3))" }}>
            <Tv2 size={14} style={{ color: "#a78bfa" }} />
          </div>
          <span style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, color: "#f0eefc", fontSize: "0.9rem", flex: 1 }}>
            AI Video Navigation
          </span>

          {/* Gesture mode badge */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
            style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}>
            <Hand size={11} style={{ color: "#a78bfa" }} />
            <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#a78bfa" }}>GESTURE MODE</span>
          </div>

          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: "#6b6890" }}>
            <X size={15} />
          </button>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <div className="flex px-3 pt-2 shrink-0" style={{ borderBottom: "1px solid rgba(124,58,237,0.08)" }}>
          {(["player", "map"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-2 text-xs font-medium transition-colors capitalize"
              style={{
                fontFamily: "var(--font-family-display)",
                color: tab === t ? "#a78bfa" : "#6b6890",
                borderBottom: tab === t ? "2px solid #7C3AED" : "2px solid transparent",
              }}>
              {t === "player" ? "🎬 Player" : "✋ Gesture Map"}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto" style={{ scrollbarWidth: "none" }}>

          {/* ── Player Tab ──────────────────────────────────────────────────── */}
          {tab === "player" && (
            <div className="p-4 space-y-3">

              {/* URL + File load row */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <LinkIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6b6890" }} />
                  <input
                    className="w-full pl-8 pr-3 py-2 rounded-lg text-xs outline-none"
                    placeholder="Paste video URL or YouTube link…"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLoadUrl()}
                    style={{
                      background: "#141425",
                      border: "1px solid rgba(124,58,237,0.15)",
                      color: "#f0eefc",
                      fontFamily: "var(--font-family-body)",
                    }}
                  />
                </div>
                <button onClick={handleLoadUrl}
                  className="px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                  style={{ background: "#7C3AED", color: "white", fontFamily: "var(--font-family-display)" }}>
                  Load
                </button>
                <button onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-80 flex items-center gap-1.5"
                  style={{
                    background: "rgba(124,58,237,0.15)",
                    border: "1px solid rgba(124,58,237,0.25)",
                    color: "#a78bfa",
                    fontFamily: "var(--font-family-display)",
                  }}>
                  <Upload size={12} /> File
                </button>
                <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
              </div>

              {/* ── Video area ─────────────────────────────────────────────── */}
              <div
                ref={containerRef}
                className="relative rounded-xl overflow-hidden"
                style={{
                  aspectRatio: "16/9",
                  background: "#070710",
                  border: "1px solid rgba(124,58,237,0.15)",
                }}
              >
                {/* YouTube iframe */}
                {embedSrc && (
                  <iframe
                    ref={iframeRef}
                    src={embedSrc}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ border: "none" }}
                    title="Video player"
                  />
                )}

                {/* HTML5 video */}
                {videoSrc && (
                  <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full"
                    style={{ objectFit: "contain" }}
                    onClick={togglePlay}
                  />
                )}

                {/* Empty state */}
                {!videoSrc && !embedSrc && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <Tv2 size={40} style={{ color: "rgba(124,58,237,0.2)" }} />
                    <p style={{ fontFamily: "var(--font-family-display)", color: "#4a4a6a", fontSize: "0.9rem" }}>
                      Load a video to start gesture control
                    </p>
                    <p style={{ fontFamily: "var(--font-family-mono)", color: "#2a2a3a", fontSize: "0.7rem" }}>
                      YouTube URLs · MP4 · WebM · MOV
                    </p>
                  </div>
                )}

                {/* Gesture flash overlay */}
                {gestureFlash && (
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-5 py-3 rounded-2xl"
                    style={{
                      background: "rgba(7,7,14,0.92)",
                      border: "1px solid rgba(124,58,237,0.4)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <p style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, color: "#a78bfa", fontSize: "1.2rem", textAlign: "center" }}>
                      {gestureFlash}
                    </p>
                  </div>
                )}

                {/* Controls overlay (HTML5 video only) */}
                {videoSrc && showControls && (
                  <div
                    className="absolute bottom-0 left-0 right-0 p-3"
                    style={{ background: "linear-gradient(transparent, rgba(7,7,14,0.95))" }}
                  >
                    {/* Seek bar */}
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      step={0.1}
                      value={currentTime}
                      onChange={handleSeekInput}
                      className="w-full h-1 rounded-full appearance-none cursor-pointer mb-2"
                      style={{
                        accentColor: "#7C3AED",
                        background: `linear-gradient(to right, #7C3AED ${(currentTime / (duration || 1)) * 100}%, rgba(124,58,237,0.15) 0%)`,
                      }}
                    />

                    {/* Control row */}
                    <div className="flex items-center gap-3">
                      <button onClick={() => seek(-10)} className="hover:opacity-70 transition-opacity">
                        <Rewind size={16} style={{ color: "#a78bfa" }} />
                      </button>
                      <button onClick={togglePlay}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80"
                        style={{ background: "#7C3AED" }}>
                        {isPlaying ? <Pause size={14} className="text-white" /> : <Play size={14} className="text-white" />}
                      </button>
                      <button onClick={() => seek(10)} className="hover:opacity-70 transition-opacity">
                        <FastForward size={16} style={{ color: "#a78bfa" }} />
                      </button>

                      <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", color: "#6b6890" }}>
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>

                      <div className="ml-auto flex items-center gap-2">
                        {/* Volume */}
                        <button onClick={() => { const v = videoRef.current; if (v) { v.muted = !v.muted; setIsMuted(v.muted); } }}>
                          {isMuted || volume === 0
                            ? <VolumeX size={15} style={{ color: "#6b6890" }} />
                            : <Volume2 size={15} style={{ color: "#a78bfa" }} />
                          }
                        </button>
                        <input
                          type="range" min={0} max={1} step={0.05}
                          value={isMuted ? 0 : volume}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (videoRef.current) videoRef.current.volume = v;
                            setVolume(v);
                            setIsMuted(v === 0);
                          }}
                          className="w-16 h-1 rounded-full appearance-none cursor-pointer"
                          style={{ accentColor: "#7C3AED" }}
                        />

                        {/* Speed */}
                        <span
                          className="px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80"
                          style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", color: "#a78bfa", background: "rgba(124,58,237,0.15)" }}
                          onClick={() => changeSpeed(playbackRate >= 2 ? -1.75 : 0.25)}
                        >
                          {playbackRate}×
                        </span>

                        {/* Fullscreen */}
                        <button onClick={toggleFullscreen} className="hover:opacity-70 transition-opacity">
                          {isFullscreen
                            ? <Minimize size={15} style={{ color: "#a78bfa" }} />
                            : <Maximize size={15} style={{ color: "#a78bfa" }} />
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Last gesture action */}
              {lastGestureAction && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)" }}>
                  <Hand size={12} style={{ color: "#7C3AED" }} />
                  <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", color: "#a78bfa" }}>
                    Last: {lastGestureAction}
                  </span>
                </div>
              )}

              {/* Usage hint */}
              <div className="p-3 rounded-xl" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.12)" }}>
                <p style={{ fontFamily: "var(--font-family-body)", color: "#6b6890", fontSize: "0.72rem", lineHeight: 1.6 }}>
                  <span style={{ color: "#a78bfa" }}>✋ Gesture mode is ACTIVE.</span>
                  {" "}While this panel is open, your hand gestures control the video instead of the whiteboard.
                  Open the Gesture Map tab to see all controls.
                </p>
              </div>
            </div>
          )}

          {/* ── Gesture Map Tab ─────────────────────────────────────────────── */}
          {tab === "map" && (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Hand size={13} style={{ color: "#a78bfa" }} />
                <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", color: "#6b6890" }}>
                  VIDEO CONTROL GESTURES
                </span>
              </div>

              <div className="space-y-1.5">
                {GESTURE_GUIDE_ROWS.map(([gesture, info]) => (
                  <div
                    key={gesture}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: "#141425", border: "1px solid rgba(124,58,237,0.06)" }}
                  >
                    <span style={{ fontSize: "1.1rem", width: "28px", textAlign: "center" }}>{info.icon}</span>
                    <div className="flex-1">
                      <div style={{ fontFamily: "var(--font-family-display)", fontWeight: 600, color: "#f0eefc", fontSize: "0.8rem" }}>
                        {gesture.replace(/_/g, " ")}
                      </div>
                      <div style={{ fontFamily: "var(--font-family-body)", color: "#6b6890", fontSize: "0.7rem" }}>
                        {info.label}
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: info.color }} />
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl mt-2" style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)" }}>
                <p style={{ fontFamily: "var(--font-family-body)", color: "#a0a0b8", fontSize: "0.72rem", lineHeight: 1.6 }}>
                  💡 Gestures are captured by the Gesture Control panel. Make sure it is active.
                  Hold each gesture stable for 0.9s before it fires. Close this panel to return to whiteboard gestures.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

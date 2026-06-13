/**
 * useRecording — React hook for lecture recording via RecordingEngine.
 */

import { useRef, useState, useCallback } from "react";
import { RecordingEngine, RecordingState, RecordingStats } from "../lib/recordingEngine";

export interface RecordingHookState {
  state: RecordingState;
  duration: number;          // seconds
  stats: RecordingStats | null;
}

export function useRecording(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const engineRef = useRef<RecordingEngine | null>(null);
  const [hookState, setHookState] = useState<RecordingHookState>({
    state: "idle",
    duration: 0,
    stats: null,
  });

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new RecordingEngine(
        (state: RecordingState) => setHookState((prev) => ({ ...prev, state })),
        (duration: number) => setHookState((prev) => ({ ...prev, duration }))
      );
    }
    return engineRef.current;
  }, []);

  const start = useCallback(async (includeAudio = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = getEngine();
    await engine.start({ canvasRef: canvas, includeAudio, fps: 30, quality: "medium" });
  }, [canvasRef, getEngine]);

  const pause = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    engineRef.current?.resume();
  }, []);

  const stop = useCallback(async (filename?: string) => {
    if (!engineRef.current) return;
    const stats = await engineRef.current.stopAndDownload(filename ?? "aircanvas-lecture");
    setHookState((prev) => ({ ...prev, stats, duration: stats.duration }));
    engineRef.current = null;
  }, []);

  const cancel = useCallback(async () => {
    if (!engineRef.current) return;
    await engineRef.current.stop().catch(() => {});
    engineRef.current = null;
    setHookState({ state: "idle", duration: 0, stats: null });
  }, []);

  return { start, pause, resume, stop, cancel, hookState };
}

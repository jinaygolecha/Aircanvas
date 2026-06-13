/**
 * Gesture Analytics Engine
 * Tracks accuracy, usage patterns, session statistics, and system health metrics.
 */

import type { GestureType, TrackingQuality } from "./gestureEngine";

export interface GestureEvent {
  gesture: GestureType;
  timestamp: number;
  confidence: number;
  activated: boolean;
  duration: number;
  trackingQuality: TrackingQuality;
}

export interface SessionStats {
  sessionId: string;
  startTime: number;
  endTime?: number;
  totalFrames: number;
  gestureEvents: GestureEvent[];
  avgFps: number;
  avgLatency: number;
  avgConfidence: number;
  trackingLostCount: number;
  mostUsedGesture: GestureType;
  gestureAccuracy: number;        // % of attempts that activated
  airWritingStrokes: number;
  activationsPerMinute: number;
}

export interface GestureUsageMap {
  [gesture: string]: { count: number; successRate: number; avgConfidence: number };
}

export class GestureAnalytics {
  private events: GestureEvent[] = [];
  private sessionStart: number;
  private sessionId: string;
  private fpsHistory: number[] = [];
  private latencyHistory: number[] = [];
  private airWritingStrokes = 0;
  private trackingLostCount = 0;
  private totalFrames = 0;

  constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.sessionStart = Date.now();
  }

  recordFrame(fps: number, latency: number, quality: TrackingQuality) {
    this.totalFrames++;
    this.fpsHistory.push(fps);
    this.latencyHistory.push(latency);
    if (this.fpsHistory.length > 300) this.fpsHistory.shift();
    if (this.latencyHistory.length > 300) this.latencyHistory.shift();
    if (quality === "LOST") this.trackingLostCount++;
  }

  recordGestureEvent(event: GestureEvent) {
    this.events.push(event);
  }

  recordAirWritingStroke() {
    this.airWritingStrokes++;
  }

  getSessionStats(): SessionStats {
    const duration = (Date.now() - this.sessionStart) / 60000; // minutes
    const activated = this.events.filter((e) => e.activated);

    const gestureCounts: Record<string, number> = {};
    this.events.forEach((e) => {
      gestureCounts[e.gesture] = (gestureCounts[e.gesture] ?? 0) + 1;
    });
    const mostUsed = (Object.entries(gestureCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "NONE") as GestureType;

    return {
      sessionId: this.sessionId,
      startTime: this.sessionStart,
      totalFrames: this.totalFrames,
      gestureEvents: [...this.events],
      avgFps: this.average(this.fpsHistory),
      avgLatency: this.average(this.latencyHistory),
      avgConfidence: this.average(this.events.map((e) => e.confidence)),
      trackingLostCount: this.trackingLostCount,
      mostUsedGesture: mostUsed,
      gestureAccuracy: this.events.length > 0
        ? Math.round((activated.length / this.events.length) * 100)
        : 100,
      airWritingStrokes: this.airWritingStrokes,
      activationsPerMinute: duration > 0 ? Math.round(activated.length / duration) : 0,
    };
  }

  getUsageMap(): GestureUsageMap {
    const map: GestureUsageMap = {};
    const byGesture: Record<string, GestureEvent[]> = {};

    this.events.forEach((e) => {
      if (!byGesture[e.gesture]) byGesture[e.gesture] = [];
      byGesture[e.gesture].push(e);
    });

    Object.entries(byGesture).forEach(([gesture, events]) => {
      const activated = events.filter((e) => e.activated).length;
      map[gesture] = {
        count: events.length,
        successRate: events.length > 0 ? Math.round((activated / events.length) * 100) : 0,
        avgConfidence: Math.round(this.average(events.map((e) => e.confidence))),
      };
    });

    return map;
  }

  getRecentHistory(limit = 10): GestureEvent[] {
    return this.events.slice(-limit).reverse();
  }

  getCurrentFps(): number {
    return this.fpsHistory.length > 0
      ? Math.round(this.average(this.fpsHistory.slice(-10)))
      : 0;
  }

  getCurrentLatency(): number {
    return this.latencyHistory.length > 0
      ? Math.round(this.average(this.latencyHistory.slice(-10)))
      : 0;
  }

  getTrackingStability(): number {
    if (this.totalFrames === 0) return 100;
    return Math.round(((this.totalFrames - this.trackingLostCount) / this.totalFrames) * 100);
  }

  exportCSV(): string {
    const headers = ["timestamp", "gesture", "confidence", "activated", "duration", "quality"];
    const rows = this.events.map((e) =>
      [e.timestamp, e.gesture, e.confidence, e.activated, e.duration, e.trackingQuality].join(",")
    );
    return [headers.join(","), ...rows].join("\n");
  }

  reset() {
    this.events = [];
    this.fpsHistory = [];
    this.latencyHistory = [];
    this.airWritingStrokes = 0;
    this.trackingLostCount = 0;
    this.totalFrames = 0;
    this.sessionStart = Date.now();
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private average(arr: number[]): number {
    if (!arr.length) return 0;
    return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
  }
}

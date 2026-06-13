/**
 * Production-Grade Filters for Real-Time Hand Tracking
 *
 * OneEuroFilter1D / OneEuroFilter2D — Casiez et al. 2012
 *   Adaptive frequency low-pass filter, optimal for pointer/gesture tracking:
 *   - Low velocity → high smoothing (removes jitter at rest)
 *   - High velocity → low smoothing (minimal latency during fast gestures)
 *
 * LandmarkSmoother — applies OneEuroFilter to all 21 hand landmarks
 *
 * MotionPredictor — linear extrapolation for brief tracking-loss recovery
 *
 * Legacy exports (KalmanFilter1D/2D, AdaptiveKalmanFilter2D) preserved
 * for backward compatibility with any external callers.
 */

// ── Internal: Low-Pass Filter ────────────────────────────────────────────────

class LowPassFilter1D {
  private y = 0;
  private initialized = false;

  filter(x: number, a: number): number {
    if (!this.initialized) {
      this.y = x;
      this.initialized = true;
      return x;
    }
    this.y = a * x + (1 - a) * this.y;
    return this.y;
  }

  lastValue(): number { return this.y; }
  isInitialized(): boolean { return this.initialized; }

  reset(): void {
    this.initialized = false;
    this.y = 0;
  }
}

function computeAlpha(cutoff: number, rate: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  const te = 1 / Math.max(rate, 1);
  return 1 / (1 + tau / te);
}

// ── One Euro Filter (1D) ─────────────────────────────────────────────────────

/**
 * OneEuroFilter1D — single-axis adaptive filter.
 *
 * Parameters (tune for gesture tracking):
 *   minCutoff: 1.5  — lower = smoother at rest, more lag
 *   beta: 0.01      — higher = less lag during fast movement
 *   dCutoff: 1.0    — derivative cutoff (rarely needs changing)
 */
export class OneEuroFilter1D {
  private rate: number;
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xFilter = new LowPassFilter1D();
  private dxFilter = new LowPassFilter1D();
  private lastTimestamp = -1;
  private prevRaw = 0;

  constructor(rate = 30, minCutoff = 1.5, beta = 0.01, dCutoff = 1.0) {
    this.rate = rate;
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  filter(x: number, timestamp?: number): number {
    if (timestamp !== undefined && this.lastTimestamp >= 0) {
      const dt = (timestamp - this.lastTimestamp) / 1000;
      if (dt > 0 && dt < 1.0) this.rate = 1 / dt;
    }
    if (timestamp !== undefined) this.lastTimestamp = timestamp;

    const dAlpha = computeAlpha(this.dCutoff, this.rate);
    const dx = this.xFilter.isInitialized()
      ? (x - this.prevRaw) * this.rate
      : 0;
    const edx = this.dxFilter.filter(dx, dAlpha);
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    const a = computeAlpha(cutoff, this.rate);

    this.prevRaw = x;
    return this.xFilter.filter(x, a);
  }

  reset(): void {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTimestamp = -1;
    this.prevRaw = 0;
  }
}

// ── One Euro Filter (2D) ─────────────────────────────────────────────────────

export class OneEuroFilter2D {
  private fx: OneEuroFilter1D;
  private fy: OneEuroFilter1D;

  constructor(rate = 30, minCutoff = 1.5, beta = 0.01) {
    this.fx = new OneEuroFilter1D(rate, minCutoff, beta);
    this.fy = new OneEuroFilter1D(rate, minCutoff, beta);
  }

  filter(x: number, y: number, timestamp?: number): { x: number; y: number } {
    return {
      x: this.fx.filter(x, timestamp),
      y: this.fy.filter(y, timestamp),
    };
  }

  reset(): void {
    this.fx.reset();
    this.fy.reset();
  }
}

// ── Landmark Smoother — 21-point One Euro filter bank ───────────────────────

export interface RawLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/**
 * Applies One Euro Filter to each of 21 hand landmarks independently.
 * Creates 42 filter instances (x + y per landmark).
 *
 * Use aggressive params for air writing (fast response, jitter-free):
 *   minCutoff=2.0, beta=0.02
 * Use conservative params for gesture classification (more stability):
 *   minCutoff=1.0, beta=0.005
 */
export class LandmarkSmoother {
  private filters: OneEuroFilter2D[];

  constructor(numLandmarks = 21, minCutoff = 1.5, beta = 0.01) {
    this.filters = Array.from(
      { length: numLandmarks },
      () => new OneEuroFilter2D(30, minCutoff, beta)
    );
  }

  smooth(landmarks: RawLandmark[], timestamp?: number): RawLandmark[] {
    return landmarks.map((lm, i) => {
      const f = this.filters[i] ?? this.filters[0];
      const out = f.filter(lm.x, lm.y, timestamp);
      return { ...lm, x: out.x, y: out.y };
    });
  }

  reset(): void {
    this.filters.forEach((f) => f.reset());
  }
}

// ── Motion Predictor — linear extrapolation during tracking loss ─────────────

/**
 * Stores the last N landmark frames and linearly extrapolates position
 * when MediaPipe momentarily loses the hand (up to MAX_PREDICT frames).
 *
 * Predicted landmarks carry reduced visibility to signal lower confidence.
 */
export class MotionPredictor {
  private history: RawLandmark[][] = [];
  private timestamps: number[] = [];
  private readonly maxHistory = 6;
  private readonly maxPredictFrames = 5;
  private predictCount = 0;

  update(landmarks: RawLandmark[], timestamp: number): void {
    this.history.push(landmarks.map((l) => ({ ...l })));
    this.timestamps.push(timestamp);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.timestamps.shift();
    }
    this.predictCount = 0;
  }

  /** Call when MediaPipe returns null — returns predicted landmarks or null */
  predict(): RawLandmark[] | null {
    if (this.predictCount >= this.maxPredictFrames) return null;
    if (this.history.length < 2) return null;

    const last = this.history[this.history.length - 1];
    const prev = this.history[this.history.length - 2];
    const dt1 = this.timestamps[this.timestamps.length - 1] - this.timestamps[this.timestamps.length - 2];
    if (dt1 <= 0 || dt1 > 150) return null;

    this.predictCount++;
    // Exponentially decaying confidence
    const conf = Math.max(0.15, 0.8 * Math.pow(0.75, this.predictCount - 1));

    return last.map((lm, i) => ({
      x: lm.x + (lm.x - prev[i].x),
      y: lm.y + (lm.y - prev[i].y),
      z: lm.z + (lm.z - prev[i].z),
      visibility: (lm.visibility ?? 0.8) * conf,
    }));
  }

  hasHistory(): boolean { return this.history.length >= 2; }

  reset(): void {
    this.history = [];
    this.timestamps = [];
    this.predictCount = 0;
  }
}

// ── Legacy Kalman Exports (backward compatibility) ────────────────────────────

export class KalmanFilter1D {
  private R: number;
  private Q: number;
  private x = 0;
  private p = 1;
  private initialized = false;

  constructor(R = 0.008, Q = 2.5) {
    this.R = R;
    this.Q = Q;
  }

  filter(z: number): number {
    if (!this.initialized) {
      this.x = z;
      this.initialized = true;
      return z;
    }
    this.p += this.Q;
    const k = this.p / (this.p + this.R);
    this.x = this.x + k * (z - this.x);
    this.p = (1 - k) * this.p;
    return this.x;
  }

  reset(value = 0): void {
    this.x = value;
    this.p = 1;
    this.initialized = false;
  }

  setNoise(R: number, Q: number): void {
    this.R = R;
    this.Q = Q;
  }
}

export class KalmanFilter2D {
  private kfX: KalmanFilter1D;
  private kfY: KalmanFilter1D;

  constructor(R = 0.008, Q = 2.5) {
    this.kfX = new KalmanFilter1D(R, Q);
    this.kfY = new KalmanFilter1D(R, Q);
  }

  filter(x: number, y: number): { x: number; y: number } {
    return { x: this.kfX.filter(x), y: this.kfY.filter(y) };
  }

  reset(): void { this.kfX.reset(); this.kfY.reset(); }

  setNoise(R: number, Q: number): void {
    this.kfX.setNoise(R, Q);
    this.kfY.setNoise(R, Q);
  }
}

export class AdaptiveKalmanFilter2D {
  private kfX: KalmanFilter1D;
  private kfY: KalmanFilter1D;
  private prevX = 0;
  private prevY = 0;
  private baseR: number;
  private baseQ: number;

  constructor(baseR = 0.008, baseQ = 2.5) {
    this.baseR = baseR;
    this.baseQ = baseQ;
    this.kfX = new KalmanFilter1D(baseR, baseQ);
    this.kfY = new KalmanFilter1D(baseR, baseQ);
  }

  filter(x: number, y: number): { x: number; y: number } {
    const vel = Math.sqrt((x - this.prevX) ** 2 + (y - this.prevY) ** 2);
    const vf = Math.min(vel * 50, 5);
    this.kfX.setNoise(this.baseR / (1 + vf * 0.5), this.baseQ * (1 + vf));
    this.kfY.setNoise(this.baseR / (1 + vf * 0.5), this.baseQ * (1 + vf));
    this.prevX = x;
    this.prevY = y;
    return { x: this.kfX.filter(x), y: this.kfY.filter(y) };
  }

  reset(): void {
    this.kfX.reset();
    this.kfY.reset();
    this.prevX = 0;
    this.prevY = 0;
  }
}

/**
 * Production Gesture Intelligence Engine — 10-Stage Validation Pipeline
 *
 * Stages:
 *   1.  Hand Detection       — MediaPipe 21-point landmarks present
 *   2.  Visibility Gate      — Average key landmark visibility ≥ minConfidence
 *   3.  Geometry Analysis    — Angle-based finger extension (joint angles, not just y-pos)
 *   4.  Gesture Classification — Rule-based classifier with confidence scoring
 *   5.  Classification Consistency — Must agree across N consecutive frames
 *   6.  Motion Analysis      — Swipe velocity / direction analysis
 *   7.  Stability Verification — Key-landmark position variance over 300ms window
 *   8.  Hold Duration Check  — 800-1200ms stable hold required before activation
 *   9.  Activation Gate      — All stages passed + cooldown elapsed
 *  10.  Action Execution     — Callback fires exactly once per activation
 *
 * This multi-stage pipeline prevents false positives, accidental triggers,
 * and partial-frame misclassifications common in classroom environments.
 */

export type GestureType =
  | "OPEN_PALM"       // All 5 fingers extended — pause tracking
  | "INDEX_FINGER"    // Only index extended — air writing / draw
  | "PINCH"           // Thumb + index tip close — select
  | "PINCH_HOLD"      // Pinch held 2+ seconds — move object
  | "CLOSED_FIST"     // All fingers curled — stop drawing
  | "THUMBS_UP"       // Only thumb extended — save board
  | "THREE_FINGER"    // Index + middle + ring — undo
  | "FOUR_FINGER"     // All fingers except thumb — redo
  | "SWIPE_LEFT"      // Fast leftward wrist motion — prev slide
  | "SWIPE_RIGHT"     // Fast rightward wrist motion — next slide
  | "PALM_CIRCLE"     // Open palm lateral motion — clear board
  | "PALM_HOLD"       // Open palm held 2+ seconds — open AI assistant
  | "NONE";

export type TrackingQuality = "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "LOST";

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface GestureResult {
  gesture: GestureType;
  confidence: number;         // 0–100 composite score
  holdProgress: number;       // 0–1 progress toward activation
  isActivated: boolean;       // true for exactly one frame on activation
  isStable: boolean;
  fingerTip: { x: number; y: number } | null;   // index fingertip, normalized 0-1
  thumbTip: { x: number; y: number } | null;
  trackingQuality: TrackingQuality;
  handedness: "Left" | "Right" | null;
  stability: number;          // 0–100
  fps: number;
  latency: number;            // ms
  swipeDirection: "LEFT" | "RIGHT" | "NONE";
  isPredicted: boolean;       // true if position is motion-predicted (hand briefly lost)
}

export interface CalibrationProfile {
  sensitivity: number;        // 0.5–2.0, default 1.0
  holdDuration: number;       // ms, default 900
  stabilityThreshold: number; // 0.005–0.05, default 0.015
  pinchThreshold: number;     // normalized, default 0.06
  dominantHand: "Left" | "Right" | "Auto";
  trackingZone: { x: number; y: number; w: number; h: number };
  minConfidence: number;      // 0–100, default 65
}

export const DEFAULT_CALIBRATION: CalibrationProfile = {
  sensitivity: 1.0,
  holdDuration: 900,
  stabilityThreshold: 0.015,
  pinchThreshold: 0.06,
  dominantHand: "Auto",
  trackingZone: { x: 0.05, y: 0.05, w: 0.9, h: 0.9 },
  minConfidence: 60,
};

export interface GestureHistoryEntry {
  gesture: GestureType;
  confidence: number;
  timestamp: number;
  activated: boolean;
  duration: number;
}

// ── MediaPipe landmark indices ─────────────────────────────────────────────────
// Wrist: 0
// Thumb:  CMC=1, MCP=2, IP=3, TIP=4
// Index:  MCP=5, PIP=6, DIP=7, TIP=8
// Middle: MCP=9, PIP=10, DIP=11, TIP=12
// Ring:   MCP=13, PIP=14, DIP=15, TIP=16
// Pinky:  MCP=17, PIP=18, DIP=19, TIP=20

// ── Geometric helpers ──────────────────────────────────────────────────────────

function dist2D(a: Landmark, b: Landmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/** Angle in degrees at vertex `joint` between rays joint→a and joint→b */
function jointAngle(a: Landmark, joint: Landmark, b: Landmark): number {
  const v1 = { x: a.x - joint.x, y: a.y - joint.y };
  const v2 = { x: b.x - joint.x, y: b.y - joint.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag = Math.sqrt(v1.x ** 2 + v1.y ** 2) * Math.sqrt(v2.x ** 2 + v2.y ** 2);
  if (mag < 1e-7) return 180;
  return Math.acos(Math.max(-1, Math.min(1, dot / mag))) * (180 / Math.PI);
}

/**
 * Returns an extension score 0–1 for a finger:
 * 1 = fully extended (straight), 0 = fully curled.
 * Uses angle at PIP and DIP joints for robustness against hand tilt.
 */
function fingerExtensionScore(
  lm: Landmark[],
  mcp: number,
  pip: number,
  dip: number,
  tip: number
): number {
  const pipAngle = jointAngle(lm[mcp], lm[pip], lm[dip]);
  const dipAngle = jointAngle(lm[pip], lm[dip], lm[tip]);
  // Map 100°→0, 180°→1 for each joint, then average
  const pipScore = Math.max(0, (pipAngle - 100) / 80);
  const dipScore = Math.max(0, (dipAngle - 100) / 80);
  return (pipScore + dipScore) / 2;
}

/** Returns true when score exceeds threshold */
function isFingerExtended(
  lm: Landmark[],
  mcp: number,
  pip: number,
  dip: number,
  tip: number,
  threshold = 0.55
): boolean {
  return fingerExtensionScore(lm, mcp, pip, dip, tip) >= threshold;
}

/**
 * Thumb extension: uses IP joint angle + lateral spread from palm.
 * Accounts for both left and right hand orientation.
 */
function isThumbExtended(lm: Landmark[], handedness: "Left" | "Right"): boolean {
  const ipAngle = jointAngle(lm[2], lm[3], lm[4]);
  const mcpAngle = jointAngle(lm[1], lm[2], lm[3]);
  const angleClear = ipAngle > 140 && mcpAngle > 120;

  // Lateral spread: thumb tip should be away from index MCP in x-axis
  const spread = handedness === "Right"
    ? lm[4].x < lm[5].x - 0.03
    : lm[4].x > lm[5].x + 0.03;

  return angleClear || spread;
}

/** Average visibility of critical landmarks (wrist + 5 fingertips) */
function keyLandmarkVisibility(lm: Landmark[]): number {
  const keys = [0, 4, 8, 12, 16, 20];
  return keys.reduce((s, i) => s + (lm[i]?.visibility ?? 0.7), 0) / keys.length;
}

// ── Gesture Classifier ─────────────────────────────────────────────────────────

interface ClassifyResult {
  gesture: GestureType;
  rawConfidence: number;  // geometric confidence 0–100
  extensions: { thumb: boolean; index: number; middle: number; ring: number; pinky: number };
}

function classifyGesture(
  lm: Landmark[],
  handedness: "Left" | "Right",
  pinchThreshold: number
): ClassifyResult {
  if (!lm || lm.length < 21) {
    return { gesture: "NONE", rawConfidence: 0, extensions: { thumb: false, index: 0, middle: 0, ring: 0, pinky: 0 } };
  }

  const thumb  = isThumbExtended(lm, handedness);
  const iScore = fingerExtensionScore(lm, 5, 6, 7, 8);
  const mScore = fingerExtensionScore(lm, 9, 10, 11, 12);
  const rScore = fingerExtensionScore(lm, 13, 14, 15, 16);
  const pScore = fingerExtensionScore(lm, 17, 18, 19, 20);

  const EXTEND_THRESHOLD = 0.55;
  const CURL_THRESHOLD   = 0.35;

  const index  = iScore >= EXTEND_THRESHOLD;
  const middle = mScore >= EXTEND_THRESHOLD;
  const ring   = rScore >= EXTEND_THRESHOLD;
  const pinky  = pScore >= EXTEND_THRESHOLD;

  const iCurl  = iScore <= CURL_THRESHOLD;
  const mCurl  = mScore <= CURL_THRESHOLD;
  const rCurl  = rScore <= CURL_THRESHOLD;
  const pCurl  = pScore <= CURL_THRESHOLD;

  const extCount = [index, middle, ring, pinky].filter(Boolean).length;

  // Pinch (thumb + index tips close together)
  const pinchDist = dist2D(lm[4], lm[8]);
  const isPinch   = pinchDist < pinchThreshold;

  const exts = { thumb, index: iScore, middle: mScore, ring: rScore, pinky: pScore };

  // ── Gesture rules in priority order ─────────────────────────────────────────

  // Closed Fist: all fingers curled
  if (iCurl && mCurl && rCurl && pCurl) {
    const conf = (1 - iScore + 1 - mScore + 1 - rScore + 1 - pScore) / 4 * 100;
    return { gesture: "CLOSED_FIST", rawConfidence: Math.round(Math.min(conf * 1.2, 100)), extensions: exts };
  }

  // Pinch: thumb and index close, other fingers curled
  if (isPinch && mCurl && rCurl && pCurl) {
    const conf = Math.round((1 - pinchDist / pinchThreshold) * 100);
    return { gesture: "PINCH", rawConfidence: Math.min(conf, 96), extensions: exts };
  }

  // Thumbs Up: only thumb extended, all fingers curled
  if (thumb && iCurl && mCurl && rCurl && pCurl) {
    return { gesture: "THUMBS_UP", rawConfidence: 92, extensions: exts };
  }

  // Open Palm: all 4 fingers extended
  if (index && middle && ring && pinky) {
    const conf = Math.round((iScore + mScore + rScore + pScore) / 4 * 100);
    return { gesture: "OPEN_PALM", rawConfidence: Math.min(conf, 97), extensions: exts };
  }

  // Index Finger only: only index extended, all others curled
  if (index && mCurl && rCurl && pCurl) {
    const conf = Math.round(iScore * 100);
    return { gesture: "INDEX_FINGER", rawConfidence: Math.min(conf + 5, 97), extensions: exts };
  }

  // Four Finger: index + middle + ring + pinky (all, no thumb requirement)
  if (index && middle && ring && pinky) {
    const conf = Math.round((iScore + mScore + rScore + pScore) / 4 * 100);
    return { gesture: "FOUR_FINGER", rawConfidence: conf, extensions: exts };
  }

  // Three Finger: index + middle + ring
  if (index && middle && ring && !pinky) {
    const conf = Math.round((iScore + mScore + rScore) / 3 * 100);
    return { gesture: "THREE_FINGER", rawConfidence: conf, extensions: exts };
  }

  return { gesture: "NONE", rawConfidence: 0, extensions: exts };
}

// ── Main Engine Class ──────────────────────────────────────────────────────────

const POSITION_HISTORY_SIZE = 24;  // frames for stability + swipe analysis
const CONSISTENCY_BUFFER_SIZE = 4; // frames that must agree before hold timer starts
const SWIPE_WINDOW_MS = 350;       // swipe must complete within this window
const SWIPE_MIN_DX = 0.14;         // minimum normalized x-displacement for swipe
const KEY_STABILITY_LANDMARKS = [0, 4, 8, 12, 16, 20]; // wrist + fingertips

export class GestureEngine {
  private calibration: CalibrationProfile;

  // Position & motion history
  private positionHistory: Array<{ x: number; y: number; t: number }> = [];
  private landmarkHistory: Landmark[][] = [];

  // Gesture state
  private currentGesture: GestureType = "NONE";
  private gestureStartTime = 0;
  private activationFiredForCurrentGesture = false;
  private lastActivatedTime = 0;
  private lastActivatedGesture: GestureType = "NONE";
  private cooldownMs = 1200;

  // Consistency buffer (prevents false starts from single-frame misclassification)
  private classBuffer: GestureType[] = [];

  // Gesture history log
  private gestureHistory: GestureHistoryEntry[] = [];

  // FPS tracking
  private frameTimestamps: number[] = [];
  private lastFrameTime = 0;

  constructor(calibration: Partial<CalibrationProfile> = {}) {
    this.calibration = { ...DEFAULT_CALIBRATION, ...calibration };
  }

  updateCalibration(profile: Partial<CalibrationProfile>): void {
    this.calibration = { ...this.calibration, ...profile };
  }

  getCalibration(): CalibrationProfile {
    return { ...this.calibration };
  }

  process(
    landmarks: Landmark[] | null,
    handednessRaw: string | null,
    frameTime: number,
    isPredicted = false
  ): GestureResult {

    // ── FPS / Latency ──────────────────────────────────────────────────────────
    const latency = this.lastFrameTime > 0 ? frameTime - this.lastFrameTime : 16;
    this.lastFrameTime = frameTime;

    this.frameTimestamps.push(frameTime);
    if (this.frameTimestamps.length > 30) this.frameTimestamps.shift();
    const fps = this.frameTimestamps.length > 1
      ? Math.round(1000 /
          ((this.frameTimestamps[this.frameTimestamps.length - 1] - this.frameTimestamps[0])
            / (this.frameTimestamps.length - 1)))
      : 0;

    // ── Stage 1: Hand Detection ────────────────────────────────────────────────
    if (!landmarks || landmarks.length < 21) {
      this.classBuffer = [];
      this.currentGesture = "NONE";
      this.gestureStartTime = 0;
      this.activationFiredForCurrentGesture = false;
      return this.buildResult("NONE", 0, 0, false, null, null, "LOST", null, 0, fps, Math.round(latency), "NONE", false);
    }

    const handedness: "Left" | "Right" = (handednessRaw === "Left" || handednessRaw === "Right")
      ? handednessRaw
      : "Right";

    // ── Stage 2: Visibility Gate ───────────────────────────────────────────────
    const visibility = keyLandmarkVisibility(landmarks);
    const trackingQuality = this.getTrackingQuality(visibility * 100);

    // Allow predicted frames through at reduced confidence threshold
    const effectiveMinConf = isPredicted
      ? this.calibration.minConfidence * 0.5
      : this.calibration.minConfidence;

    if (visibility * 100 < effectiveMinConf) {
      this.classBuffer = [];
      this.currentGesture = "NONE";
      this.activationFiredForCurrentGesture = false;
      return this.buildResult(
        "NONE", Math.round(visibility * 100), 0, false,
        null, null, trackingQuality, handedness, 0, fps, Math.round(latency), "NONE", isPredicted
      );
    }

    // ── Stage 3 + 4: Geometry Analysis & Classification ───────────────────────
    const adjustedPinch = this.calibration.pinchThreshold / this.calibration.sensitivity;
    const classified = classifyGesture(landmarks, handedness, adjustedPinch);

    // ── Stage 5: Classification Consistency ───────────────────────────────────
    this.classBuffer.push(classified.gesture);
    if (this.classBuffer.length > CONSISTENCY_BUFFER_SIZE) this.classBuffer.shift();

    // Determine dominant gesture in buffer
    const counts: Partial<Record<GestureType, number>> = {};
    for (const g of this.classBuffer) counts[g] = (counts[g] ?? 0) + 1;
    const [[dominantGesture, dominantCount]] = Object.entries(counts).sort((a, b) => b[1] - a[1]) as [GestureType, number][];
    const consistency = dominantCount / this.classBuffer.length;

    // Only accept gesture when ≥ 75% of buffer agrees (3 of 4 frames)
    const acceptedGesture = consistency >= 0.75 ? dominantGesture : "NONE";

    // ── Stage 6: Motion Analysis (swipe detection) ────────────────────────────
    const wrist = landmarks[0];
    this.positionHistory.push({ x: wrist.x, y: wrist.y, t: frameTime });
    if (this.positionHistory.length > POSITION_HISTORY_SIZE) this.positionHistory.shift();

    this.landmarkHistory.push(landmarks);
    if (this.landmarkHistory.length > 8) this.landmarkHistory.shift();

    const swipe = this.detectSwipe();

    // Swipes take priority if detected
    const resolvedGesture: GestureType = swipe !== "NONE"
      ? (swipe === "LEFT" ? "SWIPE_LEFT" : "SWIPE_RIGHT")
      : acceptedGesture;

    // ── Stage 7: Stability Verification ───────────────────────────────────────
    const stability = this.calculateStability(landmarks);
    const requiredStability = 1 - this.calibration.stabilityThreshold * (6 / this.calibration.sensitivity);
    const isStable = stability >= requiredStability;

    // ── Stage 8: Hold Duration ─────────────────────────────────────────────────
    if (resolvedGesture !== this.currentGesture) {
      this.currentGesture = resolvedGesture;
      this.gestureStartTime = resolvedGesture !== "NONE" ? frameTime : 0;
      this.activationFiredForCurrentGesture = false;
    }

    const holdDuration = this.currentGesture !== "NONE" && this.gestureStartTime > 0
      ? frameTime - this.gestureStartTime
      : 0;

    const requiredHold = this.calibration.holdDuration / this.calibration.sensitivity;
    const holdProgress = Math.min(holdDuration / requiredHold, 1);

    // PALM_HOLD activates after 2× the normal hold time
    const isLongHold = this.currentGesture === "OPEN_PALM" && holdDuration > requiredHold * 2;

    // ── Stage 9: Activation Gate ───────────────────────────────────────────────
    const cooldownPassed = frameTime - this.lastActivatedTime > this.cooldownMs;
    const qualityGate = trackingQuality !== "LOST" && (isPredicted ? trackingQuality !== "POOR" : true);

    // Composite confidence: geometry + visibility + consistency + stability
    const compositeConf = Math.round(
      classified.rawConfidence * 0.45 +
      visibility * 100 * 0.30 +
      consistency * 100 * 0.15 +
      stability * 100 * 0.10
    );

    const confGate = compositeConf >= this.calibration.minConfidence;

    let shouldActivate =
      resolvedGesture !== "NONE" &&
      isStable &&
      holdProgress >= 1.0 &&
      !this.activationFiredForCurrentGesture &&
      cooldownPassed &&
      confGate &&
      qualityGate;

    // Override: PALM_HOLD on long hold
    let activationGesture = resolvedGesture;
    if (isLongHold && resolvedGesture === "OPEN_PALM" && !this.activationFiredForCurrentGesture && cooldownPassed) {
      activationGesture = "PALM_HOLD";
      shouldActivate = true;
    }

    // PINCH_HOLD: pinch held 2× longer
    const pinchLong = this.currentGesture === "PINCH" && holdDuration > requiredHold * 2;
    if (pinchLong && !this.activationFiredForCurrentGesture && cooldownPassed) {
      activationGesture = "PINCH_HOLD";
      shouldActivate = true;
    }

    // ── Stage 10: Action Execution ─────────────────────────────────────────────
    if (shouldActivate) {
      this.activationFiredForCurrentGesture = true;
      this.lastActivatedGesture = activationGesture;
      this.lastActivatedTime = frameTime;

      this.gestureHistory.unshift({
        gesture: activationGesture,
        confidence: compositeConf,
        timestamp: frameTime,
        activated: true,
        duration: holdDuration,
      });
      if (this.gestureHistory.length > 50) this.gestureHistory.pop();
    }

    const fingerTip = resolvedGesture !== "NONE"
      ? { x: landmarks[8].x, y: landmarks[8].y }
      : null;
    const thumbTip = { x: landmarks[4].x, y: landmarks[4].y };

    return this.buildResult(
      shouldActivate ? activationGesture : resolvedGesture,
      compositeConf,
      holdProgress,
      shouldActivate,
      fingerTip,
      thumbTip,
      trackingQuality,
      handedness,
      Math.round(stability * 100),
      fps,
      Math.round(latency),
      swipe,
      isPredicted
    );
  }

  // ── Swipe Detection ──────────────────────────────────────────────────────────

  private detectSwipe(): "LEFT" | "RIGHT" | "NONE" {
    if (this.positionHistory.length < 6) return "NONE";

    const now = this.positionHistory[this.positionHistory.length - 1];
    // Find frames within the swipe window
    const windowStart = now.t - SWIPE_WINDOW_MS;
    const inWindow = this.positionHistory.filter((p) => p.t >= windowStart);

    if (inWindow.length < 5) return "NONE";

    const first = inWindow[0];
    const last  = inWindow[inWindow.length - 1];
    const dx = last.x - first.x;
    const dy = last.y - first.y;

    // Must be primarily horizontal (dy < 60% of dx)
    if (Math.abs(dy) > Math.abs(dx) * 0.6) return "NONE";

    // Minimum displacement
    if (Math.abs(dx) < SWIPE_MIN_DX) return "NONE";

    // Check directional consistency — most inter-frame steps move same direction
    let sameDir = 0;
    const dir = Math.sign(dx);
    for (let i = 1; i < inWindow.length; i++) {
      if (Math.sign(inWindow[i].x - inWindow[i - 1].x) === dir) sameDir++;
    }
    if (sameDir / (inWindow.length - 1) < 0.65) return "NONE";

    return dx > 0 ? "RIGHT" : "LEFT";
  }

  // ── Stability ────────────────────────────────────────────────────────────────

  private calculateStability(currentLm: Landmark[]): number {
    if (this.landmarkHistory.length < 4) return 1;

    const recent = this.landmarkHistory.slice(-5);
    let totalVar = 0;

    for (const idx of KEY_STABILITY_LANDMARKS) {
      const xs = recent.map((frame) => frame[idx]?.x ?? 0);
      const ys = recent.map((frame) => frame[idx]?.y ?? 0);
      const mX = xs.reduce((s, v) => s + v, 0) / xs.length;
      const mY = ys.reduce((s, v) => s + v, 0) / ys.length;
      const varX = xs.reduce((s, v) => s + (v - mX) ** 2, 0) / xs.length;
      const varY = ys.reduce((s, v) => s + (v - mY) ** 2, 0) / ys.length;
      totalVar += varX + varY;
    }

    const avgVar = totalVar / KEY_STABILITY_LANDMARKS.length;
    const thresh = (this.calibration.stabilityThreshold / this.calibration.sensitivity) ** 2;
    return Math.max(0, Math.min(1, 1 - avgVar / (thresh * 1.5)));
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private getTrackingQuality(visibilityPct: number): TrackingQuality {
    if (visibilityPct >= 88) return "EXCELLENT";
    if (visibilityPct >= 72) return "GOOD";
    if (visibilityPct >= 52) return "FAIR";
    if (visibilityPct >= 28) return "POOR";
    return "LOST";
  }

  private buildResult(
    gesture: GestureType,
    confidence: number,
    holdProgress: number,
    isActivated: boolean,
    fingerTip: { x: number; y: number } | null,
    thumbTip: { x: number; y: number } | null,
    trackingQuality: TrackingQuality,
    handedness: "Left" | "Right" | null,
    stability: number,
    fps: number,
    latency: number,
    swipeDirection: "LEFT" | "RIGHT" | "NONE",
    isPredicted: boolean
  ): GestureResult {
    return {
      gesture,
      confidence: Math.round(Math.max(0, Math.min(100, confidence))),
      holdProgress,
      isActivated,
      isStable: stability >= 60,
      fingerTip,
      thumbTip,
      trackingQuality,
      handedness,
      stability,
      fps,
      latency,
      swipeDirection,
      isPredicted,
    };
  }

  getHistory(): GestureHistoryEntry[] { return [...this.gestureHistory]; }

  getAccuracy(): number {
    const activated = this.gestureHistory.filter((g) => g.activated).length;
    return this.gestureHistory.length > 0
      ? Math.round((activated / this.gestureHistory.length) * 100)
      : 0;
  }

  reset(): void {
    this.positionHistory = [];
    this.landmarkHistory = [];
    this.classBuffer = [];
    this.currentGesture = "NONE";
    this.gestureStartTime = 0;
    this.activationFiredForCurrentGesture = false;
  }
}

// ── Bezier / Catmull-Rom Stroke Utilities ─────────────────────────────────────

export interface Point { x: number; y: number }

/**
 * Catmull-Rom to cubic Bezier subdivision.
 * Returns a densified point array suitable for smooth canvas rendering.
 * tension: 0.5 = standard Catmull-Rom, higher = tighter to control points.
 */
export function smoothStroke(points: Point[], tension = 0.5, subdivisions = 4): Point[] {
  if (points.length < 3) return points;

  const result: Point[] = [points[0]];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Catmull-Rom control points
    const cp1 = {
      x: p1.x + (p2.x - p0.x) * tension / 3,
      y: p1.y + (p2.y - p0.y) * tension / 3,
    };
    const cp2 = {
      x: p2.x - (p3.x - p1.x) * tension / 3,
      y: p2.y - (p3.y - p1.y) * tension / 3,
    };

    for (let s = 1; s <= subdivisions; s++) {
      const t = s / subdivisions;
      const mt = 1 - t;
      result.push({
        x: mt ** 3 * p1.x + 3 * mt ** 2 * t * cp1.x + 3 * mt * t ** 2 * cp2.x + t ** 3 * p2.x,
        y: mt ** 3 * p1.y + 3 * mt ** 2 * t * cp1.y + 3 * mt * t ** 2 * cp2.y + t ** 3 * p2.y,
      });
    }
  }

  return result;
}

/** Render a smooth path through points using quadratic Bezier mid-point technique */
export function drawSmoothPath(ctx: CanvasRenderingContext2D, points: Point[]): void {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 2; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }
  const n = points.length;
  ctx.quadraticCurveTo(points[n - 2].x, points[n - 2].y, points[n - 1].x, points[n - 1].y);
  ctx.stroke();
}

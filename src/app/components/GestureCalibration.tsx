/**
 * GestureCalibration — Step-by-step calibration wizard.
 * Saves calibration profiles per session.
 */

import { useState } from "react";
import { Check, ChevronRight, Sliders, Zap, Hand, Eye, Camera } from "lucide-react";
import type { CalibrationProfile } from "../lib/gestureEngine";
import { DEFAULT_CALIBRATION } from "../lib/gestureEngine";

interface GestureCalibrationProps {
  currentCalibration: CalibrationProfile;
  onSave: (profile: Partial<CalibrationProfile>) => void;
}

export function GestureCalibration({ currentCalibration, onSave }: GestureCalibrationProps) {
  const [profile, setProfile] = useState<CalibrationProfile>({ ...currentCalibration });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setProfile({ ...DEFAULT_CALIBRATION });
    onSave(DEFAULT_CALIBRATION);
  };

  const slider = (
    label: string,
    key: keyof CalibrationProfile,
    min: number, max: number, step: number,
    unit = "",
    description = ""
  ) => (
    <div key={String(key)} className="space-y-1.5">
      <div className="flex justify-between">
        <span style={{ fontFamily: "var(--font-family-display)", fontSize: "0.8rem", color: "#c4bff5" }}>{label}</span>
        <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.75rem", color: "#7C3AED" }}>
          {typeof profile[key] === "number" ? (profile[key] as number).toFixed(step < 1 ? 2 : 0) : profile[key]}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={profile[key] as number}
        onChange={(e) => setProfile((p) => ({ ...p, [key]: parseFloat(e.target.value) }))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: "#7C3AED", background: `linear-gradient(to right, #7C3AED ${((profile[key] as number - min) / (max - min)) * 100}%, rgba(124,58,237,0.15) 0%)` }}
      />
      {description && <p style={{ fontFamily: "var(--font-family-body)", fontSize: "0.7rem", color: "#4a4a6a" }}>{description}</p>}
    </div>
  );

  return (
    <div className="p-3 space-y-4">
      <p style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#6b6890" }}>
        CALIBRATION PROFILES
      </p>

      {/* Dominant Hand */}
      <div>
        <p className="mb-2" style={{ fontFamily: "var(--font-family-display)", fontSize: "0.8rem", color: "#c4bff5" }}>Dominant Hand</p>
        <div className="flex gap-2">
          {(["Left", "Right", "Auto"] as const).map((h) => (
            <button
              key={h}
              onClick={() => setProfile((p) => ({ ...p, dominantHand: h }))}
              className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                fontFamily: "var(--font-family-display)",
                background: profile.dominantHand === h ? "rgba(124,58,237,0.2)" : "#141425",
                border: `1px solid ${profile.dominantHand === h ? "rgba(124,58,237,0.4)" : "rgba(124,58,237,0.1)"}`,
                color: profile.dominantHand === h ? "#a78bfa" : "#6b6890",
              }}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {/* Sensitivity */}
      {slider("Sensitivity", "sensitivity", 0.5, 2.0, 0.1, "×",
        "Higher = more responsive gestures. Lower = more stable, less accidental.")}

      {/* Hold Duration */}
      {slider("Hold Duration", "holdDuration", 400, 1500, 50, "ms",
        "Time required to hold a gesture before it activates. Longer = fewer false triggers.")}

      {/* Stability Threshold */}
      {slider("Stability Threshold", "stabilityThreshold", 0.005, 0.05, 0.002, "",
        "Maximum allowed hand movement during hold. Lower = stricter stability requirement.")}

      {/* Pinch Threshold */}
      {slider("Pinch Distance", "pinchThreshold", 0.03, 0.12, 0.005, "",
        "Distance between thumb and index for pinch detection. Smaller = tighter pinch.")}

      {/* Min Confidence */}
      {slider("Min Confidence", "minConfidence", 30, 90, 5, "%",
        "Minimum detection confidence. Higher = more reliable but may miss gestures in poor lighting.")}

      {/* Preset buttons */}
      <div>
        <p className="mb-2" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#6b6890" }}>QUICK PRESETS</p>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { name: "Beginner", s: 0.8, h: 1200, st: 0.025 },
            { name: "Standard", s: 1.0, h: 900, st: 0.015 },
            { name: "Expert", s: 1.5, h: 600, st: 0.01 },
          ].map((preset) => (
            <button
              key={preset.name}
              onClick={() => setProfile((p) => ({
                ...p,
                sensitivity: preset.s,
                holdDuration: preset.h,
                stabilityThreshold: preset.st,
              }))}
              className="py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{
                background: "#141425",
                border: "1px solid rgba(124,58,237,0.1)",
                color: "#a0a0b8",
                fontFamily: "var(--font-family-display)",
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleReset}
          className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
          style={{
            background: "#141425",
            border: "1px solid rgba(124,58,237,0.1)",
            color: "#6b6890",
            fontFamily: "var(--font-family-display)",
          }}
        >
          Reset Defaults
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all hover:opacity-90"
          style={{
            background: saved ? "rgba(16,185,129,0.2)" : "linear-gradient(135deg, #7C3AED, #5b21b6)",
            border: saved ? "1px solid rgba(16,185,129,0.4)" : "none",
            color: saved ? "#10b981" : "white",
            fontFamily: "var(--font-family-display)",
          }}
        >
          {saved ? <><Check size={13} /> Saved!</> : "Apply Settings"}
        </button>
      </div>
    </div>
  );
}

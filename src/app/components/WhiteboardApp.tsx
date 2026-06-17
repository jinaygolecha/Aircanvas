import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  PenTool, Eraser, Square, Circle, Triangle, Minus, Type, Move,
  Undo2, Redo2, Trash2, Download, Share2, Brain, Mic, MicOff,
  Users, Video, VideoOff, ZoomIn, ZoomOut, Grid, Settings,
  ChevronRight, ChevronLeft, Sparkles, Send, X, Check,
  Layers, ArrowLeft, Maximize2, Home, BookOpen, FileText,
  RotateCcw, Image as ImageIcon, Palette, Bold, Italic,
  AlignLeft, AlignCenter, AlignRight, Copy, Scissors,
  Hand, Film, Cpu, Loader2, MonitorPlay,
} from "lucide-react";
import * as Gemini from "../lib/geminiService";
import { useRecording } from "../hooks/useRecording";
import { GesturePanel } from "./GesturePanel";
import { VideoOCRPanel } from "./VideoOCRPanel";
import { AIFeaturesPanel } from "./AIFeaturesPanel";
import { VideoNavigationPanel, type VideoNavRef } from "./VideoNavigationPanel";
import type { AirDrawEvent } from "../hooks/useGestureTracking";

type Tool = "pen" | "eraser" | "rect" | "circle" | "line" | "text" | "select" | "triangle";
type StrokePoint = { x: number; y: number };
type Stroke = {
  id: string;
  tool: Tool;
  points: StrokePoint[];
  color: string;
  width: number;
  text?: string;
  x?: number;
  y?: number;
};

const COLORS = [
  "#f0eefc", "#7C3AED", "#06B6D4", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#8b5cf6", "#3b82f6", "#a3e635",
];
const WIDTHS = [2, 4, 7, 12, 20];

const AI_RESPONSES: Record<string, string> = {
  "solve": "Sure! If you wrote a linear equation, I can solve it step by step.\n\nExample: 2x + 5 = 15\n→ 2x = 10\n→ x = 5\n\nI've added the solution to your canvas.",
  "diagram": "I've analyzed your sketch. Converting to a professional ER diagram...\n\nEntities detected: Student, Course, Enrollment\nRelationships: many-to-many\n\nDiagram generated on canvas!",
  "notes": "Session Notes Generated:\n\n1. Linear Equations\n   • Standard form: ax + b = c\n   • Solving steps shown\n\n2. Graphs\n   • Slope-intercept form\n\n3. Practice Problems (3 items)\n\nNotes saved to your account.",
  "quiz": "Quiz Generated — 5 Questions:\n\n1. Solve: 3x - 7 = 14\n2. Find slope of y = 2x + 3\n3. Graph y = -x + 5\n4. Solve: 4(x+2) = 24\n5. Word problem: Distance-speed\n\nQuiz copied to clipboard!",
  "explain": "Happy to explain! Which concept would you like me to clarify?\n\n• Linear equations\n• Quadratic equations\n• Graph interpretation\n• System of equations\n\nType the topic name to get a detailed explanation.",
  "clear": "Canvas cleared! Your session history is preserved — use Undo (Ctrl+Z) to restore.",
  "default": "I understand your query! Here's how I can assist:\n\n✦ Solve equations on canvas\n✦ Generate diagrams from sketches\n✦ Create quiz questions\n✦ Generate lecture notes\n✦ Explain concepts in detail\n\nWhat would you like to do?",
};

function getAIResponse(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("solve") || lower.includes("equation") || lower.includes("math")) return AI_RESPONSES.solve;
  if (lower.includes("diagram") || lower.includes("er") || lower.includes("uml") || lower.includes("sketch")) return AI_RESPONSES.diagram;
  if (lower.includes("note") || lower.includes("summary")) return AI_RESPONSES.notes;
  if (lower.includes("quiz") || lower.includes("question") || lower.includes("test")) return AI_RESPONSES.quiz;
  if (lower.includes("explain") || lower.includes("what is") || lower.includes("how")) return AI_RESPONSES.explain;
  if (lower.includes("clear")) return AI_RESPONSES.clear;
  return AI_RESPONSES.default;
}

// Pure utility — module scope, no component closure needed
function applyCatmullRom(pts: { x: number; y: number }[]): { x: number; y: number }[] {
  if (pts.length < 4) return pts;
  const out: { x: number; y: number }[] = [pts[0]];
  const tension = 0.5;
  const steps = 5;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1 = {
      x: p1.x + (p2.x - p0.x) * tension / 3,
      y: p1.y + (p2.y - p0.y) * tension / 3,
    };
    const cp2 = {
      x: p2.x - (p3.x - p1.x) * tension / 3,
      y: p2.y - (p3.y - p1.y) * tension / 3,
    };
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const mt = 1 - t;
      out.push({
        x: mt ** 3 * p1.x + 3 * mt ** 2 * t * cp1.x + 3 * mt * t ** 2 * cp2.x + t ** 3 * p2.x,
        y: mt ** 3 * p1.y + 3 * mt ** 2 * t * cp1.y + 3 * mt * t ** 2 * cp2.y + t ** 3 * p2.y,
      });
    }
  }
  return out;
}

export function WhiteboardApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#f0eefc");
  const [width, setWidth] = useState(4);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<StrokePoint[]>([]);
  const [aiOpen, setAiOpen] = useState(true);
  const [aiMessages, setAiMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "Hi! I'm your AI teaching assistant powered by Gemini. I can solve equations, generate diagrams, create quiz questions, and summarize your lecture content. What would you like to do?" },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [collaborators] = useState(["JG", "PS", "RM"]);
  const [showGrid, setShowGrid] = useState(true);
  const [boardName, setBoardName] = useState("Lecture Session — Linear Algebra");
  const [editingName, setEditingName] = useState(false);
  const startPointRef = useRef<StrokePoint | null>(null);
  const aiMessagesEndRef = useRef<HTMLDivElement>(null);

  // ── New feature panel state ────────────────────────────────────────────────
  const [gestureOpen, setGestureOpen] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [aiFeaturesOpen, setAiFeaturesOpen] = useState(false);
  const [videoNavOpen, setVideoNavOpen] = useState(false);
  const videoNavRef = useRef<VideoNavRef>(null);
  const [isAirWriting, setIsAirWriting] = useState(false);
  const airStrokeRef = useRef<StrokePoint[]>([]);
  const airStrokeActiveRef = useRef(false);
  const lastAirPosRef = useRef<StrokePoint | null>(null);

  // ── Recording ──────────────────────────────────────────────────────────────
  const { start: startRecording, stop: stopRecording, cancel: cancelRecording, hookState: recState } = useRecording(canvasRef as any);
  const recording = recState.state === "recording" || recState.state === "paused";
  const recordingDuration = recState.duration;

  const formatRecDuration = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const handleRecordToggle = async () => {
    if (!recording) {
      try {
        await startRecording(true);
        toast.success("Recording started");
      } catch (err: any) {
        toast.error("Recording failed: " + (err?.message ?? "Unknown error"));
      }
    } else {
      await stopRecording(`aircanvas-${boardName.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 30)}`);
      toast.success("Recording saved and downloaded");
    }
  };

  useEffect(() => {
    aiMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = "rgba(124,58,237,0.06)";
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    // Draw all strokes
    strokes.forEach((stroke) => {
      ctx.strokeStyle = stroke.tool === "eraser" ? "#07070e" : stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (stroke.tool === "pen" || stroke.tool === "eraser") {
        ctx.beginPath();
        stroke.points.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      } else if (stroke.tool === "rect" && stroke.points.length >= 2) {
        const [start, end] = [stroke.points[0], stroke.points[stroke.points.length - 1]];
        ctx.strokeStyle = stroke.color;
        ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      } else if (stroke.tool === "circle" && stroke.points.length >= 2) {
        const [start, end] = [stroke.points[0], stroke.points[stroke.points.length - 1]];
        const rx = Math.abs(end.x - start.x) / 2;
        const ry = Math.abs(end.y - start.y) / 2;
        ctx.beginPath();
        ctx.ellipse(start.x + (end.x - start.x) / 2, start.y + (end.y - start.y) / 2, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (stroke.tool === "line" && stroke.points.length >= 2) {
        const [start, end] = [stroke.points[0], stroke.points[stroke.points.length - 1]];
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      } else if (stroke.tool === "triangle" && stroke.points.length >= 2) {
        const [start, end] = [stroke.points[0], stroke.points[stroke.points.length - 1]];
        ctx.beginPath();
        ctx.moveTo((start.x + end.x) / 2, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.lineTo(start.x, end.y);
        ctx.closePath();
        ctx.stroke();
      } else if (stroke.tool === "text" && stroke.text) {
        ctx.fillStyle = stroke.color;
        ctx.font = `${stroke.width * 4}px 'Plus Jakarta Sans', sans-serif`;
        ctx.fillText(stroke.text, stroke.points[0]?.x ?? 100, stroke.points[0]?.y ?? 100);
      }
    });
  }, [strokes, showGrid]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        redrawCanvas();
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [redrawCanvas]);

  const getPos = (e: React.MouseEvent | React.TouchEvent): StrokePoint => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);
    setIsDrawing(true);
    startPointRef.current = pos;
    setCurrentStroke([pos]);

    if (tool === "text") {
      const text = prompt("Enter text:");
      if (text) {
        setStrokes((prev) => [
          ...prev,
          { id: crypto.randomUUID(), tool: "text", points: [pos], color, width, text },
        ]);
        setRedoStack([]);
      }
      setIsDrawing(false);
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const pos = getPos(e);

    if (tool === "pen" || tool === "eraser") {
      setCurrentStroke((prev) => [...prev, pos]);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;
      ctx.strokeStyle = tool === "eraser" ? "#07070e" : color;
      ctx.lineWidth = tool === "eraser" ? width * 3 : width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const pts = [...currentStroke, pos];
      if (pts.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
    } else {
      setCurrentStroke([startPointRef.current!, pos]);
      redrawCanvas();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.setLineDash([4, 4]);
      const start = startPointRef.current!;
      if (tool === "rect") {
        ctx.strokeRect(start.x, start.y, pos.x - start.x, pos.y - start.y);
      } else if (tool === "circle") {
        ctx.beginPath();
        ctx.ellipse(
          start.x + (pos.x - start.x) / 2, start.y + (pos.y - start.y) / 2,
          Math.abs(pos.x - start.x) / 2, Math.abs(pos.y - start.y) / 2,
          0, 0, Math.PI * 2
        );
        ctx.stroke();
      } else if (tool === "line") {
        ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
      } else if (tool === "triangle") {
        ctx.beginPath();
        ctx.moveTo((start.x + pos.x) / 2, start.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.lineTo(start.x, pos.y);
        ctx.closePath(); ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  };

  const handlePointerUp = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const pos = getPos(e);
    const finalPoints = tool === "pen" || tool === "eraser" ? currentStroke : [startPointRef.current!, pos];

    if (finalPoints.length > 1 || (finalPoints.length === 1 && (tool === "pen" || tool === "eraser"))) {
      setStrokes((prev) => [
        ...prev,
        { id: crypto.randomUUID(), tool, points: finalPoints, color, width },
      ]);
      setRedoStack([]);
    }
    setCurrentStroke([]);
  };

  const handleUndo = () => {
    setStrokes((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, last]);
      return prev.slice(0, -1);
    });
  };

  const handleRedo = () => {
    setRedoStack((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      setStrokes((s) => [...s, last]);
      return prev.slice(0, -1);
    });
  };

  const handleClear = () => {
    setStrokes([]);
    setRedoStack([]);
    toast.success("Canvas cleared");
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "aircanvas-session.png";
    link.href = canvas.toDataURL();
    link.click();
    toast.success("Canvas saved as PNG");
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Share link copied to clipboard");
  };

  // ── Gemini-powered AI chat ────────────────────────────────────────────────
  const sendAIMessage = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const userMsg = aiInput.trim();
    setAiMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setAiInput("");
    setAiLoading(true);

    try {
      const chatHistory = aiMessages.map((m) => ({
        role: m.role === "user" ? "user" as const : "assistant" as const,
        content: m.text,
      }));

      const response = await Gemini.chat(userMsg, chatHistory, {
        boardName,
        strokeCount: strokes.length,
        sessionType: "lecture",
      });
      setAiMessages((prev) => [...prev, { role: "ai", text: response }]);
    } catch {
      // Fallback to local responses
      const response = getAIResponse(userMsg);
      setAiMessages((prev) => [...prev, { role: "ai", text: response }]);
    } finally {
      setAiLoading(false);
    }
  };

  // ── Gesture activated callback ────────────────────────────────────────────
  const handleGestureActivated = useCallback((gesture: string) => {
    // When Video Navigation panel is open, route ALL gestures there instead
    if (videoNavOpen && videoNavRef.current) {
      videoNavRef.current.handleGesture(gesture);
      return;
    }

    switch (gesture) {
      case "THUMBS_UP":
        handleDownload();
        toast.success("👍 Thumbs Up — Session saved!");
        break;
      case "THREE_FINGER":
        handleUndo();
        toast.success("3 Fingers — Undo");
        break;
      case "FOUR_FINGER":
        handleRedo();
        toast.success("4 Fingers — Redo");
        break;
      case "CLOSED_FIST":
        setIsAirWriting(false);
        toast.info("✊ Fist — Drawing stopped");
        break;
      case "OPEN_PALM":
        toast.info("🤚 Open Palm — Tracking paused");
        break;
      case "PALM_CIRCLE":
        handleClear();
        toast.success("Circle — Board cleared!");
        break;
      case "PALM_HOLD":
        setAiFeaturesOpen(true);
        toast.success("🤚 Palm Hold — AI Assistant opened!");
        break;
      case "PINCH_HOLD":
        toast.info("🤏 Pinch Hold — Move object");
        break;
      case "SWIPE_LEFT":
        toast.info("👈 Swipe Left — Previous slide");
        break;
      case "SWIPE_RIGHT":
        toast.info("👉 Swipe Right — Next slide");
        break;
    }
  }, []);

  // ── Air writing (gesture draw) ─────────────────────────────────────────────
  // Live rendering uses quadratic Bezier mid-point technique (smooth curves).
  // On stroke commit, Catmull-Rom smoothing is applied for clean final strokes.

  const handleAirDraw = useCallback((event: AirDrawEvent) => {
    if (event.pressure === 0) {
      // Lift pen — commit with Catmull-Rom smoothing
      const raw = airStrokeRef.current;
      if (raw.length > 2) {
        // Apply Catmull-Rom to smooth the committed stroke
        const smoothed = raw.length >= 4 ? applyCatmullRom(raw) : raw;
        setStrokes((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            tool: "pen",
            points: smoothed,
            color,
            width: Math.max(3, width),
          },
        ]);
        setRedoStack([]);
        setIsAirWriting(false);
        // Redraw to replace live preview with clean committed stroke
        redrawCanvas();
      }
      airStrokeRef.current = [];
      airStrokeActiveRef.current = false;
      lastAirPosRef.current = null;
      return;
    }

    const pos = { x: event.x, y: event.y };

    if (event.isDown && !airStrokeActiveRef.current) {
      airStrokeActiveRef.current = true;
      airStrokeRef.current = [pos];
      setIsAirWriting(true);
    } else if (airStrokeActiveRef.current) {
      const pts = airStrokeRef.current;

      // Skip duplicate / micro-movement (already filtered by hook but double-guard)
      if (pts.length > 0) {
        const last = pts[pts.length - 1];
        const d = Math.sqrt((pos.x - last.x) ** 2 + (pos.y - last.y) ** 2);
        if (d < 1) return;
      }

      pts.push(pos);

      // Live drawing: quadratic Bezier mid-point technique for smooth curves
      const canvas = canvasRef.current;
      if (canvas && pts.length >= 3) {
        const ctx = canvas.getContext("2d")!;
        const strokeW = Math.max(3, width);
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeW;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const prev2 = pts[pts.length - 3];
        const prev1 = pts[pts.length - 2];
        const curr  = pts[pts.length - 1];

        // Control point at midpoint between prev2 and prev1
        const midX1 = (prev2.x + prev1.x) / 2;
        const midY1 = (prev2.y + prev1.y) / 2;
        // End point at midpoint between prev1 and curr
        const midX2 = (prev1.x + curr.x) / 2;
        const midY2 = (prev1.y + curr.y) / 2;

        ctx.beginPath();
        ctx.moveTo(midX1, midY1);
        ctx.quadraticCurveTo(prev1.x, prev1.y, midX2, midY2);
        ctx.stroke();
      } else if (canvas && pts.length === 2) {
        // First segment: simple line
        const ctx = canvas.getContext("2d")!;
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(3, width);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.stroke();
      }
    }
    lastAirPosRef.current = pos;
  }, [color, width, redrawCanvas]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); handleRedo(); }
      if (e.key === "p") setTool("pen");
      if (e.key === "e") setTool("eraser");
      if (e.key === "r") setTool("rect");
      if (e.key === "c") setTool("circle");
      if (e.key === "l") setTool("line");
      if (e.key === "t") setTool("text");
      if (e.key === "Escape") {
        setGestureOpen(false);
        setOcrOpen(false);
        setAiFeaturesOpen(false);
        setVideoNavOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo]);

  const TOOLS: { id: Tool; icon: any; label: string; key: string }[] = [
    { id: "pen", icon: PenTool, label: "Pen (P)", key: "P" },
    { id: "eraser", icon: Eraser, label: "Eraser (E)", key: "E" },
    { id: "select", icon: Move, label: "Select", key: "S" },
    { id: "rect", icon: Square, label: "Rectangle (R)", key: "R" },
    { id: "circle", icon: Circle, label: "Circle (C)", key: "C" },
    { id: "triangle", icon: Triangle, label: "Triangle", key: "T" },
    { id: "line", icon: Minus, label: "Line (L)", key: "L" },
    { id: "text", icon: Type, label: "Text (T)", key: "T" },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#07070e" }}>
      {/* Top Bar — existing UI unchanged, new buttons added after mic */}
      <div
        className="flex items-center gap-3 px-4 py-2 shrink-0"
        style={{ background: "#0b0b18", borderBottom: "1px solid rgba(124,58,237,0.12)", height: "52px" }}
      >
        <Link to="/" className="flex items-center gap-1.5 mr-2 hover:opacity-70 transition-opacity">
          <ArrowLeft size={15} style={{ color: "#6b6890" }} />
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)" }}>
            <PenTool size={12} className="text-white" />
          </div>
        </Link>

        {editingName ? (
          <input
            autoFocus
            className="px-2 py-1 rounded-lg text-sm outline-none"
            style={{ background: "#141425", border: "1px solid rgba(124,58,237,0.3)", color: "#f0eefc", fontFamily: "var(--font-family-display)", fontWeight: 600, minWidth: "300px" }}
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="text-sm font-semibold hover:opacity-70 transition-opacity max-w-xs truncate"
            style={{ fontFamily: "var(--font-family-display)", color: "#f0eefc" }}
          >
            {boardName}
          </button>
        )}

        <div className="flex items-center gap-1 ml-2">
          <button onClick={handleUndo} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors" title="Undo (Ctrl+Z)">
            <Undo2 size={15} style={{ color: "#6b6890" }} />
          </button>
          <button onClick={handleRedo} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors" title="Redo (Ctrl+Y)">
            <Redo2 size={15} style={{ color: "#6b6890" }} />
          </button>
          <button onClick={handleClear} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors" title="Clear canvas">
            <Trash2 size={15} style={{ color: "#6b6890" }} />
          </button>
        </div>

        <div className="w-px h-5 mx-1" style={{ background: "rgba(124,58,237,0.2)" }} />

        <button
          onClick={() => setShowGrid(!showGrid)}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ background: showGrid ? "rgba(124,58,237,0.2)" : "transparent", color: showGrid ? "#a78bfa" : "#6b6890" }}
          title="Toggle Grid"
        >
          <Grid size={15} />
        </button>

        <div className="ml-auto flex items-center gap-3">
          {/* Collaborators */}
          <div className="flex -space-x-2">
            {collaborators.map((c, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white border-2 text-xs font-bold"
                style={{ background: ["#7C3AED", "#06B6D4", "#10b981"][i], borderColor: "#0b0b18", fontFamily: "var(--font-family-display)", fontSize: "0.6rem" }}
              >
                {c}
              </div>
            ))}
          </div>

          {/* Recording button — now uses real RecordingEngine */}
          <button
            onClick={handleRecordToggle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: recording ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${recording ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}`,
              color: recording ? "#ef4444" : "#6b6890",
              fontFamily: "var(--font-family-mono)",
            }}
          >
            {recording
              ? <><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> {formatRecDuration(recordingDuration)}</>
              : <><Video size={12} /> Record</>
            }
          </button>

          {/* Mic button */}
          <button
            onClick={() => setMicActive(!micActive)}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: micActive ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)", color: micActive ? "#a78bfa" : "#6b6890" }}
            title="Voice Control"
          >
            {micActive ? <Mic size={15} /> : <MicOff size={15} />}
          </button>

          {/* ── NEW: Gesture Control button ── */}
          <button
            onClick={() => setGestureOpen(!gestureOpen)}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
            title="Gesture Control (MediaPipe)"
            style={{
              background: gestureOpen ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.04)",
              color: gestureOpen ? "#10b981" : "#6b6890",
              border: gestureOpen ? "1px solid rgba(16,185,129,0.3)" : "1px solid transparent",
            }}
          >
            <Hand size={15} />
          </button>

          {/* Air writing indicator */}
          {isAirWriting && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#a78bfa" }}>AIR WRITING</span>
            </div>
          )}

          {/* ── Video OCR button ── */}
          <button
            onClick={() => setOcrOpen(!ocrOpen)}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
            title="Video OCR Intelligence"
            style={{
              background: ocrOpen ? "rgba(6,182,212,0.2)" : "rgba(255,255,255,0.04)",
              color: ocrOpen ? "#06B6D4" : "#6b6890",
              border: ocrOpen ? "1px solid rgba(6,182,212,0.3)" : "1px solid transparent",
            }}
          >
            <Film size={15} />
          </button>

          {/* ── AI Video Navigation button ── */}
          <button
            onClick={() => setVideoNavOpen(!videoNavOpen)}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
            title="AI Video Navigation (Gesture Control)"
            style={{
              background: videoNavOpen ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.04)",
              color: videoNavOpen ? "#a78bfa" : "#6b6890",
              border: videoNavOpen ? "1px solid rgba(124,58,237,0.4)" : "1px solid transparent",
            }}
          >
            <MonitorPlay size={15} />
          </button>

          {/* ── NEW: AI Features button ── */}
          <button
            onClick={() => setAiFeaturesOpen(!aiFeaturesOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            title="AI Features (Gemini)"
            style={{
              background: aiFeaturesOpen ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${aiFeaturesOpen ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.06)"}`,
              color: aiFeaturesOpen ? "#a78bfa" : "#6b6890",
              fontFamily: "var(--font-family-display)",
            }}
          >
            <Cpu size={12} /> AI
          </button>

          <div className="w-px h-5" style={{ background: "rgba(124,58,237,0.15)" }} />

          <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa", fontFamily: "var(--font-family-display)" }}>
            <Share2 size={12} /> Share
          </button>

          <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{ background: "#7C3AED", color: "white", fontFamily: "var(--font-family-display)" }}>
            <Download size={12} /> Save
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Toolbar */}
        <div
          className="flex flex-col items-center gap-1 py-4 px-2 shrink-0"
          style={{ background: "#0b0b18", borderRight: "1px solid rgba(124,58,237,0.1)", width: "56px" }}
        >
          {TOOLS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTool(id)}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
              title={label}
              style={{
                background: tool === id ? "rgba(124,58,237,0.25)" : "transparent",
                color: tool === id ? "#a78bfa" : "#6b6890",
                border: tool === id ? "1px solid rgba(124,58,237,0.4)" : "1px solid transparent",
              }}
            >
              <Icon size={16} />
            </button>
          ))}

          <div className="w-8 h-px my-2" style={{ background: "rgba(124,58,237,0.15)" }} />

          {/* Color swatches */}
          {COLORS.slice(0, 5).map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-7 h-7 rounded-lg transition-all"
              style={{
                background: c,
                border: color === c ? "2px solid white" : "2px solid transparent",
                outline: color === c ? "1px solid rgba(124,58,237,0.5)" : "none",
                outlineOffset: "2px",
              }}
            />
          ))}

          <div className="w-8 h-px my-2" style={{ background: "rgba(124,58,237,0.15)" }} />

          {/* Brush sizes */}
          {WIDTHS.map((w) => (
            <button
              key={w}
              onClick={() => setWidth(w)}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
              style={{
                background: width === w ? "rgba(124,58,237,0.15)" : "transparent",
                border: width === w ? "1px solid rgba(124,58,237,0.3)" : "1px solid transparent",
              }}
            >
              <div className="rounded-full" style={{ width: Math.min(w * 2, 18), height: Math.min(w * 2, 18), background: color, minWidth: 3, minHeight: 3 }} />
            </button>
          ))}

          <div className="w-8 h-px my-2" style={{ background: "rgba(124,58,237,0.15)" }} />

          <button
            onClick={() => setAiOpen(!aiOpen)}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
            title="AI Assistant"
            style={{
              background: aiOpen ? "rgba(124,58,237,0.25)" : "transparent",
              color: aiOpen ? "#a78bfa" : "#6b6890",
              border: aiOpen ? "1px solid rgba(124,58,237,0.4)" : "1px solid transparent",
            }}
          >
            <Brain size={16} />
          </button>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden" style={{ background: "#07070e" }}>
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ cursor: tool === "eraser" ? "cell" : tool === "text" ? "text" : tool === "select" ? "default" : "crosshair", touchAction: "none" }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          />

          {/* Canvas hint */}
          {strokes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div style={{ color: "rgba(124,58,237,0.2)", fontSize: "3rem" }}>✦</div>
                <p style={{ fontFamily: "var(--font-family-display)", color: "rgba(240,238,252,0.12)", fontSize: "1rem", marginTop: "12px" }}>
                  Start drawing, or ask the AI assistant
                </p>
                <p style={{ fontFamily: "var(--font-family-mono)", color: "rgba(107,104,144,0.5)", fontSize: "0.7rem", marginTop: "6px" }}>
                  P · Pen   E · Eraser   R · Rect   C · Circle   T · Text   Hand · Gesture Mode
                </p>
              </div>
            </div>
          )}

          {/* Bottom color palette */}
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-2xl"
            style={{ background: "rgba(11,11,24,0.95)", border: "1px solid rgba(124,58,237,0.15)", backdropFilter: "blur(10px)" }}
          >
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="rounded-full transition-all hover:scale-110"
                style={{
                  width: color === c ? 22 : 18,
                  height: color === c ? 22 : 18,
                  background: c,
                  border: color === c ? "2px solid rgba(255,255,255,0.8)" : "2px solid transparent",
                  outline: color === c ? "1px solid rgba(124,58,237,0.4)" : "none",
                  outlineOffset: "1px",
                }}
              />
            ))}
          </div>

          {/* Stroke counter */}
          <div
            className="absolute top-3 left-3 px-2 py-1 rounded-lg"
            style={{ background: "rgba(11,11,24,0.8)", border: "1px solid rgba(124,58,237,0.1)" }}
          >
            <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", color: "#4a4a6a" }}>
              {strokes.length} stroke{strokes.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Gesture mode indicator */}
          {gestureOpen && (
            <div
              className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}
            >
              <Hand size={12} style={{ color: "#10b981" }} />
              <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", color: "#10b981" }}>
                GESTURE MODE
              </span>
            </div>
          )}
        </div>

        {/* AI Panel — existing, unchanged */}
        {aiOpen && (
          <div
            className="flex flex-col shrink-0"
            style={{ width: "320px", background: "#0b0b18", borderLeft: "1px solid rgba(124,58,237,0.12)" }}
          >
            {/* Panel header */}
            <div
              className="flex items-center gap-3 px-4 py-3 shrink-0"
              style={{ borderBottom: "1px solid rgba(124,58,237,0.1)" }}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(124,58,237,0.2)" }}>
                <Brain size={14} style={{ color: "#a78bfa" }} />
              </div>
              <span style={{ fontFamily: "var(--font-family-display)", fontWeight: 600, color: "#f0eefc", fontSize: "0.9rem" }}>AI Assistant</span>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: Gemini.isGeminiConfigured() ? "#10b981" : "#f59e0b" }} />
                <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: Gemini.isGeminiConfigured() ? "#10b981" : "#f59e0b" }}>
                  {Gemini.isGeminiConfigured() ? "Gemini" : "Demo"}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="px-3 py-3 flex flex-wrap gap-1.5 shrink-0" style={{ borderBottom: "1px solid rgba(124,58,237,0.08)" }}>
              {[
                { label: "Solve Equation", q: "Solve the equation on my canvas" },
                { label: "Generate Diagram", q: "Convert my sketch to a diagram" },
                { label: "Create Quiz", q: "Generate quiz questions for this topic" },
                { label: "Auto Notes", q: "Generate notes from this session" },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => {
                    setAiInput(action.q);
                    setTimeout(() => {
                      setAiMessages((prev) => [...prev, { role: "user", text: action.q }]);
                      setAiInput("");
                      setAiLoading(true);
                      Gemini.chat(action.q, [], { boardName, strokeCount: strokes.length })
                        .then((r) => setAiMessages((prev) => [...prev, { role: "ai", text: r }]))
                        .catch(() => setAiMessages((prev) => [...prev, { role: "ai", text: getAIResponse(action.q) }]))
                        .finally(() => setAiLoading(false));
                    }, 100);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
                  style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)", color: "#a78bfa", fontFamily: "var(--font-family-display)" }}
                >
                  {action.label}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ scrollbarWidth: "none" }}>
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "ai" && (
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(124,58,237,0.2)" }}>
                      <Brain size={11} style={{ color: "#a78bfa" }} />
                    </div>
                  )}
                  <div
                    className="px-3 py-2.5 rounded-xl max-w-[220px] text-xs whitespace-pre-line"
                    style={{
                      background: msg.role === "ai" ? "rgba(124,58,237,0.1)" : "rgba(6,182,212,0.1)",
                      border: `1px solid ${msg.role === "ai" ? "rgba(124,58,237,0.2)" : "rgba(6,182,212,0.2)"}`,
                      color: msg.role === "ai" ? "#c4bff5" : "#a0a0b8",
                      fontFamily: "var(--font-family-body)",
                      lineHeight: 1.6,
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,0.2)" }}>
                    <Brain size={11} style={{ color: "#a78bfa" }} />
                  </div>
                  <div className="px-3 py-2.5 rounded-xl" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
                    <Loader2 size={12} className="animate-spin" style={{ color: "#a78bfa" }} />
                  </div>
                </div>
              )}
              <div ref={aiMessagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 pb-3 pt-2 shrink-0" style={{ borderTop: "1px solid rgba(124,58,237,0.08)" }}>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                  placeholder="Ask the AI..."
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendAIMessage()}
                  style={{ background: "#141425", border: "1px solid rgba(124,58,237,0.15)", color: "#f0eefc", fontFamily: "var(--font-family-body)" }}
                />
                <button
                  onClick={sendAIMessage}
                  disabled={aiLoading}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:opacity-80 disabled:opacity-40"
                  style={{ background: "#7C3AED", color: "white" }}
                >
                  {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={13} />}
                </button>
              </div>
              <p className="mt-2 text-center" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#4a4a6a" }}>
                AirCanvas AI · {Gemini.isGeminiConfigured() ? "Gemini 1.5 Flash" : "Add VITE_GEMINI_API_KEY"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── NEW OVERLAY PANELS — rendered on top, don't affect existing layout ── */}

      {gestureOpen && (
        <GesturePanel
          onClose={() => setGestureOpen(false)}
          canvasRef={canvasRef as any}
          onGestureActivated={handleGestureActivated}
          onAirDraw={handleAirDraw}
        />
      )}

      {ocrOpen && (
        <VideoOCRPanel
          onClose={() => setOcrOpen(false)}
          boardContext={{ boardName, subject: "Education" }}
        />
      )}

      {aiFeaturesOpen && (
        <AIFeaturesPanel
          onClose={() => setAiFeaturesOpen(false)}
          boardContext={{
            boardName,
            strokeCount: strokes.length,
            sessionType: "lecture",
          }}
          canvasContent={`Board: "${boardName}" with ${strokes.length} drawn elements.`}
        />
      )}

      {videoNavOpen && (
        <VideoNavigationPanel
          ref={videoNavRef}
          onClose={() => setVideoNavOpen(false)}
        />
      )}
    </div>
  );
}

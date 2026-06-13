/**
 * AIFeaturesPanel — Gemini-powered AI content generation hub.
 *
 * Tabs:
 *   Chat      — Context-aware educational chatbot
 *   Math      — Equation recognition, LaTeX, step-by-step solver
 *   Notes     — AI lecture notes from session content
 *   Quiz      — AI quiz generation
 *   Assignment — AI assignment generation
 *   Diagram   — AI diagram generation (ER, UML, Flowchart)
 *   Flashcards — AI flashcard generation
 *   LessonPlan — AI lesson planner
 */

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  X, Brain, Send, Loader2, Copy, Download, RefreshCw, ChevronDown, ChevronUp,
  FileText, Zap, BookOpen, Layout, Calculator, MessageSquare, Sparkles, Check,
} from "lucide-react";
import * as Gemini from "../lib/geminiService";
import { exportNotesAsText } from "../lib/recordingEngine";
import type { BoardContext, ChatMessage } from "../lib/geminiService";

type AITab = "chat" | "math" | "notes" | "quiz" | "assignment" | "diagram" | "flashcards" | "lesson";

const GEMINI_STATUS = Gemini.getGeminiStatus();

const TAB_LIST: { id: AITab; label: string; icon: any; color: string }[] = [
  { id: "chat", label: "Chat", icon: MessageSquare, color: "#7C3AED" },
  { id: "math", label: "Math", icon: Calculator, color: "#06B6D4" },
  { id: "notes", label: "Notes", icon: FileText, color: "#10b981" },
  { id: "quiz", label: "Quiz", icon: Brain, color: "#f59e0b" },
  { id: "assignment", label: "Assignment", icon: BookOpen, color: "#ec4899" },
  { id: "diagram", label: "Diagram", icon: Layout, color: "#8b5cf6" },
  { id: "flashcards", label: "Flashcards", icon: Zap, color: "#06B6D4" },
  { id: "lesson", label: "Lesson Plan", icon: Sparkles, color: "#10b981" },
];

interface AIFeaturesPanelProps {
  onClose: () => void;
  boardContext: BoardContext;
  canvasContent?: string; // Description of what's on the canvas
}

export function AIFeaturesPanel({ onClose, boardContext, canvasContent }: AIFeaturesPanelProps) {
  const [activeTab, setActiveTab] = useState<AITab>("chat");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [flashcards, setFlashcards] = useState<Array<{ front: string; back: string; category: string }>>([]);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [mathResult, setMathResult] = useState<any>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Form states
  const [mathInput, setMathInput] = useState("");
  const [quizOptions, setQuizOptions] = useState({ count: 10, difficulty: "medium", subject: "" });
  const [diagramInput, setDiagramInput] = useState("");
  const [diagramType, setDiagramType] = useState<"ER" | "UML" | "Flowchart" | "MindMap" | "SystemDesign">("Flowchart");
  const [lessonForm, setLessonForm] = useState({ topic: "", duration: "60 minutes", grade: "Undergraduate" });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const ctx: BoardContext = {
    ...boardContext,
    content: canvasContent,
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const downloadOutput = (filename: string) => {
    exportNotesAsText(output, filename);
    toast.success(`Downloaded ${filename}`);
  };

  // ── Chat ──────────────────────────────────────────────────────────────────────
  const sendChat = async () => {
    if (!chatInput.trim() || loading) return;
    const msg = chatInput.trim();
    setChatInput("");
    const userMsg: ChatMessage = { role: "user", content: msg };
    setChatMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const response = await Gemini.chat(msg, chatMessages, ctx);
      setChatMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } catch (err: any) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err?.message ?? "Failed to get response"}` }]);
    } finally {
      setLoading(false);
    }
  };

  // ── Math Solver ───────────────────────────────────────────────────────────────
  const solveMath = async () => {
    if (!mathInput.trim() || loading) return;
    setLoading(true);
    setMathResult(null);
    try {
      const result = await Gemini.recognizeMath(mathInput, ctx);
      setMathResult(result);
    } catch (err: any) {
      toast.error(err?.message ?? "Math recognition failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Generic generators ────────────────────────────────────────────────────────
  const runGenerator = async (fn: () => Promise<string>) => {
    setLoading(true);
    setOutput("");
    try {
      const result = await fn();
      setOutput(result);
    } catch (err: any) {
      toast.error(err?.message ?? "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const generateNotes = () => runGenerator(() =>
    Gemini.generateNotes(canvasContent ?? `Session: ${boardContext.boardName}`, ctx)
  );

  const generateQuiz = () => runGenerator(() =>
    Gemini.generateQuiz(canvasContent ?? `Topic: ${boardContext.boardName}`, ctx, {
      questionCount: quizOptions.count,
      difficulty: quizOptions.difficulty,
    })
  );

  const generateAssignment = () => runGenerator(() =>
    Gemini.generateAssignment(canvasContent ?? `Topic: ${boardContext.boardName}`, ctx)
  );

  const generateDiagram = async () => {
    setLoading(true);
    setOutput("");
    try {
      const result = await Gemini.generateDiagram(diagramInput, diagramType);
      const formatted = [
        `# ${diagramType} Diagram: ${diagramInput}`,
        "",
        result.description,
        "",
        "## Entities / Components",
        ...(result.entities || []).map((e: string) => `• ${e}`),
        "",
        "## Relationships",
        ...(result.relationships || []).map((r: string) => `→ ${r}`),
        "",
        "## Drawing Instructions",
        result.canvasInstructions,
        result.mermaidCode ? `\n## Mermaid Code\n\`\`\`\n${result.mermaidCode}\n\`\`\`` : "",
      ].join("\n");
      setOutput(formatted);
    } catch (err: any) {
      toast.error(err?.message ?? "Diagram generation failed");
    } finally {
      setLoading(false);
    }
  };

  const generateFlashcards = async () => {
    setLoading(true);
    setFlashcards([]);
    try {
      const result = await Gemini.generateFlashcards(canvasContent ?? `Topic: ${boardContext.boardName}`, ctx);
      setFlashcards(result);
    } catch (err: any) {
      toast.error(err?.message ?? "Flashcard generation failed");
    } finally {
      setLoading(false);
    }
  };

  const generateLessonPlan = () => runGenerator(() =>
    Gemini.generateLessonPlan(lessonForm.topic || boardContext.boardName || "Topic", lessonForm.duration, lessonForm.grade, ctx)
  );

  const activeTabData = TAB_LIST.find((t) => t.id === activeTab)!;

  return (
    <div
      className="fixed z-50 flex flex-col"
      style={{
        top: "60px",
        right: "16px",
        width: "min(480px, 95vw)",
        maxHeight: "calc(100vh - 80px)",
        background: "#0b0b18",
        border: "1px solid rgba(124,58,237,0.25)",
        borderRadius: "16px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 shrink-0" style={{ borderBottom: "1px solid rgba(124,58,237,0.1)" }}>
        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: `${activeTabData.color}20` }}>
          <Brain size={14} style={{ color: activeTabData.color }} />
        </div>
        <span style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, color: "#f0eefc", fontSize: "0.95rem" }}>
          AI Features
        </span>

        {/* Gemini status */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{
          background: GEMINI_STATUS.configured ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
          border: `1px solid ${GEMINI_STATUS.configured ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
        }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: GEMINI_STATUS.configured ? "#10b981" : "#f59e0b" }} />
          <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.58rem", color: GEMINI_STATUS.configured ? "#10b981" : "#f59e0b" }}>
            {GEMINI_STATUS.configured ? "Gemini ✓" : "Demo Mode"}
          </span>
        </div>

        <button onClick={onClose} className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#6b6890" }}>
          <X size={15} />
        </button>
      </div>

      {!GEMINI_STATUS.configured && (
        <div className="px-4 py-2 flex items-center gap-2" style={{ background: "rgba(245,158,11,0.06)", borderBottom: "1px solid rgba(245,158,11,0.1)" }}>
          <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", color: "#f59e0b" }}>
            Add VITE_GEMINI_API_KEY to .env.local for full AI capabilities
          </span>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex overflow-x-auto shrink-0" style={{ borderBottom: "1px solid rgba(124,58,237,0.1)", scrollbarWidth: "none" }}>
        {TAB_LIST.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id); setOutput(""); setMathResult(null); }}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
            style={{
              fontFamily: "var(--font-family-display)",
              color: activeTab === id ? color : "#6b6890",
              borderBottom: activeTab === id ? `2px solid ${color}` : "2px solid transparent",
              background: "transparent",
            }}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>

        {/* ── Chat Tab ──────────────────────────────────────────────────────────── */}
        {activeTab === "chat" && (
          <div className="flex flex-col h-full" style={{ minHeight: "400px" }}>
            <div className="flex-1 px-4 py-3 space-y-3" style={{ overflowY: "auto", scrollbarWidth: "none" }}>
              {chatMessages.length === 0 && (
                <div className="text-center py-8">
                  <Brain size={32} style={{ color: "rgba(124,58,237,0.3)", margin: "0 auto 12px" }} />
                  <p style={{ fontFamily: "var(--font-family-display)", color: "#6b6890", fontSize: "0.9rem" }}>
                    Ask me anything about your lesson
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {[
                      "Explain this concept",
                      "Give me an example",
                      "What's the formula for?",
                      "Create a summary",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => { setChatInput(q); }}
                        className="px-3 py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
                        style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", color: "#a78bfa", fontFamily: "var(--font-family-display)" }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(124,58,237,0.2)" }}>
                      <Brain size={11} style={{ color: "#a78bfa" }} />
                    </div>
                  )}
                  <div
                    className="px-3 py-2.5 rounded-xl max-w-[85%] text-sm whitespace-pre-wrap"
                    style={{
                      background: msg.role === "assistant" ? "rgba(124,58,237,0.1)" : "rgba(6,182,212,0.1)",
                      border: `1px solid ${msg.role === "assistant" ? "rgba(124,58,237,0.2)" : "rgba(6,182,212,0.2)"}`,
                      color: "#c4bff5",
                      fontFamily: "var(--font-family-body)",
                      lineHeight: 1.6,
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && activeTab === "chat" && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,0.2)" }}>
                    <Brain size={11} style={{ color: "#a78bfa" }} />
                  </div>
                  <div className="px-3 py-2.5 rounded-xl" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
                    <Loader2 size={14} className="animate-spin" style={{ color: "#a78bfa" }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="px-4 py-3 shrink-0" style={{ borderTop: "1px solid rgba(124,58,237,0.08)" }}>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
                  placeholder="Ask the AI about your lesson..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()}
                  style={{ background: "#141425", border: "1px solid rgba(124,58,237,0.15)", color: "#f0eefc", fontFamily: "var(--font-family-body)" }}
                />
                <button
                  onClick={sendChat}
                  disabled={loading || !chatInput.trim()}
                  className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:opacity-80 disabled:opacity-40"
                  style={{ background: "#7C3AED", color: "white" }}
                >
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Math Tab ──────────────────────────────────────────────────────────── */}
        {activeTab === "math" && (
          <div className="p-4 space-y-4">
            <div>
              <label style={{ fontFamily: "var(--font-family-display)", fontSize: "0.8rem", color: "#c4bff5", display: "block", marginBottom: "6px" }}>
                Enter equation or math expression
              </label>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
                  placeholder="e.g. 2x + 5 = 15  or  ∫x²dx  or  x² + y² = r²"
                  value={mathInput}
                  onChange={(e) => setMathInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && solveMath()}
                  style={{ background: "#141425", border: "1px solid rgba(6,182,212,0.2)", color: "#f0eefc", fontFamily: "var(--font-family-mono)" }}
                />
                <button
                  onClick={solveMath}
                  disabled={loading || !mathInput.trim()}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-all hover:opacity-80 disabled:opacity-40"
                  style={{ background: "#06B6D4", color: "#07070e", fontFamily: "var(--font-family-display)" }}
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <><Calculator size={14} /> Solve</>}
                </button>
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {["2x + 5 = 15", "x² + 3x + 2 = 0", "∫x²dx", "sin²(x) + cos²(x)", "det([[1,2],[3,4]])"].map((ex) => (
                  <button key={ex} onClick={() => setMathInput(ex)}
                    className="px-2 py-1 rounded-lg text-xs" style={{ background: "#141425", border: "1px solid rgba(6,182,212,0.1)", color: "#6b6890", fontFamily: "var(--font-family-mono)" }}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {mathResult && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl" style={{ background: "#141425", border: "1px solid rgba(6,182,212,0.15)" }}>
                  <p className="mb-1" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#6b6890" }}>RECOGNIZED</p>
                  <p style={{ fontFamily: "var(--font-family-mono)", color: "#06B6D4", fontSize: "1rem" }}>{mathResult.original}</p>
                  {mathResult.latex && (
                    <>
                      <p className="mt-2 mb-1" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#6b6890" }}>LATEX</p>
                      <p style={{ fontFamily: "var(--font-family-mono)", color: "#a78bfa", fontSize: "0.85rem" }}>{mathResult.latex}</p>
                    </>
                  )}
                  <p className="mt-2 mb-1" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#6b6890" }}>SOLUTION</p>
                  <p style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, color: "#10b981", fontSize: "1.1rem" }}>{mathResult.solution}</p>
                </div>

                {mathResult.steps?.length > 0 && (
                  <div className="p-4 rounded-xl" style={{ background: "#141425", border: "1px solid rgba(124,58,237,0.1)" }}>
                    <p className="mb-3" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#6b6890" }}>STEP-BY-STEP</p>
                    {mathResult.steps.map((step: string, i: number) => (
                      <div key={i} className="flex gap-3 mb-2">
                        <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.7rem", color: "#7C3AED", minWidth: "20px" }}>{i + 1}.</span>
                        <p style={{ fontFamily: "var(--font-family-body)", color: "#c4bff5", fontSize: "0.82rem", lineHeight: 1.5 }}>{step}</p>
                      </div>
                    ))}
                  </div>
                )}

                {mathResult.explanation && (
                  <div className="p-4 rounded-xl" style={{ background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.1)" }}>
                    <p className="mb-2" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#6b6890" }}>EXPLANATION</p>
                    <p style={{ fontFamily: "var(--font-family-body)", color: "#a0a0b8", fontSize: "0.82rem", lineHeight: 1.6 }}>{mathResult.explanation}</p>
                  </div>
                )}

                {mathResult.practiceQuestions?.length > 0 && (
                  <div className="p-4 rounded-xl" style={{ background: "#141425", border: "1px solid rgba(124,58,237,0.1)" }}>
                    <p className="mb-2" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#6b6890" }}>PRACTICE QUESTIONS</p>
                    {mathResult.practiceQuestions.map((q: string, i: number) => (
                      <p key={i} className="mb-1" style={{ fontFamily: "var(--font-family-body)", color: "#c4bff5", fontSize: "0.82rem" }}>
                        {i + 1}. {q}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Notes Tab ─────────────────────────────────────────────────────────── */}
        {activeTab === "notes" && (
          <div className="p-4 space-y-4">
            <div className="p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
              <p style={{ fontFamily: "var(--font-family-body)", color: "#6effd0", fontSize: "0.8rem" }}>
                Generates structured lecture notes from your current board content and session topic.
              </p>
            </div>
            <button onClick={generateNotes} disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "white", fontFamily: "var(--font-family-display)" }}>
              {loading ? <><Loader2 size={15} className="animate-spin" /> Generating Notes...</> : <><FileText size={15} /> Generate Lecture Notes</>}
            </button>
            {output && <OutputSection output={output} onCopy={copyToClipboard} onDownload={() => downloadOutput("lecture-notes.txt")} />}
          </div>
        )}

        {/* ── Quiz Tab ──────────────────────────────────────────────────────────── */}
        {activeTab === "quiz" && (
          <div className="p-4 space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label style={{ fontFamily: "var(--font-family-display)", fontSize: "0.75rem", color: "#c4bff5", display: "block", marginBottom: "4px" }}>Questions</label>
                  <select
                    value={quizOptions.count}
                    onChange={(e) => setQuizOptions((p) => ({ ...p, count: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "#141425", border: "1px solid rgba(124,58,237,0.15)", color: "#f0eefc", fontFamily: "var(--font-family-body)" }}
                  >
                    {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n} Questions</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label style={{ fontFamily: "var(--font-family-display)", fontSize: "0.75rem", color: "#c4bff5", display: "block", marginBottom: "4px" }}>Difficulty</label>
                  <select
                    value={quizOptions.difficulty}
                    onChange={(e) => setQuizOptions((p) => ({ ...p, difficulty: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "#141425", border: "1px solid rgba(124,58,237,0.15)", color: "#f0eefc", fontFamily: "var(--font-family-body)" }}
                  >
                    {["easy", "medium", "hard", "mixed"].map((d) => <option key={d} value={d} className="capitalize">{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <button onClick={generateQuiz} disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#07070e", fontFamily: "var(--font-family-display)" }}>
              {loading ? <><Loader2 size={15} className="animate-spin" /> Generating Quiz...</> : <><Brain size={15} /> Generate Quiz</>}
            </button>
            {output && <OutputSection output={output} onCopy={copyToClipboard} onDownload={() => downloadOutput("quiz.txt")} />}
          </div>
        )}

        {/* ── Assignment Tab ────────────────────────────────────────────────────── */}
        {activeTab === "assignment" && (
          <div className="p-4 space-y-4">
            <button onClick={generateAssignment} disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #ec4899, #be185d)", color: "white", fontFamily: "var(--font-family-display)" }}>
              {loading ? <><Loader2 size={15} className="animate-spin" /> Generating...</> : <><BookOpen size={15} /> Generate Assignment</>}
            </button>
            {output && <OutputSection output={output} onCopy={copyToClipboard} onDownload={() => downloadOutput("assignment.txt")} />}
          </div>
        )}

        {/* ── Diagram Tab ───────────────────────────────────────────────────────── */}
        {activeTab === "diagram" && (
          <div className="p-4 space-y-4">
            <div className="space-y-3">
              <div>
                <label style={{ fontFamily: "var(--font-family-display)", fontSize: "0.75rem", color: "#c4bff5", display: "block", marginBottom: "4px" }}>Diagram Type</label>
                <div className="flex flex-wrap gap-2">
                  {(["ER", "UML", "Flowchart", "MindMap", "SystemDesign"] as const).map((t) => (
                    <button key={t} onClick={() => setDiagramType(t)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: diagramType === t ? "rgba(139,92,246,0.2)" : "#141425",
                        border: `1px solid ${diagramType === t ? "rgba(139,92,246,0.4)" : "rgba(124,58,237,0.1)"}`,
                        color: diagramType === t ? "#c4b5fd" : "#6b6890",
                        fontFamily: "var(--font-family-display)",
                      }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontFamily: "var(--font-family-display)", fontSize: "0.75rem", color: "#c4bff5", display: "block", marginBottom: "4px" }}>Describe your diagram</label>
                <textarea
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                  placeholder="e.g. Hospital Management System with Patient, Doctor, Appointment, Ward entities"
                  rows={3}
                  value={diagramInput}
                  onChange={(e) => setDiagramInput(e.target.value)}
                  style={{ background: "#141425", border: "1px solid rgba(139,92,246,0.2)", color: "#f0eefc", fontFamily: "var(--font-family-body)" }}
                />
              </div>
            </div>
            <button onClick={generateDiagram} disabled={loading || !diagramInput.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "white", fontFamily: "var(--font-family-display)" }}>
              {loading ? <><Loader2 size={15} className="animate-spin" /> Generating Diagram...</> : <><Layout size={15} /> Generate {diagramType} Diagram</>}
            </button>
            {output && <OutputSection output={output} onCopy={copyToClipboard} onDownload={() => downloadOutput(`${diagramType.toLowerCase()}-diagram.txt`)} />}
          </div>
        )}

        {/* ── Flashcards Tab ────────────────────────────────────────────────────── */}
        {activeTab === "flashcards" && (
          <div className="p-4 space-y-4">
            <button onClick={generateFlashcards} disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #06B6D4, #0891b2)", color: "#07070e", fontFamily: "var(--font-family-display)" }}>
              {loading ? <><Loader2 size={15} className="animate-spin" /> Generating...</> : <><Zap size={15} /> Generate Flashcards</>}
            </button>
            {flashcards.length > 0 && (
              <div className="space-y-2">
                <p style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.6rem", color: "#6b6890" }}>{flashcards.length} CARDS — Click to flip</p>
                {flashcards.map((card, i) => (
                  <div key={i} className="rounded-xl overflow-hidden cursor-pointer" style={{ border: "1px solid rgba(6,182,212,0.1)" }}
                    onClick={() => setExpandedCard(expandedCard === i ? null : i)}>
                    <div className="flex items-start gap-3 p-3 hover:bg-white/[0.02]">
                      <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", color: "#06B6D4", minWidth: "24px" }}>Q{i + 1}</span>
                      <div className="flex-1">
                        <p style={{ fontFamily: "var(--font-family-body)", color: "#f0eefc", fontSize: "0.85rem" }}>{card.front}</p>
                        {expandedCard === i && (
                          <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(6,182,212,0.1)" }}>
                            <p style={{ fontFamily: "var(--font-family-body)", color: "#06B6D4", fontSize: "0.82rem" }}>{card.back}</p>
                          </div>
                        )}
                      </div>
                      {expandedCard === i ? <ChevronUp size={13} style={{ color: "#6b6890" }} /> : <ChevronDown size={13} style={{ color: "#6b6890" }} />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Lesson Plan Tab ───────────────────────────────────────────────────── */}
        {activeTab === "lesson" && (
          <div className="p-4 space-y-4">
            <div className="space-y-3">
              {[
                { key: "topic", label: "Topic", placeholder: "e.g. Introduction to Binary Trees" },
                { key: "duration", label: "Duration", placeholder: "e.g. 60 minutes" },
                { key: "grade", label: "Grade/Level", placeholder: "e.g. Grade 12, Undergraduate, Beginner" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label style={{ fontFamily: "var(--font-family-display)", fontSize: "0.75rem", color: "#c4bff5", display: "block", marginBottom: "4px" }}>{label}</label>
                  <input
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    placeholder={placeholder}
                    value={lessonForm[key as keyof typeof lessonForm]}
                    onChange={(e) => setLessonForm((p) => ({ ...p, [key]: e.target.value }))}
                    style={{ background: "#141425", border: "1px solid rgba(16,185,129,0.2)", color: "#f0eefc", fontFamily: "var(--font-family-body)" }}
                  />
                </div>
              ))}
            </div>
            <button onClick={generateLessonPlan} disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "white", fontFamily: "var(--font-family-display)" }}>
              {loading ? <><Loader2 size={15} className="animate-spin" /> Generating...</> : <><Sparkles size={15} /> Generate Lesson Plan</>}
            </button>
            {output && <OutputSection output={output} onCopy={copyToClipboard} onDownload={() => downloadOutput("lesson-plan.txt")} />}
          </div>
        )}
      </div>
    </div>
  );
}

function OutputSection({
  output, onCopy, onDownload,
}: { output: string; onCopy: (t: string) => void; onDownload: () => void }) {
  return (
    <div>
      <div className="flex justify-end gap-2 mb-2">
        <button onClick={() => onCopy(output)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: "#141425", border: "1px solid rgba(124,58,237,0.15)", color: "#6b6890", fontFamily: "var(--font-family-display)" }}>
          <Copy size={12} /> Copy
        </button>
        <button onClick={onDownload} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", color: "#a78bfa", fontFamily: "var(--font-family-display)" }}>
          <Download size={12} /> Download
        </button>
      </div>
      <div className="p-4 rounded-xl" style={{ background: "#141425", border: "1px solid rgba(124,58,237,0.08)", maxHeight: "360px", overflowY: "auto", scrollbarWidth: "none" }}>
        <pre style={{ fontFamily: "var(--font-family-body)", color: "#a0a0b8", fontSize: "0.82rem", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {output}
        </pre>
      </div>
    </div>
  );
}

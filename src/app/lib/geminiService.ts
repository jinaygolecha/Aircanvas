/**
 * Gemini AI Service — AirCanvas-Pro Intelligence Layer
 *
 * SECURITY NOTE:
 * In production, all Gemini calls MUST be proxied through a server-side endpoint.
 * The API key must NEVER be exposed in frontend bundles.
 * Set up a FastAPI/Express proxy that reads GEMINI_API_KEY from the server environment.
 *
 * For development, use: VITE_GEMINI_API_KEY=your_key_here in .env.local
 * This file is structured so the client code stays identical when swapped to a backend proxy.
 */

import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

// ── Model Initialization ───────────────────────────────────────────────────────

function getModel(): GenerativeModel | null {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_key_here") return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

async function generate(prompt: string): Promise<string> {
  const model = getModel();
  if (!model) {
    return "[Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env.local file to enable AI features.]";
  }
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err: any) {
    console.error("Gemini error:", err);
    if (err?.message?.includes("API_KEY")) return "Invalid Gemini API key.";
    if (err?.message?.includes("quota")) return "Gemini quota exceeded. Please check your API plan.";
    throw err;
  }
}

// ── Context Builder ────────────────────────────────────────────────────────────

export interface BoardContext {
  boardName?: string;
  strokeCount?: number;
  sessionType?: string;
  subject?: string;
  content?: string;
  ocrText?: string;
  notes?: string;
}

function buildSystemContext(ctx: BoardContext): string {
  return `You are AirCanvas-Pro's intelligent AI teaching assistant — a specialized educational AI for teachers, professors, and trainers.
You are currently assisting with:
- Board: "${ctx.boardName || "Untitled Session"}"
- Subject: ${ctx.subject || "General Education"}
- Session type: ${ctx.sessionType || "Lecture"}
${ctx.strokeCount ? `- Canvas has ${ctx.strokeCount} drawn elements` : ""}
${ctx.ocrText ? `\nRecognized content from canvas/OCR:\n${ctx.ocrText}` : ""}
${ctx.content ? `\nSession content:\n${ctx.content}` : ""}
${ctx.notes ? `\nExisting notes:\n${ctx.notes}` : ""}

Your responses must be:
- Educationally valuable and accurate
- Well-structured with clear formatting
- Appropriate for the subject and level
- Concise but complete`;
}

// ── AI Chatbot ─────────────────────────────────────────────────────────────────

export type ChatMessage = { role: "user" | "assistant"; content: string };

export async function chat(
  message: string,
  history: ChatMessage[],
  ctx: BoardContext = {}
): Promise<string> {
  const systemContext = buildSystemContext(ctx);
  const historyText = history
    .slice(-6) // last 3 exchanges
    .map((m) => `${m.role === "user" ? "Teacher" : "AI"}: ${m.content}`)
    .join("\n");

  const prompt = `${systemContext}

${historyText ? `Conversation history:\n${historyText}\n` : ""}
Teacher: ${message}
AI:`;

  return generate(prompt);
}

// ── Math Recognition & Solver ──────────────────────────────────────────────────

export async function recognizeMath(
  handwrittenText: string,
  ctx: BoardContext = {}
): Promise<{
  original: string;
  latex: string;
  solution: string;
  steps: string[];
  graph?: string;
  explanation: string;
  practiceQuestions: string[];
}> {
  const prompt = `You are a mathematics expert and educator.
Analyze this mathematical content from a digital whiteboard: "${handwrittenText}"

Provide a JSON response with this exact structure:
{
  "original": "the recognized equation/expression as written",
  "latex": "LaTeX representation",
  "solution": "final answer or simplified form",
  "steps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
  "graph": "description of what the graph looks like if applicable",
  "explanation": "clear educational explanation of the concept",
  "practiceQuestions": ["question 1", "question 2", "question 3"]
}

If it's not a mathematical expression, return null for mathematical fields and provide explanation.`;

  const response = await generate(prompt);
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}

  return {
    original: handwrittenText,
    latex: handwrittenText,
    solution: response,
    steps: [response],
    explanation: response,
    practiceQuestions: [],
  };
}

// ── Handwriting Recognition ────────────────────────────────────────────────────

export async function recognizeHandwriting(
  strokeDescription: string,
  ctx: BoardContext = {}
): Promise<{ text: string; corrected: string; confidence: number }> {
  const prompt = `You are an OCR and handwriting recognition expert.
Context: Educational whiteboard session for "${ctx.subject || "general"}" subject.
Recognized stroke patterns: ${strokeDescription}

Convert this to clean text. Correct any spelling or structural errors.
Return JSON: {"text": "raw recognized text", "corrected": "corrected text", "confidence": 0-100}`;

  const response = await generate(prompt);
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}
  return { text: strokeDescription, corrected: strokeDescription, confidence: 75 };
}

// ── Lecture Notes Generator ────────────────────────────────────────────────────

export async function generateNotes(
  content: string,
  ctx: BoardContext = {}
): Promise<string> {
  const prompt = `You are an expert educator and note-taker.
Generate comprehensive, well-structured lecture notes from the following content.
Subject: ${ctx.subject || "General"}
Session: ${ctx.boardName || "Lecture Session"}

Content to convert into notes:
${content}

Format the notes with:
- Clear headings (##)
- Bullet points for key concepts
- Numbered lists for steps/sequences
- Bold text for important terms
- Practice questions at the end
- Learning outcomes section

Make the notes suitable for students to study from.`;

  return generate(prompt);
}

// ── Quiz Generator ─────────────────────────────────────────────────────────────

export async function generateQuiz(
  content: string,
  ctx: BoardContext = {},
  options: { questionCount?: number; difficulty?: string; format?: string } = {}
): Promise<string> {
  const { questionCount = 10, difficulty = "medium", format = "mixed" } = options;

  const prompt = `You are an expert educator creating assessment material.
Subject: ${ctx.subject || "General"}
Topic: ${ctx.boardName || "Lecture Session"}
Content covered: ${content}

Generate ${questionCount} ${difficulty}-difficulty quiz questions.
Format: ${format} (mix of MCQ, short answer, true/false)

For each question include:
- Question number and text
- For MCQ: 4 options (A-D) with the correct answer marked
- For true/false: T/F with explanation
- For short answer: model answer
- Point value

End with an answer key section.
Make the quiz educationally rigorous and aligned to the content.`;

  return generate(prompt);
}

// ── Assignment Generator ───────────────────────────────────────────────────────

export async function generateAssignment(
  content: string,
  ctx: BoardContext = {},
  options: { type?: string; difficulty?: string; deadline?: string } = {}
): Promise<string> {
  const { type = "mixed", difficulty = "medium" } = options;

  const prompt = `You are an expert educator creating assignment material.
Subject: ${ctx.subject || "General"}
Topic: ${ctx.boardName || "Lecture Session"}
Content: ${content}

Create a comprehensive ${difficulty}-level assignment with:
1. Assignment title and objectives
2. Background/instructions section
3. Part A: Conceptual questions (3-4 questions)
4. Part B: Problem-solving questions (3-4 problems)
5. Part C: Application/project task (1 task)
6. Submission guidelines
7. Evaluation rubric

Type: ${type} assignment
Make it suitable for submission and formal evaluation.`;

  return generate(prompt);
}

// ── Flashcard Generator ────────────────────────────────────────────────────────

export async function generateFlashcards(
  content: string,
  ctx: BoardContext = {}
): Promise<Array<{ front: string; back: string; category: string }>> {
  const prompt = `Create educational flashcards from this content.
Subject: ${ctx.subject || "General"}
Content: ${content}

Generate 10-15 flashcards as JSON array:
[
  {"front": "question/term", "back": "answer/definition", "category": "concept type"},
  ...
]

Cover key terms, concepts, formulas, and processes.`;

  const response = await generate(prompt);
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}
  return [{ front: "Error generating flashcards", back: response, category: "general" }];
}

// ── AI Diagram Generator ───────────────────────────────────────────────────────

export async function generateDiagram(
  description: string,
  type: "ER" | "UML" | "Flowchart" | "MindMap" | "SystemDesign" = "Flowchart"
): Promise<{
  description: string;
  entities: string[];
  relationships: string[];
  canvasInstructions: string;
  mermaidCode?: string;
}> {
  const prompt = `You are a software architect and diagram specialist.
Generate a ${type} diagram for: "${description}"

Provide JSON with:
{
  "description": "brief description of the diagram",
  "entities": ["Entity1: description", "Entity2: description", ...],
  "relationships": ["Entity1 --relationship--> Entity2", ...],
  "canvasInstructions": "step-by-step instructions to draw this on a whiteboard",
  "mermaidCode": "valid Mermaid.js diagram code"
}

For ER diagrams include entities, attributes, and cardinality.
For UML include classes, methods, and relationships.
For flowcharts include start/end, decisions, and processes.`;

  const response = await generate(prompt);
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}
  return {
    description: description,
    entities: [],
    relationships: [],
    canvasInstructions: response,
  };
}

// ── Video OCR Analysis ─────────────────────────────────────────────────────────

export async function analyzeVideoContent(
  extractedText: string,
  videoTitle: string,
  ctx: BoardContext = {}
): Promise<{
  summary: string;
  keyTopics: string[];
  notes: string;
  quiz: string;
  assignment: string;
  flashcards: Array<{ front: string; back: string; category: string }>;
  learningOutcomes: string[];
  studyGuide: string;
}> {
  const prompt = `You are an expert educational content analyst.
Video lecture: "${videoTitle}"
Subject: ${ctx.subject || "General Education"}

Extracted content from the video:
${extractedText}

Analyze this educational content and provide a comprehensive JSON response:
{
  "summary": "2-3 paragraph summary of the lecture",
  "keyTopics": ["Topic 1", "Topic 2", ...],
  "notes": "formatted lecture notes with headings and bullet points",
  "quiz": "5 quiz questions with answers",
  "assignment": "one assignment question with rubric",
  "flashcards": [{"front": "...", "back": "...", "category": "..."}],
  "learningOutcomes": ["By the end of this lecture, students will be able to..."],
  "studyGuide": "structured study guide with sections"
}`;

  const response = await generate(prompt);
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}

  return {
    summary: response,
    keyTopics: [],
    notes: response,
    quiz: "",
    assignment: "",
    flashcards: [],
    learningOutcomes: [],
    studyGuide: response,
  };
}

// ── Lesson Planner ─────────────────────────────────────────────────────────────

export async function generateLessonPlan(
  topic: string,
  duration: string,
  gradeLevel: string,
  ctx: BoardContext = {}
): Promise<string> {
  const prompt = `Create a comprehensive lesson plan for a teacher.
Topic: ${topic}
Duration: ${duration}
Grade/Level: ${gradeLevel}
Subject: ${ctx.subject || "General"}

Structure the plan with:
1. Lesson objectives
2. Materials needed
3. Introduction (time allocation)
4. Main teaching activities (with timing)
5. Student activities/exercises
6. Assessment strategy
7. Closure/summary
8. Homework assignment
9. Differentiation strategies
10. Cross-curricular connections

Make it practical and immediately usable by a teacher.`;

  return generate(prompt);
}

// ── API Key Status ─────────────────────────────────────────────────────────────

export function isGeminiConfigured(): boolean {
  const key = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  return !!key && key !== "your_key_here" && key.length > 10;
}

export function getGeminiStatus(): { configured: boolean; message: string } {
  if (isGeminiConfigured()) {
    return { configured: true, message: "Gemini AI connected" };
  }
  return {
    configured: false,
    message: "Add VITE_GEMINI_API_KEY to .env.local to enable full AI features",
  };
}

import { useState } from "react";
import { Link } from "react-router";
import {
  PenTool, Plus, Search, Bell, Settings, LogOut, Users, Video,
  BookOpen, BarChart2, Clock, TrendingUp, Star, MoreHorizontal,
  Grid, List, Filter, Calendar, Brain, FileText, Zap, Award,
  ChevronRight, Play, Download, Share2, Trash2, Copy, Eye,
  Home, Layout, Layers, ArrowUpRight, CheckCircle, AlertCircle,
  GraduationCap, Building2, Globe, Activity, Cpu
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const BOARDS = [
  { id: "1", name: "Linear Algebra — Week 3", type: "Lecture", date: "Jun 4, 2026", collaborators: 12, color: "#7C3AED", starred: true, strokes: 47, duration: "1h 23m" },
  { id: "2", name: "ER Diagram Practice — DBMS", type: "Workshop", date: "Jun 3, 2026", collaborators: 8, color: "#06B6D4", starred: false, strokes: 89, duration: "45m" },
  { id: "3", name: "System Design Interview Prep", type: "Session", date: "Jun 2, 2026", collaborators: 5, color: "#10b981", starred: true, strokes: 134, duration: "2h 10m" },
  { id: "4", name: "Calculus — Integration Methods", type: "Lecture", date: "Jun 1, 2026", collaborators: 24, color: "#f59e0b", starred: false, strokes: 62, duration: "1h 05m" },
  { id: "5", name: "UML Class Diagrams — OOPs", type: "Workshop", date: "May 31, 2026", collaborators: 15, color: "#ec4899", starred: false, strokes: 78, duration: "55m" },
  { id: "6", name: "Python Data Structures", type: "Session", date: "May 30, 2026", collaborators: 31, color: "#8b5cf6", starred: true, strokes: 43, duration: "1h 30m" },
];

const ACTIVITY = [
  { time: "2 min ago", action: "Dr. Priya joined your Linear Algebra board", icon: Users, color: "#7C3AED" },
  { time: "18 min ago", action: "AI generated 5 quiz questions for DBMS session", icon: Brain, color: "#06B6D4" },
  { time: "1 hr ago", action: "Lecture recording saved — Calculus Week 3", icon: Video, color: "#10b981" },
  { time: "3 hrs ago", action: "Auto-notes exported for System Design session", icon: FileText, color: "#f59e0b" },
  { time: "Yesterday", action: "New collaborator joined: Rohan Mehta", icon: Users, color: "#ec4899" },
  { time: "Yesterday", action: "AI diagram generated: ER Schema v2", icon: Cpu, color: "#a78bfa" },
];

const WEEKLY_SESSIONS = [
  { day: "Mon", sessions: 3, duration: 180 },
  { day: "Tue", sessions: 5, duration: 290 },
  { day: "Wed", sessions: 2, duration: 120 },
  { day: "Thu", sessions: 7, duration: 410 },
  { day: "Fri", sessions: 4, duration: 240 },
  { day: "Sat", sessions: 1, duration: 60 },
  { day: "Sun", sessions: 0, duration: 0 },
];

const ENGAGEMENT = [
  { week: "W1", students: 18, diagrams: 12 },
  { week: "W2", students: 24, diagrams: 18 },
  { week: "W3", students: 31, diagrams: 24 },
  { week: "W4", students: 28, diagrams: 20 },
  { week: "W5", students: 39, diagrams: 32 },
  { week: "W6", students: 45, diagrams: 38 },
];

const STATS = [
  { label: "Total Sessions", value: "127", delta: "+12 this week", icon: BookOpen, color: "#7C3AED" },
  { label: "Students Reached", value: "1,842", delta: "+89 this month", icon: GraduationCap, color: "#06B6D4" },
  { label: "Hours Recorded", value: "213h", delta: "+8.5h this week", icon: Video, color: "#10b981" },
  { label: "AI Diagrams Made", value: "2,341", delta: "+47 today", icon: Brain, color: "#f59e0b" },
];

function Sidebar({ active }: { active: string }) {
  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "boards", label: "My Boards", icon: Layout },
    { id: "sessions", label: "Sessions", icon: Video },
    { id: "students", label: "Students", icon: Users },
    { id: "ai", label: "AI Tools", icon: Brain },
    { id: "recordings", label: "Recordings", icon: Play },
    { id: "notes", label: "Auto Notes", icon: FileText },
    { id: "analytics", label: "Analytics", icon: BarChart2 },
  ];

  return (
    <aside
      className="flex flex-col shrink-0"
      style={{ width: "220px", background: "#0b0b18", borderRight: "1px solid rgba(124,58,237,0.1)", height: "100vh" }}
    >
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(124,58,237,0.08)" }}>
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)" }}>
            <PenTool size={13} className="text-white" />
          </div>
          <span style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, color: "#f0eefc", fontSize: "1rem" }}>
            AirCanvas<span style={{ color: "#7C3AED" }}>Pro</span>
          </span>
        </Link>
      </div>

      {/* User info */}
      <div className="px-4 py-4" style={{ borderBottom: "1px solid rgba(124,58,237,0.08)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)", fontFamily: "var(--font-family-display)" }}
          >
            JG
          </div>
          <div className="overflow-hidden">
            <div style={{ fontFamily: "var(--font-family-display)", fontWeight: 600, color: "#f0eefc", fontSize: "0.85rem" }}>Jinay Golecha</div>
            <div style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", color: "#6b6890" }}>Pro Plan</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left"
            style={{
              background: active === id ? "rgba(124,58,237,0.15)" : "transparent",
              color: active === id ? "#a78bfa" : "#6b6890",
              border: active === id ? "1px solid rgba(124,58,237,0.25)" : "1px solid transparent",
              fontFamily: "var(--font-family-body)",
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>

      <div className="px-3 py-4 space-y-0.5" style={{ borderTop: "1px solid rgba(124,58,237,0.08)" }}>
        <Link
          to="/app"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #7C3AED, #5b21b6)", color: "white", fontFamily: "var(--font-family-display)", display: "flex" }}
        >
          <Plus size={15} /> New Board
        </Link>
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
          style={{ color: "#6b6890", fontFamily: "var(--font-family-body)" }}
        >
          <Settings size={14} /> Settings
        </button>
        <Link
          to="/"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
          style={{ color: "#6b6890", fontFamily: "var(--font-family-body)", display: "flex" }}
        >
          <LogOut size={14} /> Sign Out
        </Link>
      </div>
    </aside>
  );
}

export function Dashboard() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [activeNav, setActiveNav] = useState("dashboard");
  const [starredOnly, setStarredOnly] = useState(false);

  const filteredBoards = BOARDS.filter(b => {
    if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (starredOnly && !b.starred) return false;
    return true;
  });

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#07070e" }}>
      <Sidebar active={activeNav} />

      {/* Main content */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {/* Top bar */}
        <div
          className="sticky top-0 z-10 flex items-center gap-4 px-6 py-3.5"
          style={{ background: "rgba(7,7,14,0.9)", borderBottom: "1px solid rgba(124,58,237,0.08)", backdropFilter: "blur(10px)" }}
        >
          <div className="flex-1">
            <h1 style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, color: "#f0eefc", fontSize: "1.1rem", letterSpacing: "-0.02em" }}>
              Good morning, Jinay 👋
            </h1>
            <p style={{ fontFamily: "var(--font-family-body)", color: "#6b6890", fontSize: "0.8rem" }}>
              Thursday, June 4, 2026 · 3 sessions scheduled today
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6b6890" }} />
              <input
                className="pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
                placeholder="Search boards..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ background: "#141425", border: "1px solid rgba(124,58,237,0.12)", color: "#f0eefc", fontFamily: "var(--font-family-body)", width: "220px" }}
              />
            </div>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: "#141425", border: "1px solid rgba(124,58,237,0.12)", color: "#6b6890" }}>
              <Bell size={15} />
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)", fontFamily: "var(--font-family-display)" }}>
              JG
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="p-5 rounded-2xl"
                  style={{ background: "#0f0f1c", border: "1px solid rgba(124,58,237,0.08)" }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}25` }}>
                      <Icon size={16} style={{ color: stat.color }} />
                    </div>
                    <ArrowUpRight size={14} style={{ color: "#6b6890" }} />
                  </div>
                  <div style={{ fontFamily: "var(--font-family-display)", fontWeight: 800, fontSize: "1.8rem", color: "#f0eefc", letterSpacing: "-0.04em" }}>
                    {stat.value}
                  </div>
                  <div style={{ fontFamily: "var(--font-family-body)", color: "#6b6890", fontSize: "0.75rem", marginTop: "2px" }}>
                    {stat.label}
                  </div>
                  <div className="mt-2" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", color: stat.color }}>
                    {stat.delta}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-5">
            {/* Weekly Sessions */}
            <div className="p-5 rounded-2xl" style={{ background: "#0f0f1c", border: "1px solid rgba(124,58,237,0.08)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ fontFamily: "var(--font-family-display)", fontWeight: 600, color: "#f0eefc", fontSize: "0.95rem" }}>
                  Weekly Sessions
                </h3>
                <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", color: "#6b6890" }}>This Week</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={WEEKLY_SESSIONS} barSize={20}>
                  <XAxis dataKey="day" tick={{ fill: "#6b6890", fontSize: 11, fontFamily: "var(--font-family-mono)" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: "#0f0f1c", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "10px", color: "#f0eefc", fontFamily: "var(--font-family-mono)", fontSize: "0.75rem" }}
                    cursor={{ fill: "rgba(124,58,237,0.06)" }}
                  />
                  <Bar dataKey="sessions" fill="#7C3AED" radius={[4, 4, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Engagement */}
            <div className="p-5 rounded-2xl" style={{ background: "#0f0f1c", border: "1px solid rgba(124,58,237,0.08)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ fontFamily: "var(--font-family-display)", fontWeight: 600, color: "#f0eefc", fontSize: "0.95rem" }}>
                  Student Engagement
                </h3>
                <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", color: "#6b6890" }}>6 Weeks</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={ENGAGEMENT}>
                  <defs>
                    <linearGradient id="studentsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="diagramsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="week" tick={{ fill: "#6b6890", fontSize: 11, fontFamily: "var(--font-family-mono)" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: "#0f0f1c", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "10px", color: "#f0eefc", fontFamily: "var(--font-family-mono)", fontSize: "0.75rem" }}
                  />
                  <Area type="monotone" dataKey="students" stroke="#7C3AED" fill="url(#studentsGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="diagrams" stroke="#06B6D4" fill="url(#diagramsGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#7C3AED" }} />
                  <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", color: "#6b6890" }}>Students</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#06B6D4" }} />
                  <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", color: "#6b6890" }}>AI Diagrams</span>
                </div>
              </div>
            </div>
          </div>

          {/* Boards Section */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, color: "#f0eefc", fontSize: "1.1rem" }}>
                Recent Boards
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStarredOnly(!starredOnly)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                  style={{
                    background: starredOnly ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${starredOnly ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.06)"}`,
                    color: starredOnly ? "#f59e0b" : "#6b6890",
                    fontFamily: "var(--font-family-body)",
                  }}
                >
                  <Star size={12} /> Starred
                </button>
                <button
                  onClick={() => setView("grid")}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                  style={{ background: view === "grid" ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.04)", color: view === "grid" ? "#a78bfa" : "#6b6890" }}
                >
                  <Grid size={14} />
                </button>
                <button
                  onClick={() => setView("list")}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                  style={{ background: view === "list" ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.04)", color: view === "list" ? "#a78bfa" : "#6b6890" }}
                >
                  <List size={14} />
                </button>
                <Link
                  to="/app"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                  style={{ background: "#7C3AED", color: "white", fontFamily: "var(--font-family-display)" }}
                >
                  <Plus size={13} /> New Board
                </Link>
              </div>
            </div>

            {view === "grid" ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBoards.map((board) => (
                  <div
                    key={board.id}
                    className="group rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1"
                    style={{ background: "#0f0f1c", border: "1px solid rgba(124,58,237,0.08)", cursor: "pointer" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${board.color}30`; e.currentTarget.style.boxShadow = `0 8px 30px ${board.color}10`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    {/* Canvas preview */}
                    <div className="relative h-32" style={{ background: `linear-gradient(135deg, ${board.color}10, ${board.color}05)` }}>
                      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.4 }}>
                        <path d={`M${20 + Math.random() * 40} ${20 + Math.random() * 20} Q${60 + Math.random() * 60} ${40 + Math.random() * 30} ${120 + Math.random() * 60} ${25 + Math.random() * 40}`}
                          fill="none" stroke={board.color} strokeWidth="2" strokeLinecap="round" />
                        <rect x="150" y="20" width="60" height="30" rx="4" fill="none" stroke={board.color} strokeWidth="1.5" />
                        <rect x="160" y="60" width="80" height="30" rx="4" fill="none" stroke={board.color} strokeWidth="1.5" />
                        <line x1="180" y1="50" x2="200" y2="60" stroke={board.color} strokeWidth="1" strokeDasharray="3,2" />
                      </svg>
                      <div className="absolute top-2 right-2 flex items-center gap-1.5">
                        {board.starred && <Star size={12} fill="#f59e0b" stroke="none" />}
                        <span
                          className="px-2 py-0.5 rounded-full text-xs"
                          style={{ background: `${board.color}20`, color: board.color, fontFamily: "var(--font-family-mono)", fontSize: "0.65rem" }}
                        >
                          {board.type}
                        </span>
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="mb-1 truncate" style={{ fontFamily: "var(--font-family-display)", fontWeight: 600, color: "#f0eefc", fontSize: "0.9rem" }}>
                        {board.name}
                      </h3>
                      <div className="flex items-center gap-3 text-xs" style={{ color: "#6b6890", fontFamily: "var(--font-family-mono)" }}>
                        <span className="flex items-center gap-1"><Calendar size={10} /> {board.date}</span>
                        <span className="flex items-center gap-1"><Users size={10} /> {board.collaborators}</span>
                        <span className="flex items-center gap-1"><Clock size={10} /> {board.duration}</span>
                      </div>

                      <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          to="/app"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa", fontFamily: "var(--font-family-display)" }}
                        >
                          <Play size={11} /> Open
                        </Link>
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "#6b6890" }}>
                          <Share2 size={12} />
                        </button>
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "#6b6890" }}>
                          <Download size={12} />
                        </button>
                        <button className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "#6b6890" }}>
                          <MoreHorizontal size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* New Board card */}
                <Link
                  to="/app"
                  className="rounded-2xl flex flex-col items-center justify-center gap-3 h-48 transition-all hover:-translate-y-1"
                  style={{ background: "rgba(124,58,237,0.04)", border: "1px dashed rgba(124,58,237,0.2)", color: "#6b6890" }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
                    <Plus size={20} style={{ color: "#7C3AED" }} />
                  </div>
                  <span style={{ fontFamily: "var(--font-family-display)", fontWeight: 600, color: "#6b6890", fontSize: "0.85rem" }}>New Board</span>
                </Link>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ background: "#0f0f1c", border: "1px solid rgba(124,58,237,0.08)" }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(124,58,237,0.08)" }}>
                      {["Board Name", "Type", "Date", "Students", "Duration", ""].map((h) => (
                        <th key={h} className="px-5 py-3 text-left" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.7rem", color: "#6b6890" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBoards.map((board, i) => (
                      <tr key={board.id} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom: i < filteredBoards.length - 1 ? "1px solid rgba(124,58,237,0.06)" : "none" }}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${board.color}15` }}>
                              <BookOpen size={13} style={{ color: board.color }} />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span style={{ fontFamily: "var(--font-family-display)", fontWeight: 500, color: "#f0eefc", fontSize: "0.85rem" }}>{board.name}</span>
                                {board.starred && <Star size={11} fill="#f59e0b" stroke="none" />}
                              </div>
                              <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", color: "#6b6890" }}>{board.strokes} strokes</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: `${board.color}15`, color: board.color, fontFamily: "var(--font-family-mono)", fontSize: "0.65rem" }}>{board.type}</span>
                        </td>
                        <td className="px-5 py-3.5" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.75rem", color: "#6b6890" }}>{board.date}</td>
                        <td className="px-5 py-3.5" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.75rem", color: "#6b6890" }}>{board.collaborators}</td>
                        <td className="px-5 py-3.5" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.75rem", color: "#6b6890" }}>{board.duration}</td>
                        <td className="px-5 py-3.5">
                          <Link to="/app" className="flex items-center gap-1 text-xs" style={{ color: "#7C3AED", fontFamily: "var(--font-family-display)" }}>
                            Open <ChevronRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bottom Row: Activity + AI Tools */}
          <div className="grid lg:grid-cols-3 gap-5">
            {/* Activity Feed */}
            <div className="lg:col-span-2 p-5 rounded-2xl" style={{ background: "#0f0f1c", border: "1px solid rgba(124,58,237,0.08)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ fontFamily: "var(--font-family-display)", fontWeight: 600, color: "#f0eefc", fontSize: "0.95rem" }}>
                  Recent Activity
                </h3>
                <Activity size={15} style={{ color: "#6b6890" }} />
              </div>
              <div className="space-y-3">
                {ACTIVITY.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${item.color}15` }}>
                        <Icon size={13} style={{ color: item.color }} />
                      </div>
                      <div className="flex-1">
                        <p style={{ fontFamily: "var(--font-family-body)", color: "#a0a0b8", fontSize: "0.82rem", lineHeight: 1.5 }}>{item.action}</p>
                        <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", color: "#4a4a6a" }}>{item.time}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Quick Tools */}
            <div className="p-5 rounded-2xl" style={{ background: "#0f0f1c", border: "1px solid rgba(124,58,237,0.08)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ fontFamily: "var(--font-family-display)", fontWeight: 600, color: "#f0eefc", fontSize: "0.95rem" }}>
                  AI Quick Tools
                </h3>
                <Sparkles size={15} style={{ color: "#a78bfa" }} />
              </div>
              <div className="space-y-2.5">
                {[
                  { label: "Generate Lecture Notes", icon: FileText, color: "#7C3AED" },
                  { label: "Create Quiz from Board", icon: Brain, color: "#06B6D4" },
                  { label: "Export to PDF", icon: Download, color: "#10b981" },
                  { label: "Smart Diagram (AI)", icon: Cpu, color: "#f59e0b" },
                  { label: "Share Session Link", icon: Share2, color: "#ec4899" },
                  { label: "Schedule Next Session", icon: Calendar, color: "#8b5cf6" },
                ].map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Link
                      key={tool.label}
                      to="/app"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all hover:opacity-80"
                      style={{
                        background: `${tool.color}08`,
                        border: `1px solid ${tool.color}15`,
                        display: "flex",
                      }}
                    >
                      <Icon size={14} style={{ color: tool.color }} />
                      <span style={{ fontFamily: "var(--font-family-body)", color: "#a0a0b8", fontSize: "0.82rem" }}>{tool.label}</span>
                      <ChevronRight size={12} style={{ color: "#4a4a6a", marginLeft: "auto" }} />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer spacer */}
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}

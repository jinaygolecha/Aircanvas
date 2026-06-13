import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Zap, Brain, Users, Video, Mic, Share2, PenTool, Layers,
  BarChart2, Shield, Globe, ArrowRight, Check, ChevronDown,
  Star, Play, Sparkles, BookOpen, GraduationCap, Building2,
  Cpu, Eye, MessageSquare, FileText, Camera, Settings,
  Menu, X, ExternalLink, Award, TrendingUp, Clock, Layout
} from "lucide-react";
import { motion } from "motion/react";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Use Cases", href: "#usecases" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "#about" },
];

const FEATURES = [
  {
    icon: PenTool,
    title: "Air Writing & Drawing",
    desc: "Write equations and draw diagrams in the air using gesture-based tracking. Your movements translate to crisp, clean strokes on the digital canvas.",
    color: "#7C3AED",
  },
  {
    icon: Brain,
    title: "AI Diagram Generation",
    desc: "Rough sketches become professional ER diagrams, UML charts, flowcharts, and system designs instantly. AI recognizes shapes and refines them.",
    color: "#06B6D4",
  },
  {
    icon: Cpu,
    title: "Math OCR & Solver",
    desc: "Write any equation and AI recognizes, digitizes, solves step-by-step, and generates graph visualizations automatically.",
    color: "#10b981",
  },
  {
    icon: Mic,
    title: "Voice Commands",
    desc: "Control every canvas action hands-free. Undo, redo, change color, clear canvas, open AI assistant — all through natural voice instructions.",
    color: "#f59e0b",
  },
  {
    icon: Users,
    title: "Real-Time Collaboration",
    desc: "Multiple users draw, annotate, and edit the same board simultaneously. See cursors, selections, and changes in real time with zero latency.",
    color: "#ec4899",
  },
  {
    icon: Video,
    title: "Lecture Recording",
    desc: "Record entire sessions with canvas activity, audio, and video synchronized. Export lecture recordings with auto-generated timestamps.",
    color: "#8b5cf6",
  },
  {
    icon: MessageSquare,
    title: "AI Teaching Assistant",
    desc: "An embedded AI tutor answers questions, generates quiz items, creates assignments, explains concepts, and summarizes lecture content.",
    color: "#06B6D4",
  },
  {
    icon: Eye,
    title: "Screen Annotation",
    desc: "Draw on top of any running application, slide deck, or browser window. Highlight, circle, and annotate live content without leaving the session.",
    color: "#7C3AED",
  },
  {
    icon: FileText,
    title: "Auto Note Generation",
    desc: "Session content is automatically converted to structured notes with headings, bullet points, and embedded diagrams. Shareable in one click.",
    color: "#10b981",
  },
  {
    icon: Share2,
    title: "Meeting Integration",
    desc: "Works natively inside Google Meet, Zoom, and Microsoft Teams. Share your canvas as a virtual camera feed with zero setup.",
    color: "#f59e0b",
  },
  {
    icon: Globe,
    title: "Cloud Synchronization",
    desc: "All boards, sessions, and assets sync instantly to the cloud. Access your workspace from any device, browser, or operating system.",
    color: "#ec4899",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    desc: "End-to-end encryption, SSO, role-based access control, audit logs, and GDPR compliance built-in for institutional deployment.",
    color: "#8b5cf6",
  },
];

const USE_CASES = [
  {
    icon: GraduationCap,
    role: "Online Teacher",
    tagline: "Teach without touching your mouse",
    points: [
      "Write equations in the air during live Google Meet classes",
      "Draw diagrams and highlight slides with gestures",
      "Generate structured notes automatically from session content",
      "Record lectures with canvas, audio, and video synced",
      "Share whiteboard link with students in one click",
    ],
    color: "#7C3AED",
    img: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=400&fit=crop&auto=format",
  },
  {
    icon: BookOpen,
    role: "Engineering Professor",
    tagline: "From rough sketch to professional diagram",
    points: [
      "Sketch rough ER diagrams — AI refines them instantly",
      "Generate UML, flowcharts, and system designs from text",
      "Annotate live code editors and documentation",
      "Build reusable diagram libraries for recurring lectures",
      "Export diagrams as SVG, PNG, or embedded slides",
    ],
    color: "#06B6D4",
    img: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&h=400&fit=crop&auto=format",
  },
  {
    icon: Building2,
    role: "Corporate Trainer",
    tagline: "Elevate every presentation and workshop",
    points: [
      "Annotate over live presentations during business reviews",
      "Highlight, circle, and draw on top of any screen content",
      "Record full training sessions with annotation layer",
      "Share boards with team members across time zones",
      "AI generates session summaries and action items",
    ],
    color: "#10b981",
    img: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop&auto=format",
  },
];

const PRICING_PLANS = [
  {
    name: "Starter",
    price: "Free",
    desc: "Perfect for individual educators",
    features: [
      "3 active whiteboards",
      "Air writing & drawing",
      "Basic AI assistant",
      "5 hours recording/month",
      "Export as PNG/PDF",
      "2 collaborators",
    ],
    cta: "Get Started Free",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$19",
    period: "/mo",
    desc: "For serious educators and trainers",
    features: [
      "Unlimited whiteboards",
      "Full gesture + voice control",
      "Advanced AI diagram generation",
      "Math OCR & equation solver",
      "Unlimited recording",
      "Meeting integrations",
      "AI note & quiz generation",
      "20 collaborators",
      "Cloud sync",
    ],
    cta: "Start 14-day Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "For institutions and large teams",
    features: [
      "Everything in Professional",
      "SSO & SAML integration",
      "Role-based access control",
      "Audit logs & compliance",
      "Dedicated support",
      "Custom AI fine-tuning",
      "On-premise deployment option",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

const TESTIMONIALS = [
  {
    name: "Dr. Priya Sharma",
    role: "Professor of Computer Science, IIT Bombay",
    avatar: "PS",
    text: "AirCanvas-Pro transformed my online lectures. I draw ER diagrams in the air while talking, and students see polished diagrams in real time. The AI diagram generator alone saves me 3 hours a week.",
    rating: 5,
  },
  {
    name: "Rohan Mehta",
    role: "Senior Trainer, Infosys Learning",
    avatar: "RM",
    text: "We rolled it out across 200 trainers. The screen annotation feature is incredible — our presentations come alive. Recording quality is broadcast-grade and the AI summaries are accurate.",
    rating: 5,
  },
  {
    name: "Ms. Ananya Joshi",
    role: "Mathematics Teacher, Delhi Public School",
    avatar: "AJ",
    text: "My students write equations, the AI solves them with step-by-step workings, plots graphs — everything automatically. It is like having a Wolfram Alpha built into my whiteboard.",
    rating: 5,
  },
  {
    name: "Vikram Singh",
    role: "Founder, EduTech Startup",
    avatar: "VS",
    text: "We built our entire online tutoring platform on AirCanvas-Pro's API. The collaboration engine is rock solid — 50 students on one board with zero performance issues.",
    rating: 5,
  },
];

const STATS = [
  { value: "50K+", label: "Active Educators" },
  { value: "2.3M+", label: "Sessions Recorded" },
  { value: "180+", label: "Countries" },
  { value: "99.9%", label: "Uptime SLA" },
];

function NavBar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(7,7,14,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(124,58,237,0.15)" : "none",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)" }}>
            <PenTool size={16} className="text-white" />
          </div>
          <span className="text-white" style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-0.02em" }}>
            AirCanvas<span style={{ color: "#7C3AED" }}>Pro</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm transition-colors"
              style={{ color: "#c4bff5", fontFamily: "var(--font-family-body)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f0eefc")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#c4bff5")}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/dashboard"
            className="px-4 py-2 rounded-lg text-sm transition-colors"
            style={{ color: "#c4bff5", fontFamily: "var(--font-family-body)" }}
          >
            Sign In
          </Link>
          <Link
            to="/app"
            className="px-4 py-2 rounded-lg text-sm text-white font-medium transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #7C3AED, #5b21b6)", fontFamily: "var(--font-family-body)" }}
          >
            Try Free
          </Link>
        </div>

        <button className="md:hidden text-foreground p-2" onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden px-6 pb-6 pt-2 flex flex-col gap-4" style={{ background: "rgba(7,7,14,0.97)" }}>
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href} className="text-sm" style={{ color: "#c4bff5" }} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <Link to="/app" className="px-4 py-2.5 rounded-lg text-sm text-white text-center" style={{ background: "#7C3AED" }} onClick={() => setOpen(false)}>
            Try Free
          </Link>
        </div>
      )}
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      {/* Mesh background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,58,237,0.25) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 80% 60%, rgba(6,182,212,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 40% 40% at 10% 80%, rgba(124,58,237,0.1) 0%, transparent 60%)
          `,
        }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(124,58,237,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.05) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-16 items-center w-full">
        <div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mb-8"
            style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa", fontFamily: "var(--font-family-mono)" }}
          >
            <Sparkles size={12} />
            AI-Powered · Version 2.0 Released
          </div>

          <h1
            className="mb-6 leading-[1.1]"
            style={{ fontFamily: "var(--font-family-display)", fontWeight: 800, fontSize: "clamp(2.5rem, 5vw, 4rem)", color: "#f0eefc", letterSpacing: "-0.03em" }}
          >
            The Next-Generation
            <br />
            <span style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              AI Whiteboard
            </span>
            <br />
            for Educators
          </h1>

          <p
            className="mb-10 max-w-lg"
            style={{ color: "#a0a0b8", lineHeight: 1.7, fontSize: "1.05rem", fontFamily: "var(--font-family-body)" }}
          >
            Write in the air. Draw diagrams with gestures. Let AI generate notes, solve equations, create diagrams, and assist teaching — all inside one powerful platform.
          </p>

          <div className="flex flex-wrap gap-4 mb-12">
            <Link
              to="/app"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-white font-semibold transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #7C3AED, #5b21b6)", fontFamily: "var(--font-family-display)", boxShadow: "0 0 40px rgba(124,58,237,0.3)" }}
            >
              Open Canvas <ArrowRight size={16} />
            </Link>
            <a
              href="#features"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold transition-all hover:bg-white/5"
              style={{ border: "1px solid rgba(124,58,237,0.3)", color: "#c4bff5", fontFamily: "var(--font-family-display)" }}
            >
              <Play size={14} /> Watch Demo
            </a>
          </div>

          <div className="flex flex-wrap gap-6">
            {["Google Meet", "Zoom", "MS Teams"].map((tool) => (
              <div key={tool} className="flex items-center gap-2 text-xs" style={{ color: "#6b6890", fontFamily: "var(--font-family-mono)" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                {tool}
              </div>
            ))}
          </div>
        </div>

        {/* Canvas Preview */}
        <div className="relative">
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(124,58,237,0.2)", background: "#0f0f1c", boxShadow: "0 0 80px rgba(124,58,237,0.2), 0 40px 80px rgba(0,0,0,0.5)" }}
          >
            {/* Canvas header */}
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid rgba(124,58,237,0.1)", background: "#0b0b18" }}>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <div className="flex-1 text-center">
                <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.7rem", color: "#6b6890" }}>AirCanvas Pro — Lecture Session</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", color: "#ef4444" }}>REC</span>
              </div>
            </div>

            {/* Canvas body */}
            <div className="relative" style={{ height: "380px", background: "#07070e" }}>
              {/* Simulated whiteboard content */}
              <svg className="absolute inset-0 w-full h-full">
                {/* Drawn equation */}
                <text x="40" y="80" fill="#7C3AED" fontSize="22" fontFamily="serif" opacity="0.9">2x + 5 = 15</text>
                <text x="40" y="115" fill="#06B6D4" fontSize="15" fontFamily="monospace" opacity="0.7">→ x = 5</text>

                {/* Simple ER-style boxes */}
                <rect x="200" y="50" width="110" height="50" rx="6" fill="none" stroke="#7C3AED" strokeWidth="1.5" opacity="0.8" />
                <text x="255" y="80" fill="#c4bff5" fontSize="12" textAnchor="middle" fontFamily="monospace">Student</text>

                <rect x="340" y="50" width="110" height="50" rx="6" fill="none" stroke="#06B6D4" strokeWidth="1.5" opacity="0.8" />
                <text x="395" y="80" fill="#c4bff5" fontSize="12" textAnchor="middle" fontFamily="monospace">Course</text>

                <line x1="310" y1="75" x2="340" y2="75" stroke="#10b981" strokeWidth="1.5" opacity="0.7" strokeDasharray="4,2" />
                <text x="325" y="68" fill="#10b981" fontSize="9" textAnchor="middle" fontFamily="monospace">enrolls</text>

                {/* Freehand lines */}
                <path d="M40 160 Q80 140 120 160 Q160 180 200 155" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
                <path d="M40 200 Q100 170 160 200 Q220 230 280 195" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" opacity="0.6" />

                {/* AI suggestion bubble */}
                <rect x="340" y="130" width="140" height="60" rx="10" fill="rgba(124,58,237,0.15)" stroke="rgba(124,58,237,0.4)" strokeWidth="1" />
                <text x="352" y="152" fill="#a78bfa" fontSize="9" fontFamily="monospace">✦ AI Suggestion</text>
                <text x="352" y="170" fill="#c4bff5" fontSize="10" fontFamily="monospace">Graph: y = 2x + 5</text>
                <text x="352" y="183" fill="#c4bff5" fontSize="10" fontFamily="monospace">Slope: 2, Y-int: 5</text>

                {/* Mini graph */}
                <g transform="translate(40, 240)">
                  <line x1="0" y1="80" x2="120" y2="80" stroke="#2d2d4a" strokeWidth="1" />
                  <line x1="0" y1="0" x2="0" y2="80" stroke="#2d2d4a" strokeWidth="1" />
                  <path d="M0 70 L30 60 L60 50 L90 40 L120 30" fill="none" stroke="#06B6D4" strokeWidth="2" />
                  <text x="60" y="95" fill="#6b6890" fontSize="9" textAnchor="middle" fontFamily="monospace">Graph: y = 2x + 5</text>
                </g>

                {/* Cursor indicator */}
                <circle cx="285" cy="195" r="6" fill="none" stroke="#7C3AED" strokeWidth="2" opacity="0.9" />
                <circle cx="285" cy="195" r="2" fill="#7C3AED" opacity="0.9" />
              </svg>

              {/* Toolbar pills */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: "rgba(15,15,28,0.9)", border: "1px solid rgba(124,58,237,0.2)", backdropFilter: "blur(10px)" }}>
                {[PenTool, Layers, Brain, Mic, Share2, Camera].map((Icon, i) => (
                  <button
                    key={i}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                    style={{
                      background: i === 0 ? "rgba(124,58,237,0.3)" : "transparent",
                      color: i === 0 ? "#a78bfa" : "#6b6890",
                    }}
                  >
                    <Icon size={13} />
                  </button>
                ))}
              </div>

              {/* Collaborator avatars */}
              <div className="absolute top-3 right-3 flex -space-x-2">
                {["JG", "PS", "RM"].map((initials, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs border-2"
                    style={{
                      background: ["#7C3AED", "#06B6D4", "#10b981"][i],
                      borderColor: "#07070e",
                      color: "white",
                      fontFamily: "var(--font-family-display)",
                      fontWeight: 700,
                      fontSize: "0.6rem",
                    }}
                  >
                    {initials}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Floating stats */}
          <div
            className="absolute -bottom-4 -left-4 px-4 py-3 rounded-xl"
            style={{ background: "#0f0f1c", border: "1px solid rgba(124,58,237,0.2)", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}
          >
            <div style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", color: "#6b6890" }}>AI Diagrams Generated</div>
            <div style={{ fontFamily: "var(--font-family-display)", fontWeight: 800, fontSize: "1.5rem", color: "#7C3AED" }}>2.3M+</div>
          </div>

          <div
            className="absolute -top-4 -right-4 px-4 py-3 rounded-xl"
            style={{ background: "#0f0f1c", border: "1px solid rgba(6,182,212,0.2)", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}
          >
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", color: "#6b6890" }}>Live Session</span>
            </div>
            <div style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "1.1rem", color: "#06B6D4" }}>3 users online</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsBar() {
  return (
    <section className="py-16" style={{ borderTop: "1px solid rgba(124,58,237,0.1)", borderBottom: "1px solid rgba(124,58,237,0.1)" }}>
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
        {STATS.map((stat) => (
          <div key={stat.value} className="text-center">
            <div style={{ fontFamily: "var(--font-family-display)", fontWeight: 800, fontSize: "2.2rem", color: "#f0eefc", letterSpacing: "-0.03em" }}>
              {stat.value}
            </div>
            <div style={{ fontFamily: "var(--font-family-body)", fontSize: "0.85rem", color: "#6b6890", marginTop: "4px" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mb-6"
            style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa", fontFamily: "var(--font-family-mono)" }}
          >
            <Zap size={12} /> Core Platform
          </div>
          <h2 style={{ fontFamily: "var(--font-family-display)", fontWeight: 800, fontSize: "clamp(1.8rem, 4vw, 2.8rem)", color: "#f0eefc", letterSpacing: "-0.03em" }}>
            Everything you need to teach,<br />present, and collaborate
          </h2>
          <p className="mt-4 max-w-xl mx-auto" style={{ color: "#6b6890", fontFamily: "var(--font-family-body)" }}>
            12 integrated capabilities that replace 8 separate tools. One platform, one subscription, zero friction.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="p-6 rounded-2xl group transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: "#0f0f1c",
                  border: "1px solid rgba(124,58,237,0.1)",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${feature.color}40`;
                  e.currentTarget.style.boxShadow = `0 0 30px ${feature.color}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(124,58,237,0.1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${feature.color}18`, border: `1px solid ${feature.color}30` }}
                >
                  <Icon size={18} style={{ color: feature.color }} />
                </div>
                <h3 className="mb-2" style={{ fontFamily: "var(--font-family-display)", fontWeight: 600, color: "#f0eefc", fontSize: "1rem" }}>
                  {feature.title}
                </h3>
                <p style={{ fontFamily: "var(--font-family-body)", color: "#6b6890", fontSize: "0.875rem", lineHeight: 1.65 }}>
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function UseCasesSection() {
  const [active, setActive] = useState(0);
  const uc = USE_CASES[active];
  const Icon = uc.icon;

  return (
    <section id="usecases" className="py-24" style={{ borderTop: "1px solid rgba(124,58,237,0.08)" }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mb-6"
            style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.25)", color: "#06B6D4", fontFamily: "var(--font-family-mono)" }}
          >
            <Users size={12} /> Real-World Use Cases
          </div>
          <h2 style={{ fontFamily: "var(--font-family-display)", fontWeight: 800, fontSize: "clamp(1.8rem, 4vw, 2.8rem)", color: "#f0eefc", letterSpacing: "-0.03em" }}>
            Built for every kind of educator
          </h2>
        </div>

        <div className="flex flex-wrap gap-3 justify-center mb-12">
          {USE_CASES.map((u, i) => {
            const UIcon = u.icon;
            return (
              <button
                key={u.role}
                onClick={() => setActive(i)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: active === i ? `${u.color}20` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${active === i ? u.color + "50" : "rgba(255,255,255,0.06)"}`,
                  color: active === i ? u.color : "#6b6890",
                  fontFamily: "var(--font-family-display)",
                }}
              >
                <UIcon size={15} />
                {u.role}
              </button>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mb-6"
              style={{ background: `${uc.color}15`, border: `1px solid ${uc.color}30`, color: uc.color, fontFamily: "var(--font-family-mono)" }}
            >
              <Icon size={12} /> {uc.role}
            </div>
            <h3 className="mb-3" style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, fontSize: "1.8rem", color: "#f0eefc", letterSpacing: "-0.02em" }}>
              {uc.tagline}
            </h3>
            <ul className="space-y-3 mt-6">
              {uc.points.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center mt-0.5 shrink-0" style={{ background: `${uc.color}20` }}>
                    <Check size={11} style={{ color: uc.color }} />
                  </div>
                  <span style={{ fontFamily: "var(--font-family-body)", color: "#a0a0b8", fontSize: "0.95rem", lineHeight: 1.6 }}>{point}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/app"
              className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90"
              style={{ background: uc.color, fontFamily: "var(--font-family-display)" }}
            >
              Try as {uc.role} <ArrowRight size={15} />
            </Link>
          </div>

          <div className="relative rounded-2xl overflow-hidden aspect-[3/2]" style={{ border: `1px solid ${uc.color}25` }}>
            <img src={uc.img} alt={uc.role} className="w-full h-full object-cover" />
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${uc.color}30 0%, transparent 60%)` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function AISection() {
  return (
    <section className="py-24 relative overflow-hidden" style={{ borderTop: "1px solid rgba(124,58,237,0.08)" }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(124,58,237,0.08) 0%, transparent 70%)" }}
      />
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* AI capability panel */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "#0f0f1c", border: "1px solid rgba(124,58,237,0.2)" }}
          >
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(124,58,237,0.1)", background: "#0b0b18" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(124,58,237,0.2)" }}>
                <Brain size={14} className="text-primary" />
              </div>
              <span style={{ fontFamily: "var(--font-family-display)", fontWeight: 600, color: "#f0eefc", fontSize: "0.9rem" }}>AI Teaching Assistant</span>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.65rem", color: "#10b981" }}>Active</span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {[
                { role: "user", msg: "I just wrote 2x + 5 = 15 on the canvas. Can you solve it and explain?" },
                { role: "ai", msg: "Sure! Here's the step-by-step solution:\n\n2x + 5 = 15\n2x = 10\nx = 5\n\nI've also generated a graph of y = 2x + 5 on your canvas." },
                { role: "user", msg: "Generate quiz questions about linear equations for Grade 9." },
                { role: "ai", msg: "Generated 5 quiz questions on your canvas:\n1. Solve: 3x - 7 = 14\n2. Find x: 4(x + 2) = 24\n3. What is the slope of y = 5x + 3?\n4. Graph: y = -2x + 6\n5. Word problem: Train speed..." },
              ].map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "ai" && (
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,0.2)", marginTop: "2px" }}>
                      <Brain size={13} style={{ color: "#a78bfa" }} />
                    </div>
                  )}
                  <div
                    className="px-4 py-3 rounded-xl max-w-xs text-xs whitespace-pre-line"
                    style={{
                      background: msg.role === "ai" ? "rgba(124,58,237,0.1)" : "rgba(6,182,212,0.1)",
                      border: `1px solid ${msg.role === "ai" ? "rgba(124,58,237,0.2)" : "rgba(6,182,212,0.2)"}`,
                      color: "#c4bff5",
                      fontFamily: "var(--font-family-body)",
                      lineHeight: 1.6,
                    }}
                  >
                    {msg.msg}
                  </div>
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <input
                  className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                  placeholder="Ask the AI anything about your lesson..."
                  readOnly
                  style={{ background: "#141425", border: "1px solid rgba(124,58,237,0.15)", color: "#6b6890", fontFamily: "var(--font-family-body)" }}
                />
                <button
                  className="px-3 py-2 rounded-lg"
                  style={{ background: "#7C3AED", color: "white" }}
                >
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mb-6"
              style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa", fontFamily: "var(--font-family-mono)" }}
            >
              <Sparkles size={12} /> Powered by AI
            </div>
            <h2 style={{ fontFamily: "var(--font-family-display)", fontWeight: 800, fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)", color: "#f0eefc", letterSpacing: "-0.03em" }}>
              Your AI teaching<br />partner, always on
            </h2>
            <p className="mt-4 mb-8" style={{ color: "#6b6890", fontFamily: "var(--font-family-body)", lineHeight: 1.7 }}>
              The embedded AI assistant understands your canvas content, answers student questions, generates assessments, and creates lecture summaries — all in real time.
            </p>

            <div className="space-y-4">
              {[
                { icon: Cpu, label: "Math OCR", desc: "Recognizes handwritten equations and solves them" },
                { icon: Layout, label: "Diagram AI", desc: "Converts rough sketches to professional diagrams" },
                { icon: FileText, label: "Auto Notes", desc: "Generates structured notes from session content" },
                { icon: TrendingUp, label: "Quiz Generator", desc: "Creates assessments aligned to your lesson topic" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.2)" }}>
                      <Icon size={16} style={{ color: "#a78bfa" }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--font-family-display)", fontWeight: 600, color: "#f0eefc", fontSize: "0.9rem" }}>{item.label}</div>
                      <div style={{ fontFamily: "var(--font-family-body)", color: "#6b6890", fontSize: "0.8rem" }}>{item.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-24" style={{ borderTop: "1px solid rgba(124,58,237,0.08)" }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 style={{ fontFamily: "var(--font-family-display)", fontWeight: 800, fontSize: "clamp(1.8rem, 4vw, 2.5rem)", color: "#f0eefc", letterSpacing: "-0.03em" }}>
            Trusted by educators worldwide
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="p-5 rounded-2xl flex flex-col gap-4 transition-all hover:-translate-y-1 duration-200"
              style={{ background: "#0f0f1c", border: "1px solid rgba(124,58,237,0.1)" }}
            >
              <div className="flex gap-1">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} size={13} fill="#f59e0b" stroke="none" />
                ))}
              </div>
              <p style={{ fontFamily: "var(--font-family-body)", color: "#a0a0b8", fontSize: "0.85rem", lineHeight: 1.65, flex: 1 }}>"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)", fontFamily: "var(--font-family-display)" }}
                >
                  {t.avatar}
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-family-display)", fontWeight: 600, color: "#f0eefc", fontSize: "0.8rem" }}>{t.name}</div>
                  <div style={{ fontFamily: "var(--font-family-body)", color: "#6b6890", fontSize: "0.7rem" }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="py-24" style={{ borderTop: "1px solid rgba(124,58,237,0.08)" }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-14">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mb-6"
            style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa", fontFamily: "var(--font-family-mono)" }}
          >
            <Award size={12} /> Simple Pricing
          </div>
          <h2 style={{ fontFamily: "var(--font-family-display)", fontWeight: 800, fontSize: "clamp(1.8rem, 4vw, 2.8rem)", color: "#f0eefc", letterSpacing: "-0.03em" }}>
            Start free, scale as you grow
          </h2>
          <p className="mt-3" style={{ color: "#6b6890", fontFamily: "var(--font-family-body)" }}>No credit card required for the free tier.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.name}
              className="relative rounded-2xl p-6 flex flex-col gap-6 transition-all hover:-translate-y-1 duration-200"
              style={{
                background: plan.highlighted ? "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.08))" : "#0f0f1c",
                border: plan.highlighted ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(124,58,237,0.1)",
                boxShadow: plan.highlighted ? "0 0 50px rgba(124,58,237,0.15)" : "none",
              }}
            >
              {plan.highlighted && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)", color: "white", fontFamily: "var(--font-family-display)" }}
                >
                  Most Popular
                </div>
              )}

              <div>
                <div style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, color: "#f0eefc", fontSize: "1.1rem" }}>{plan.name}</div>
                <div style={{ fontFamily: "var(--font-family-body)", color: "#6b6890", fontSize: "0.8rem", marginTop: "4px" }}>{plan.desc}</div>
              </div>

              <div className="flex items-end gap-1">
                <span style={{ fontFamily: "var(--font-family-display)", fontWeight: 800, fontSize: "2.5rem", color: "#f0eefc", letterSpacing: "-0.04em" }}>{plan.price}</span>
                {plan.period && <span style={{ color: "#6b6890", fontFamily: "var(--font-family-body)", paddingBottom: "6px" }}>{plan.period}</span>}
              </div>

              <ul className="space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <Check size={13} style={{ color: plan.highlighted ? "#a78bfa" : "#10b981", shrink: 0 }} />
                    <span style={{ fontFamily: "var(--font-family-body)", color: "#a0a0b8", fontSize: "0.85rem" }}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/app"
                className="w-full py-3 rounded-xl text-sm font-semibold text-center transition-all hover:opacity-90"
                style={{
                  background: plan.highlighted ? "linear-gradient(135deg, #7C3AED, #5b21b6)" : "rgba(255,255,255,0.05)",
                  color: plan.highlighted ? "white" : "#c4bff5",
                  border: plan.highlighted ? "none" : "1px solid rgba(124,58,237,0.2)",
                  fontFamily: "var(--font-family-display)",
                  display: "block",
                }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-24" style={{ borderTop: "1px solid rgba(124,58,237,0.08)" }}>
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div
          className="rounded-3xl px-10 py-16 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.1))", border: "1px solid rgba(124,58,237,0.25)" }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(124,58,237,0.15) 0%, transparent 70%)" }}
          />
          <div className="relative">
            <h2 className="mb-4" style={{ fontFamily: "var(--font-family-display)", fontWeight: 800, fontSize: "clamp(1.8rem, 4vw, 2.8rem)", color: "#f0eefc", letterSpacing: "-0.03em" }}>
              Ready to transform<br />how you teach?
            </h2>
            <p className="mb-8 max-w-lg mx-auto" style={{ color: "#a0a0b8", fontFamily: "var(--font-family-body)", lineHeight: 1.7 }}>
              Join 50,000+ educators who have already upgraded their classrooms with AirCanvas-Pro. Start free, no credit card required.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                to="/app"
                className="flex items-center gap-2 px-8 py-4 rounded-xl text-white font-semibold transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg, #7C3AED, #5b21b6)", fontFamily: "var(--font-family-display)", boxShadow: "0 0 40px rgba(124,58,237,0.4)" }}
              >
                Start Building for Free <ArrowRight size={16} />
              </Link>
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.15)", color: "#c4bff5", fontFamily: "var(--font-family-display)" }}
              >
                View Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ borderTop: "1px solid rgba(124,58,237,0.1)" }}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)" }}>
                <PenTool size={14} className="text-white" />
              </div>
              <span style={{ fontFamily: "var(--font-family-display)", fontWeight: 700, color: "#f0eefc" }}>
                AirCanvas<span style={{ color: "#7C3AED" }}>Pro</span>
              </span>
            </div>
            <p style={{ fontFamily: "var(--font-family-body)", color: "#6b6890", fontSize: "0.85rem", lineHeight: 1.65, maxWidth: "240px" }}>
              The next-generation AI-powered whiteboard platform for educators, trainers, and teams.
            </p>
            <div className="mt-4" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.7rem", color: "#4a4a6a" }}>
              Developed by Jinay Golecha
            </div>
          </div>

          {[
            { heading: "Product", links: ["Features", "Pricing", "Changelog", "Roadmap"] },
            { heading: "Use Cases", links: ["Online Teaching", "Corporate Training", "Student Collaboration", "Research"] },
            { heading: "Company", links: ["About", "Blog", "Careers", "Contact"] },
          ].map((col) => (
            <div key={col.heading}>
              <div className="mb-4" style={{ fontFamily: "var(--font-family-display)", fontWeight: 600, color: "#f0eefc", fontSize: "0.85rem" }}>{col.heading}</div>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" style={{ fontFamily: "var(--font-family-body)", color: "#6b6890", fontSize: "0.8rem" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#c4bff5")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#6b6890")}
                    >{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-6" style={{ borderTop: "1px solid rgba(124,58,237,0.08)" }}>
          <span style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.7rem", color: "#4a4a6a" }}>
            © 2024 AirCanvas-Pro · All rights reserved
          </span>
          <div className="flex gap-6">
            {["Privacy", "Terms", "Security"].map((l) => (
              <a key={l} href="#" style={{ fontFamily: "var(--font-family-mono)", fontSize: "0.7rem", color: "#4a4a6a" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#6b6890")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#4a4a6a")}
              >{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div>
      <NavBar />
      <HeroSection />
      <StatsBar />
      <FeaturesSection />
      <AISection />
      <UseCasesSection />
      <TestimonialsSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
}

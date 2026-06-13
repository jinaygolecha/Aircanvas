import { Link } from "react-router";

export function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <div className="text-8xl font-bold text-primary opacity-30" style={{ fontFamily: "var(--font-family-display)" }}>404</div>
      <h1 className="text-2xl" style={{ fontFamily: "var(--font-family-display)" }}>Page not found</h1>
      <Link to="/" className="px-6 py-3 rounded-xl bg-primary text-white hover:opacity-90 transition-opacity">
        Back to Home
      </Link>
    </div>
  );
}

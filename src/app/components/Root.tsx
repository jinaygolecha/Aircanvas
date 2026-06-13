import { Outlet, useLocation } from "react-router";
import { Toaster } from "sonner";

export function Root() {
  const location = useLocation();
  const isApp = location.pathname === "/app";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Outlet />
      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: "#0f0f1c",
            border: "1px solid rgba(124,58,237,0.3)",
            color: "#f0eefc",
          },
        }}
      />
    </div>
  );
}

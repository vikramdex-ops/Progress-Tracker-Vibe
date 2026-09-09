import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "@/lib/auth";
import TestModeBar from "@/components/TestModeBar";
import { lazy, Suspense } from "react";
import LoginPage from "@/components/LoginPage";
import Header from "@/components/Header";
import { ToastProvider } from "@/components/ui/primitives";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const EmployeeDashboard = lazy(() => import("@/components/EmployeeDashboard"));
const TeamLeadDashboard = lazy(() => import("@/components/TeamLeadDashboard"));

function LoadingFallback() {
  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 py-8">
      <div className="space-y-6 animate-fade-in">
        <div className="h-24 w-full rounded-2xl skeleton" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-28 rounded-xl skeleton" />
          <div className="h-28 rounded-xl skeleton" />
          <div className="h-28 rounded-xl skeleton" />
          <div className="h-28 rounded-xl skeleton" />
        </div>
        <div className="h-64 w-full rounded-xl skeleton" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 * RequireAuth — blocks unauthenticated access, redirects to /login
 * ───────────────────────────────────────────────────────── */
function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-brand)] flex items-center justify-center animate-pulse text-white shadow-sm">
            <svg viewBox="0 0 30 30" className="w-5 h-5">
              <path d="M3 15 H12 V6 H24 V15 H27 M12 15 V24" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" />
              <circle cx="15" cy="15" r="2" fill="white" />
            </svg>
          </div>
          <span className="text-xs text-[var(--color-text-tertiary)] font-mono">Loading Progress Tracker…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

/* ─────────────────────────────────────────────────────────
 * RoleRoute — enforces role on a sub-tree
 * ───────────────────────────────────────────────────────── */
function RoleRoute({ allowed }: { allowed: ("employee" | "team_lead")[] }) {
  const { user } = useAuth();

  if (!user || !allowed.includes(user.role)) {
    if (user?.role === "team_lead") return <Navigate to="/team" replace />;
    if (user?.role === "employee") return <Navigate to="/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

/* ─────────────────────────────────────────────────────────
 * AppShell — wraps authenticated pages with Header + main
 * ───────────────────────────────────────────────────────── */
function AppShell() {
  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-4rem)]">
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
    </>
  );
}

function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-8 text-center rise-in">
      <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center mb-4 shadow-sm">
        <span className="text-2xl">🧭</span>
      </div>
      <h1 className="text-4xl font-extrabold text-[var(--color-text-primary)] tracking-tight">404</h1>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)] max-w-sm">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg bg-[var(--color-brand)] px-4 py-2.5 text-sm font-medium text-white hover:brightness-105 shadow-sm cursor-pointer transition-all"
        >
          Go Back
        </button>
        <button
          onClick={() => navigate("/")}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-default)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] cursor-pointer transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes — require auth + shell */}
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              {/* Root: redirect by role */}
              <Route
                index
                element={
                  <RootRedirect />
                }
              />
              {/* Employee dashboard (employee + team_lead) */}
              <Route element={<RoleRoute allowed={["employee", "team_lead"]} />}>
                <Route path="dashboard/*" element={<EmployeeDashboard />} />
              </Route>
              {/* Team lead (team_lead only) */}
              <Route element={<RoleRoute allowed={["team_lead"]} />}>
                <Route path="team/*" element={<TeamLeadDashboard />} />
              </Route>
            </Route>
          </Route>

          {/* 404 fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>

        {/* Floating test-mode HUD (renders only while test mode is active) */}
        <TestModeBar />
      </BrowserRouter>
    </ToastProvider>
  );
}

/* ─────────────────────────────────────────────────────────
 * RootRedirect — sends / to the role-appropriate default route
 * ───────────────────────────────────────────────────────── */
function RootRedirect() {
  const { user } = useAuth();
  if (user?.role === "team_lead") return <Navigate to="/team" replace />;
  return <Navigate to="/dashboard" replace />;
}

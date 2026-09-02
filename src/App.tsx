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
import { lazy, Suspense } from "react";
import LoginPage from "@/components/LoginPage";
import Header from "@/components/Header";
import { ToastProvider } from "@/components/ui/primitives";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const EmployeeDashboard = lazy(() => import("@/components/EmployeeDashboard"));
const TeamLeadDashboard = lazy(() => import("@/components/TeamLeadDashboard"));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--color-border-focus)] border-t-transparent animate-spin" />
        <span className="text-sm text-[var(--color-text-tertiary)]">Loading…</span>
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
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-[var(--color-text-tertiary)]">Loading…</span>
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
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] flex items-center justify-center mb-4">
        <span className="text-2xl">🔍</span>
      </div>
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">404</h1>
      <p className="mt-2 text-sm text-[var(--color-text-tertiary)]">Page not found — check the URL or return to your dashboard.</p>
      <button
        onClick={() => navigate(-1)}
        className="mt-4 rounded-lg bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-90"
      >
        Go back
      </button>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
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

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
import LoginPage from "@/components/LoginPage";
import Header from "@/components/Header";
import EmployeeDashboard from "@/components/EmployeeDashboard";
import TeamLeadDashboard from "@/components/TeamLeadDashboard";
import { ToastProvider } from "@/components/ui/primitives";

/* ─────────────────────────────────────────────────────────
 * RequireAuth — blocks unauthenticated access, redirects to /login
 * ───────────────────────────────────────────────────────── */
function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-(--color-text-secondary)">Loading…</span>
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
        <Outlet />
      </main>
    </>
  );
}

function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-display font-bold text-(--color-text-primary)">
        404
      </h1>
      <p className="mt-2 text-(--color-text-secondary)">Page not found</p>
      <button
        onClick={() => navigate(-1)}
        className="mt-4 rounded-md bg-(--color-brand) px-4 py-2 text-sm font-semibold text-white hover:brightness-90"
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

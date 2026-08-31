import { AuthProvider, useAuth } from "@/lib/auth";
import LoginPage from "@/components/LoginPage";
import Header from "@/components/Header";
import EmployeeDashboard from "@/components/EmployeeDashboard";
import TeamLeadDashboard from "@/components/TeamLeadDashboard";

function AppInner() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] bg-mesh">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-500/20 animate-float">
            <svg viewBox="0 0 30 30" className="w-7 h-7">
              <path d="M3 15 H12 V6 H24 V15 H27 M12 15 V24" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="15" cy="15" r="2" fill="white" />
            </svg>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">ProgressTracker</span>
            <div className="w-24 h-1 rounded-full bg-[var(--color-border)] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 animate-shimmer" style={{ width: "60%" }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <div className="min-h-screen bg-[var(--color-background)] bg-mesh">
      <Header />
      <main className="pb-16 lg:pb-20">
        {user.role === "team_lead" ? <TeamLeadDashboard /> : <EmployeeDashboard />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

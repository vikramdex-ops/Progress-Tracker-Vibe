import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { authApi, setAuthToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, Lock, ArrowRight, Eye, EyeOff, Shield, Sparkles, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [forceChange, setForceChange] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setForgotSuccess("");
    setLoading(true);
    try {
      await authApi.forgotPassword(forgotEmail);
      setForgotSuccess("Your request has been sent to the team lead. They will reset your password shortly.");
      setForgotEmail("");
    } catch (err: any) {
      setError(err.message || "Failed to send request");
    } finally {
      setLoading(false);
    }
  };

  const [loginHint, setLoginHint] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoginHint("");
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.forcePasswordChange) setForceChange(true);
    } catch (err: any) {
      const msg = err.message || "Invalid email or password";
      setError(msg);
      // Show a hint if the error mentions account not found
      if (msg.includes("No account found")) {
        setLoginHint("Try your full name or the email your team lead registered for you.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPw.length < 4) { setError("Password must be at least 4 characters"); return; }
    if (newPw !== confirmPw) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      await authApi.changePassword(password, newPw);
      setPassword(newPw);
      setForceChange(false);
    } catch (err: any) {
      setError(err.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  /* ── Force-change screen ── */
  if (forceChange) {
    return (
      <div className="min-h-screen flex bg-[var(--color-background)]">
        {/* Left decoration */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 items-center justify-center">
          <div className="absolute inset-0 bg-mesh opacity-30" />
          {/* Floating orbs */}
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white/10 animate-morph" />
          <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full bg-white/10 animate-morph" style={{ animationDelay: "2s" }} />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full bg-white/5 animate-float" />
          <div className="relative z-10 text-center px-12">
            <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 animate-float">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">Secure Your Account</h1>
            <p className="text-lg text-white/80 max-w-md">Set a personal password to protect your workspace. Your credentials are encrypted and secure.</p>
          </div>
        </div>

        {/* Right form */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md animate-slide-up">
            <button onClick={() => setForceChange(false)} className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] mb-8 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to login
            </button>

            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-6 shadow-xl shadow-amber-500/20">
              <Lock className="w-7 h-7 text-white" />
            </div>

            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">Change Your Password</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-8">This is your first login. Please set a secure password.</p>

            <form onSubmit={handleChangePw} className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2 block">New Password</label>
                <div className="relative">
                  <Input type={showPw ? "text" : "password"} value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min 4 characters" className="pr-11" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2 block">Confirm Password</label>
                <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Repeat password" />
              </div>
              {error && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? "Saving..." : "Set Password & Continue"} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* ── Forgot Password screen ── */
  if (forgotMode) {
    return (
      <div className="min-h-screen flex bg-[var(--color-background)]">
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 items-center justify-center">
          <div className="absolute inset-0 bg-mesh opacity-30" />
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white/10 animate-morph" />
          <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full bg-white/10 animate-morph" style={{ animationDelay: "2s" }} />
          <div className="relative z-10 text-center px-12">
            <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 animate-float">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">Password Reset</h1>
            <p className="text-lg text-white/80 max-w-md">Enter your email and we'll notify the team lead to reset your password.</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md animate-slide-up">
            <button onClick={() => { setForgotMode(false); setError(""); setForgotSuccess(""); }} className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] mb-8 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to login
            </button>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center mb-6 shadow-xl shadow-blue-500/20">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">Forgot Password?</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-8">Enter your registered email. The team lead will be notified and will reset your password.</p>
            {forgotSuccess ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 text-sm px-5 py-4 rounded-xl mb-6">
                {forgotSuccess}
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2 block">Email Address</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className="flex h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/30 focus-visible:border-blue-400 transition-all duration-200"
                  />
                </div>
                {error && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    {error}
                  </div>
                )}
                <Button type="submit" disabled={loading} className="w-full bg-blue-500 hover:bg-blue-600" size="lg">
                  {loading ? "Sending..." : "Send Reset Request"} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Login screen ── */
  return (
    <div className="min-h-screen flex bg-[var(--color-background)]">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 items-center justify-center">
        <div className="absolute inset-0 bg-mesh opacity-20" />

        {/* Decorative floating elements */}
        <div className="absolute top-[15%] left-[10%] w-72 h-72 rounded-full bg-white/8 animate-morph" />
        <div className="absolute bottom-[15%] right-[5%] w-56 h-56 rounded-full bg-white/8 animate-morph" style={{ animationDelay: "3s" }} />
        <div className="absolute top-[60%] left-[30%] w-36 h-36 rounded-full bg-white/5 animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute top-[10%] right-[20%] w-20 h-20 rounded-full bg-white/10 animate-float" style={{ animationDelay: "2s" }} />

        {/* Orbiting dots */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px]">
          <div className="absolute top-0 left-1/2 w-3 h-3 rounded-full bg-white/30 animate-orbit" />
          <div className="absolute top-0 left-1/2 w-2 h-2 rounded-full bg-white/20 animate-orbit" style={{ animationDelay: "-7s", animationDuration: "25s" }} />
        </div>

        <div className="relative z-10 text-center px-16 max-w-lg">
          {/* Logo */}
          <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-8 shadow-2xl animate-float">
            <svg viewBox="0 0 30 30" className="w-10 h-10">
              <path d="M3 15 H12 V6 H24 V15 H27 M12 15 V24" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="15" cy="15" r="2" fill="white" opacity="0.9" />
            </svg>
          </div>

          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">Progress<br />Tracker</h1>
          <p className="text-xl text-white/80 mb-10 font-medium">Daily EOD · Team Vikram</p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { icon: <Sparkles className="w-3.5 h-3.5" />, label: "XP & Levels" },
              { icon: <Zap className="w-3.5 h-3.5" />, label: "Live Streaks" },
              { icon: <Shield className="w-3.5 h-3.5" />, label: "Secure Login" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full border border-white/10">
                {f.icon} {f.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
        {/* Subtle background pattern for light mode */}
        <div className="absolute inset-0 bg-mesh opacity-50" />

        <div className="w-full max-w-md relative z-10 animate-slide-up">
          {/* Mobile-only brand */}
          <div className="lg:hidden text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-500/20">
              <svg viewBox="0 0 30 30" className="w-8 h-8">
                <path d="M3 15 H12 V6 H24 V15 H27 M12 15 V24" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="15" cy="15" r="2" fill="white" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Progress<span className="gradient-text">Tracker</span>
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">Daily EOD · Team Vikram</p>
          </div>

          {/* Form card */}
          <div className="bg-[var(--color-surface)] rounded-3xl p-8 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-[var(--color-border)]/60">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">Welcome back</h2>
              <p className="text-sm text-[var(--color-text-muted)]">Sign in to access your dashboard</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="flex h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/30 focus-visible:border-amber-400 transition-all duration-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2 block">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="flex h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 pr-11 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/30 focus-visible:border-amber-400 transition-all duration-200"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors p-1">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex justify-end -mt-1">
                  <button type="button" onClick={() => { setForgotMode(true); setError(""); }} className="text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors">
                    Forgot Password?
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />
                  <div>
                    <div>{error}</div>
                    {loginHint && (
                      <div className="text-xs text-red-400 dark:text-red-500 mt-1 opacity-80">{loginHint}</div>
                    )}
                  </div>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Signing in...
                  </span>
                ) : (
                  <>Sign In <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-[var(--color-text-muted)] mt-6">
            Secure, encrypted connection · Team Vikram
          </p>
        </div>
      </div>
    </div>
  );
}

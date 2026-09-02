import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ShaderBackground from "@/components/ShaderBackground";
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
  const [loginHint, setLoginHint] = useState("");

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

  /* ── Force-change screen — Calm Glass flat brand surface + overdrive shader ── */
  if (forceChange) {
    return (
      <div className="min-h-screen flex bg-[var(--color-bg)]">
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[var(--color-brand)] items-center justify-center">
          <ShaderBackground />
          <div className="relative z-10 text-center px-12 max-w-md">
            <div className="w-20 h-20 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Secure Your Account</h1>
            <p className="text-[15px] text-white/80 leading-relaxed">Set a personal password to protect your workspace. Your credentials are encrypted and secure.</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-[var(--color-bg)]">
          <div className="w-full max-w-md">
            <button onClick={() => setForceChange(false)} className="flex items-center gap-2 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] mb-8 transition-colors duration-[var(--duration-fast)]">
              <ArrowLeft className="w-4 h-4" /> Back to login
            </button>
            <div className="w-14 h-14 rounded-xl bg-[var(--color-surface-brand)] border border-[var(--color-brand-200)] flex items-center justify-center mb-6">
              <Lock className="w-7 h-7 text-[var(--color-brand)]" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">Change Your Password</h2>
            <p className="text-sm text-[var(--color-text-tertiary)] mb-8">This is your first login. Please set a secure password.</p>
            <form onSubmit={handleChangePw} className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2 block">New Password</label>
                <div className="relative">
                  <Input type={showPw ? "text" : "password"} value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min 4 characters" className="pr-11" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2 block">Confirm Password</label>
                <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Repeat password" />
              </div>
              {error && (
                <div className="bg-[var(--color-surface-alert)] border border-[var(--color-red-200)] text-[var(--color-alert)] text-sm px-4 py-3 rounded-lg">
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

  /* ── Forgot Password — flat brand surface + overdrive shader ── */
  if (forgotMode) {
    return (
      <div className="min-h-screen flex bg-[var(--color-bg)]">
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[var(--color-brand)] items-center justify-center">
          <ShaderBackground />
          <div className="relative z-10 text-center px-12 max-w-md">
            <div className="w-20 h-20 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Password Reset</h1>
            <p className="text-[15px] text-white/80 leading-relaxed">Enter your email and we'll notify the team lead to reset your password.</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-[var(--color-bg)]">
          <div className="w-full max-w-md">
            <button onClick={() => { setForgotMode(false); setError(""); setForgotSuccess(""); }} className="flex items-center gap-2 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] mb-8 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to login
            </button>
            <div className="w-14 h-14 rounded-xl bg-[var(--color-surface-brand)] border border-[var(--color-brand-200)] flex items-center justify-center mb-6">
              <Lock className="w-7 h-7 text-[var(--color-brand)]" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">Forgot Password?</h2>
            <p className="text-sm text-[var(--color-text-tertiary)] mb-8">Enter your registered email. The team lead will be notified and will reset your password.</p>
            {forgotSuccess ? (
              <div className="bg-[var(--color-surface-completion)] border border-[var(--color-emerald-200)] text-[var(--color-emerald-700)] text-sm px-5 py-4 rounded-lg mb-6">
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
                    className="flex h-11 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]/30 focus-visible:border-[var(--color-border-focus)] transition-all duration-[var(--duration-fast)]"
                  />
                </div>
                {error && (
                  <div className="bg-[var(--color-surface-alert)] border border-[var(--color-red-200)] text-[var(--color-alert)] text-sm px-4 py-3 rounded-lg flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-alert)] flex-shrink-0" />
                    {error}
                  </div>
                )}
                <Button type="submit" disabled={loading} variant="secondary" className="w-full" size="lg">
                  {loading ? "Sending..." : "Send Reset Request"} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Login — Calm Glass: flat indigo left + overdrive shader ── */
  return (
    <div className="min-h-screen flex bg-[var(--color-bg)]">
      {/* Left branding panel — flat brand fill + shader overdrive */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-[var(--color-brand)] items-center justify-center border-r border-white/10">
        <ShaderBackground />
        <div className="relative z-10 text-center px-16 max-w-lg">
          <div className="w-20 h-20 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mx-auto mb-8">
            <svg viewBox="0 0 30 30" className="w-10 h-10">
              <path d="M3 15 H12 V6 H24 V15 H27 M12 15 V24" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="15" cy="15" r="2" fill="white" opacity="0.9" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight leading-none">Progress<br />Tracker</h1>
          <p className="text-lg text-white/80 mb-10 font-medium">Daily EOD · Team Vikram</p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {[
              { icon: <Sparkles className="w-3.5 h-3.5" />, label: "XP & Levels" },
              { icon: <Zap className="w-3.5 h-3.5" />, label: "Live Streaks" },
              { icon: <Shield className="w-3.5 h-3.5" />, label: "Secure Login" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 bg-white/12 border border-white/15 text-white text-sm font-medium px-4 py-2 rounded-full">
                {f.icon} {f.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-14 xl:p-20 bg-[var(--color-bg)]">
        <div className="w-full max-w-md">
          {/* Mobile-only brand — flat */}
          <div className="lg:hidden text-center mb-10">
            <div className="w-16 h-16 rounded-xl bg-[var(--color-brand)] flex items-center justify-center mx-auto mb-4 shadow-elevated">
              <svg viewBox="0 0 30 30" className="w-8 h-8">
                <path d="M3 15 H12 V6 H24 V15 H27 M12 15 V24" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="15" cy="15" r="2" fill="white" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Progress<span className="text-[var(--color-brand)]">Tracker</span>
            </h1>
            <p className="text-sm text-[var(--color-text-tertiary)] mt-1">Daily EOD · Team Vikram</p>
          </div>

          {/* Form card — Calm Glass default surface */}
          <div className="bg-[var(--color-surface)] rounded-xl p-7 sm:p-8 lg:p-10 shadow-elevated border border-[var(--color-border)]">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">Welcome back</h2>
              <p className="text-sm text-[var(--color-text-tertiary)]">Sign in to access your dashboard</p>
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
                  className="flex h-11 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]/30 focus-visible:border-[var(--color-border-focus)] transition-all duration-[var(--duration-fast)]"
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
                    className="flex h-11 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-4 pr-11 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]/30 focus-visible:border-[var(--color-border-focus)] transition-all duration-[var(--duration-fast)]"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors p-1">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex justify-end mt-2">
                  <button type="button" onClick={() => { setForgotMode(true); setError(""); }} className="text-xs text-[var(--color-brand)] hover:brightness-90 font-medium transition-colors">
                    Forgot Password?
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-[var(--color-surface-alert)] border border-[var(--color-red-200)] text-[var(--color-alert)] text-sm px-4 py-3 rounded-lg flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-alert)] flex-shrink-0 mt-1.5" />
                  <div>
                    <div>{error}</div>
                    {loginHint && (
                      <div className="text-xs opacity-80 mt-1">{loginHint}</div>
                    )}
                  </div>
                </div>
              )}

              <Button type="submit" disabled={loading} variant="secondary" className="w-full" size="lg">
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

          <p className="text-center text-xs text-[var(--color-text-tertiary)] mt-6">
            Secure, encrypted connection · Team Vikram
          </p>
        </div>
      </div>
    </div>
  );
}

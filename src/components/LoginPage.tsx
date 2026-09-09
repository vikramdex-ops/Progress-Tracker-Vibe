import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ShaderBackground from "@/components/ShaderBackground";
import { Zap, Lock, ArrowRight, Eye, EyeOff, Shield, Sparkles, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
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
      if (result.forcePasswordChange) {
        setForceChange(true);
        return;
      }
      navigate("/", { replace: true });
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
      const result = await login(email, newPw);
      if (result.forcePasswordChange) {
        setForceChange(true);
        return;
      }
      setPassword(newPw);
      setForceChange(false);
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  /* ── Force-change screen ── */
  if (forceChange) {
    const isStrong = newPw.length >= 6;
    return (
      <div className="min-h-screen flex bg-[var(--color-bg)]">
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[var(--color-brand)] items-center justify-center">
          <ShaderBackground />
          <svg viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full opacity-40" aria-hidden>
            <path d="M-20 200 H260 V420 H820" stroke="white" strokeWidth="1.5" fill="none" className="pipeline-flow" />
            <path d="M-20 600 H520 V760 H820" stroke="white" strokeWidth="1.5" fill="none" className="pipeline-flow" style={{ animationDelay: "-0.7s" }} />
            <circle cx="260" cy="200" r="5" fill="white" opacity="0.9" />
            <circle cx="520" cy="600" r="5" fill="white" opacity="0.9" />
          </svg>
          <div className="relative z-10 text-center px-12 max-w-md">
            <div className="w-20 h-20 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mx-auto mb-6 rise-in">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3 tracking-tight word-reveal">
              <span>Secure</span> <span>Your Account</span>
            </h1>
            <p className="text-[15px] text-white/80 leading-relaxed rise-in d2">Set a personalized password to protect your workspace. Your credentials are fully encrypted.</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-[var(--color-bg)]">
          <div className="w-full max-w-md">
            <button onClick={() => setForceChange(false)} className="flex items-center gap-2 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] mb-8 transition-colors duration-[var(--duration-fast)] cursor-pointer">
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </button>
            <div className="w-14 h-14 rounded-xl bg-[var(--color-surface-brand)] border border-[var(--color-brand-200)] dark:border-[var(--color-brand-800)] flex items-center justify-center mb-6 shadow-xs">
              <Lock className="w-7 h-7 text-[var(--color-brand)]" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight mb-1">Set New Password</h2>
            <p className="text-sm text-[var(--color-text-tertiary)] mb-8">First login detected. Please choose a secure password to continue.</p>
            <form onSubmit={handleChangePw} className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2 block">New Password</label>
                <div className="relative">
                  <Input
                    type={showPw ? "text" : "password"}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="Minimum 4 characters"
                    className="pr-11"
                    error={!!error}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPw.length > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <div className="flex-1 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${isStrong ? "w-full bg-[var(--color-completion)]" : "w-1/2 bg-[var(--color-progress)]"}`}
                      />
                    </div>
                    <span className={isStrong ? "text-[var(--color-completion)] font-medium" : "text-[var(--color-progress)] font-medium"}>
                      {isStrong ? "Good" : "Fair"}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2 block">Confirm Password</label>
                <Input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Re-enter password"
                  error={!!error && newPw !== confirmPw}
                />
              </div>
              {error && (
                <div className="bg-[var(--color-surface-alert)] border border-[var(--color-red-200)] dark:border-[var(--color-red-800)] text-[var(--color-alert)] text-sm px-4 py-3 rounded-lg flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-alert)] flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Button type="submit" loading={loading} className="w-full" size="lg">
                Save & Continue <ArrowRight className="w-4 h-4 ml-2" />
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
          <svg viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full opacity-40" aria-hidden>
            <path d="M-20 300 H300 V500 H820" stroke="white" strokeWidth="1.5" fill="none" className="pipeline-flow" />
            <path d="M-20 700 H200 V820" stroke="white" strokeWidth="1.5" fill="none" className="pipeline-flow" style={{ animationDelay: "-0.6s" }} />
            <circle cx="300" cy="300" r="5" fill="white" opacity="0.9" />
            <circle cx="200" cy="700" r="5" fill="white" opacity="0.9" />
          </svg>
          <div className="relative z-10 text-center px-12 max-w-md">
            <div className="w-20 h-20 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mx-auto mb-6 rise-in">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3 tracking-tight word-reveal">
              <span>Password</span> <span>Reset</span>
            </h1>
            <p className="text-[15px] text-white/80 leading-relaxed rise-in d2">Enter your email and we'll notify the team lead to reset your password.</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-[var(--color-bg)]">
          <div className="w-full max-w-md">
            <button onClick={() => { setForgotMode(false); setError(""); setForgotSuccess(""); }} className="flex items-center gap-2 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] mb-8 transition-colors cursor-pointer">
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </button>
            <div className="w-14 h-14 rounded-xl bg-[var(--color-surface-brand)] border border-[var(--color-brand-200)] dark:border-[var(--color-brand-800)] flex items-center justify-center mb-6 shadow-xs">
              <Lock className="w-7 h-7 text-[var(--color-brand)]" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight mb-1">Reset Password</h2>
            <p className="text-sm text-[var(--color-text-tertiary)] mb-8">Enter your registered email address. Your team lead will be alerted to issue a temporary password.</p>
            {forgotSuccess ? (
              <div className="bg-[var(--color-surface-completion)] border border-[var(--color-emerald-200)] dark:border-[var(--color-emerald-800)] text-[var(--color-completion)] text-sm px-5 py-4 rounded-xl mb-6 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-[var(--color-text-primary)] mb-1">Request Submitted</div>
                  <div className="text-xs leading-relaxed">{forgotSuccess}</div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2 block">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="engineer@company.com"
                      required
                      className="pl-10"
                      error={!!error}
                    />
                  </div>
                </div>
                {error && (
                  <div className="bg-[var(--color-surface-alert)] border border-[var(--color-red-200)] dark:border-[var(--color-red-800)] text-[var(--color-alert)] text-sm px-4 py-3 rounded-lg flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-alert)] flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <Button type="submit" loading={loading} className="w-full" size="lg">
                  Send Reset Request <ArrowRight className="w-4 h-4 ml-2" />
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
        <svg viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full opacity-40" aria-hidden>
          <path d="M-20 140 H300 V320 H560" stroke="white" strokeWidth="1.5" fill="none" className="pipeline-flow" />
          <path d="M-20 520 H180 V660 H820" stroke="white" strokeWidth="1.5" fill="none" className="pipeline-flow" style={{ animationDelay: "-0.5s" }} />
          <path d="M240 -20 V80 M240 80 H420 V820" stroke="white" strokeWidth="1.5" fill="none" className="pipeline-flow" style={{ animationDelay: "-0.9s" }} />
          <circle cx="300" cy="140" r="5" fill="white" opacity="0.9" />
          <circle cx="180" cy="520" r="5" fill="white" opacity="0.9" />
          <circle cx="420" cy="80" r="5" fill="white" opacity="0.9" />
        </svg>
        <div className="relative z-10 text-center px-16 max-w-lg">
          <div className="w-20 h-20 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mx-auto mb-8 rise-in shadow-sm">
            <svg viewBox="0 0 30 30" className="w-10 h-10">
              <path d="M3 15 H12 V6 H24 V15 H27 M12 15 V24" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="15" cy="15" r="2" fill="white" opacity="0.9" />
            </svg>
          </div>
          <h1 className="text-5xl font-extrabold text-white mb-3 tracking-tight leading-none word-reveal">
            <span>Progress</span><br /><span>Tracker</span>
          </h1>
          <p className="text-base text-white/85 mb-8 font-medium rise-in d2">Dexterity Design Services · Team Vikram</p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {[
              { icon: <Sparkles className="w-3.5 h-3.5" />, label: "XP & Levels" },
              { icon: <Zap className="w-3.5 h-3.5" />, label: "Momentum Streaks" },
              { icon: <Shield className="w-3.5 h-3.5" />, label: "Encrypted Auth" },
            ].map((f, i) => (
              <div key={f.label} className={`flex items-center gap-2 bg-white/12 border border-white/15 text-white text-xs font-medium px-3.5 py-1.5 rounded-full rise-in d${i + 3}`}>
                {f.icon} {f.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-14 xl:p-20 bg-[var(--color-bg)]">
        <div className="w-full max-w-md">
          {/* Mobile-only brand */}
          <div className="lg:hidden text-center mb-8 rise-in">
            <div className="w-14 h-14 rounded-xl bg-[var(--color-brand)] flex items-center justify-center mx-auto mb-3 shadow-sm text-white">
              <svg viewBox="0 0 30 30" className="w-7 h-7">
                <path d="M3 15 H12 V6 H24 V15 H27 M12 15 V24" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="15" cy="15" r="2" fill="white" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
              Progress <span className="text-[var(--color-brand)]">Tracker</span>
            </h1>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">Dexterity Design Services</p>
          </div>

          {/* Form card */}
          <div className="bg-[var(--color-surface-default)] rounded-2xl p-7 sm:p-8 lg:p-9 shadow-card border border-[var(--color-border)] rise-in d2">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight mb-1">Welcome back</h2>
              <p className="text-sm text-[var(--color-text-tertiary)]">Sign in to record your daily EOD and track your progress</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5 block">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="engineer@company.com"
                    required
                    className="pl-10"
                    error={!!error}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5 block">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="pl-10 pr-10"
                    error={!!error}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors p-1 cursor-pointer">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex justify-end mt-1.5">
                  <button type="button" onClick={() => { setForgotMode(true); setError(""); }} className="text-xs text-[var(--color-brand)] hover:brightness-110 font-medium transition-colors cursor-pointer">
                    Forgot Password?
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-[var(--color-surface-alert)] border border-[var(--color-red-200)] dark:border-[var(--color-red-800)] text-[var(--color-alert)] text-sm px-4 py-3 rounded-xl flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-alert)] flex-shrink-0 mt-1.5" />
                  <div>
                    <div className="font-medium">{error}</div>
                    {loginHint && (
                      <div className="text-xs opacity-85 mt-1">{loginHint}</div>
                    )}
                  </div>
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
                Sign In to Dashboard <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-[var(--color-text-tertiary)] mt-6">
            Dexterity Design Services · Secured by encrypted authentication
          </p>
        </div>
      </div>
    </div>
  );
}

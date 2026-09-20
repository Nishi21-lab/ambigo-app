import { useState } from "react";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Logo } from "../components/UI/Logo";

type AuthView = "login" | "register" | "forgot";

interface AuthState {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  vehicleId: string;
}

interface AuthPageProps {
  onAuth: (user: { name: string; email: string }) => void;
}

import { authApi } from "../services/api";

export function AuthPage({ onAuth }: AuthPageProps) {
  const [view, setView] = useState<AuthView>("login");
  const [form, setForm] = useState<AuthState>({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    vehicleId: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const set = (key: keyof AuthState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const reset = (next: AuthView) => {
    setError(null);
    setSuccess(null);
    setForm({ email: "", password: "", confirmPassword: "", name: "", vehicleId: "" });
    setView(next);
  };

  /* ── Submit handlers ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { token, driver } = await authApi.login({
        email: form.email,
        password: form.password,
      });
      localStorage.setItem("ambigo_token", token);
      onAuth({ name: driver.name, email: driver.email });
    } catch (err: any) {
      setError(err.message || "Failed to login.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { token, driver } = await authApi.register({
        name: form.name,
        email: form.email,
        password: form.password,
        vehicleId: form.vehicleId,
      });
      localStorage.setItem("ambigo_token", token);
      onAuth({ name: driver.name, email: driver.email });
    } catch (err: any) {
      setError(err.message || "Failed to register.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 900));
    // Simulated forgot password
    setLoading(false);
    setSuccess(`A reset link has been sent to ${form.email}. Check your inbox.`);
  };

  const passwordStrength = (pw: string) => {
    if (pw.length === 0) return null;
    if (pw.length < 6) return { label: "Weak", color: "bg-alert-red", w: "w-1/4" };
    if (pw.length < 8) return { label: "Fair", color: "bg-alert-amber", w: "w-1/2" };
    if (/[^a-zA-Z0-9]/.test(pw) && /[A-Z]/.test(pw))
      return { label: "Strong", color: "bg-alert-green", w: "w-full" };
    return { label: "Good", color: "bg-ambigo-300", w: "w-3/4" };
  };
  const strength = view === "register" ? passwordStrength(form.password) : null;

  return (
    <div className="min-h-screen bg-ambigo-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* ── Ambient glow orbs ── */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-ambigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-alert-red/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-64 h-64 bg-alert-blue/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* ── Logo ── */}
        <div className="flex flex-col items-center mb-8 animate-bounce-subtle">
          <Logo variant="full" size={52} showSubtitle className="mb-2" />
          <p className="text-ambigo-500 text-sm mt-1">Emergency Route Management</p>
        </div>

        {/* ── Card ── */}
        <div className="glass-card p-8 shadow-2xl shadow-black/40">
          {/* Login View */}
          {view === "login" && (
            <form onSubmit={handleLogin} className="space-y-5 animate-fade-in" key="login">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">Welcome back</h2>
                <p className="text-ambigo-400 text-sm mt-1">Sign in to your driver account</p>
              </div>

              <AlertMessage error={error} success={success} />

              <Field label="Email address" icon={<Mail className="w-4 h-4" />}>
                <input
                  id="login-email"
                  type="email"
                  placeholder="driver@hospital.com"
                  value={form.email}
                  onChange={set("email")}
                  className="glass-input w-full pl-10"
                  required
                  autoComplete="email"
                />
              </Field>

              <Field label="Password" icon={<Lock className="w-4 h-4" />}>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={set("password")}
                  className="glass-input w-full pl-10 pr-10"
                  required
                  autoComplete="current-password"
                />
                <ToggleEye show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
              </Field>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => reset("forgot")}
                  className="text-xs text-ambigo-400 hover:text-ambigo-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <SubmitButton loading={loading} label="Sign In" icon={<ShieldCheck className="w-4 h-4" />} />

              <p className="text-center text-sm text-ambigo-500">
                New to AmbiGo?{" "}
                <button
                  type="button"
                  onClick={() => reset("register")}
                  className="text-ambigo-300 hover:text-white font-semibold transition-colors"
                >
                  Create an account
                </button>
              </p>
            </form>
          )}

          {/* Register View */}
          {view === "register" && (
            <form onSubmit={handleRegister} className="space-y-4 animate-fade-in" key="register">
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => reset("login")}
                  className="flex items-center gap-1.5 text-ambigo-400 hover:text-white transition-colors text-sm mb-4"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to login
                </button>
                <h2 className="text-xl font-bold text-white">Create account</h2>
                <p className="text-ambigo-400 text-sm mt-1">Join AmbiGo as a driver</p>
              </div>

              <AlertMessage error={error} success={success} />

              <Field label="Full name" icon={<User className="w-4 h-4" />}>
                <input
                  id="reg-name"
                  type="text"
                  placeholder="Raj Mehta"
                  value={form.name}
                  onChange={set("name")}
                  className="glass-input w-full pl-10"
                  required
                  autoComplete="name"
                />
              </Field>

              <Field label="Email address" icon={<Mail className="w-4 h-4" />}>
                <input
                  id="reg-email"
                  type="email"
                  placeholder="driver@hospital.com"
                  value={form.email}
                  onChange={set("email")}
                  className="glass-input w-full pl-10"
                  required
                  autoComplete="email"
                />
              </Field>

              <div>
                <label className="block text-xs text-ambigo-400 mb-1.5 font-medium">
                  Vehicle ID
                </label>
                <input
                  id="reg-vehicle"
                  type="text"
                  placeholder="GJ-01-Z-1234"
                  value={form.vehicleId}
                  onChange={set("vehicleId")}
                  className="glass-input w-full"
                  required
                />
              </div>

              <Field label="Password" icon={<Lock className="w-4 h-4" />}>
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={set("password")}
                  className="glass-input w-full pl-10 pr-10"
                  required
                  autoComplete="new-password"
                />
                <ToggleEye show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
              </Field>

              {/* Password strength */}
              {strength && (
                <div className="space-y-1 -mt-2">
                  <div className="h-1 w-full bg-ambigo-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.w}`} />
                  </div>
                  <p className={`text-xs ${strength.color.replace("bg-", "text-")}`}>
                    {strength.label} password
                  </p>
                </div>
              )}

              <Field label="Confirm password" icon={<Lock className="w-4 h-4" />}>
                <input
                  id="reg-confirm"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={form.confirmPassword}
                  onChange={set("confirmPassword")}
                  className="glass-input w-full pl-10 pr-10"
                  required
                  autoComplete="new-password"
                />
                <ToggleEye show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-xs text-alert-red mt-1">Passwords don't match</p>
                )}
              </Field>

              <SubmitButton loading={loading} label="Create Account" icon={<Sparkles className="w-4 h-4" />} />

              <p className="text-center text-sm text-ambigo-500">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => reset("login")}
                  className="text-ambigo-300 hover:text-white font-semibold transition-colors"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}

          {/* Forgot Password View */}
          {view === "forgot" && (
            <form onSubmit={handleForgot} className="space-y-5 animate-fade-in" key="forgot">
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => reset("login")}
                  className="flex items-center gap-1.5 text-ambigo-400 hover:text-white transition-colors text-sm mb-4"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to login
                </button>
                <div className="w-12 h-12 rounded-xl bg-ambigo-800/60 border border-ambigo-600/40 flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6 text-ambigo-300" />
                </div>
                <h2 className="text-xl font-bold text-white">Forgot password?</h2>
                <p className="text-ambigo-400 text-sm mt-1">
                  Enter your email and we'll send you a reset link.
                </p>
              </div>

              <AlertMessage error={error} success={success} />

              <Field label="Email address" icon={<Mail className="w-4 h-4" />}>
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="driver@hospital.com"
                  value={form.email}
                  onChange={set("email")}
                  className="glass-input w-full pl-10"
                  required
                  autoComplete="email"
                />
              </Field>

              <SubmitButton loading={loading} label="Send Reset Link" icon={<Mail className="w-4 h-4" />} />

              {success && (
                <button
                  type="button"
                  onClick={() => reset("login")}
                  className="w-full text-center text-sm text-ambigo-400 hover:text-white transition-colors py-2"
                >
                  Return to sign in →
                </button>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-ambigo-600 text-xs mt-6">
          AmbiGo Driver System · Secure · Real-time · Zero friction
        </p>
      </div>
    </div>
  );
}

/* ─── Shared sub-components ─── */

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs text-ambigo-400 mb-1.5 font-medium">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ambigo-500 pointer-events-none">
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}

function ToggleEye({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-ambigo-500 hover:text-ambigo-300 transition-colors"
    >
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );
}

function SubmitButton({
  loading,
  label,
  icon,
}: {
  loading: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {loading ? "Please wait…" : label}
    </button>
  );
}

function AlertMessage({ error, success }: { error: string | null; success: string | null }) {
  if (error) {
    return (
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-alert-red/10 border border-alert-red/30 text-alert-red text-sm animate-slide-up">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>{error}</span>
      </div>
    );
  }
  if (success) {
    return (
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-alert-green/10 border border-alert-green/30 text-alert-green text-sm animate-slide-up">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>{success}</span>
      </div>
    );
  }
  return null;
}

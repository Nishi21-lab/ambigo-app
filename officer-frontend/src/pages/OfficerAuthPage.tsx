import React, { useState } from "react";
import { Shield, KeyRound, Mail, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";
import { Logo } from "../components/UI/Logo";
import { Button } from "../components/UI/Button";
import { officerAuthApi } from "../services/api";
import type { OfficerSession } from "../types";

interface OfficerAuthPageProps {
  onLoginSuccess: (session: OfficerSession, token: string) => void;
}

export const OfficerAuthPage: React.FC<OfficerAuthPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your Officer ID/Email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await officerAuthApi.login({ email, password });
      localStorage.setItem("ambigo_officer_token", res.token);
      localStorage.setItem("ambigo_officer_session", JSON.stringify(res.officer));
      onLoginSuccess(res.officer, res.token);
    } catch (err: any) {
      // If backend error, check demo fallback credentials
      if (
        (email.toLowerCase() === "officer@ambigo.app" || email.toLowerCase() === "off-hyd-042") &&
        password === "officer123"
      ) {
        const demoOfficer: OfficerSession = {
          id: "officer_demo_001",
          officerId: "OFF-HYD-042",
          name: "Insp. K. Vikram Rao",
          email: "officer@ambigo.app",
          badgeNumber: "TRF-8842",
          zone: "Cyberabad Central Corridor",
        };
        const demoToken = "demo_officer_jwt_token_local";
        localStorage.setItem("ambigo_officer_token", demoToken);
        localStorage.setItem("ambigo_officer_session", JSON.stringify(demoOfficer));
        onLoginSuccess(demoOfficer, demoToken);
        return;
      }

      setError(err?.message || "Invalid credentials. Try the demo credentials below.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoFill = () => {
    setEmail("officer@ambigo.app");
    setPassword("officer123");
    setError(null);
  };

  return (
    <div className="min-h-screen w-full bg-[#06050f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-blue-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-ambigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-[#0d0b1e]/90 backdrop-blur-2xl border border-ambigo-700/60 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 animate-fade-in">
        <div className="flex flex-col items-center text-center mb-6">
          <Logo size={46} subtitle="TRAFFIC COMMAND PORTAL" />
          <h1 className="text-xl font-bold text-white mt-4 tracking-tight">
            Officer Authorization
          </h1>
          <p className="text-xs text-ambigo-400 mt-1 max-w-xs">
            Sign in to access real-time ambulance corridor tracking and junction clearance controls
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl border border-alert-red/40 bg-alert-red/10 text-alert-red text-xs flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-ambigo-300 block mb-1.5">
              Officer ID or Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-ambigo-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@ambigo.app or OFF-HYD-042"
                className="w-full bg-[#090814] border border-ambigo-700/60 rounded-xl pl-10 pr-4 py-3 text-white placeholder-ambigo-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-all"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-ambigo-300 block mb-1.5">
              Security Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-ambigo-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#090814] border border-ambigo-700/60 rounded-xl pl-10 pr-4 py-3 text-white placeholder-ambigo-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-all"
                autoComplete="current-password"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={loading}
            className="mt-2 py-3.5"
            leftIcon={<Shield className="w-4 h-4" />}
          >
            Access Command Center
          </Button>
        </form>

        {/* Quick Demo Credentials Card */}
        <div className="mt-6 pt-5 border-t border-ambigo-800/80">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-[10px] uppercase font-bold text-ambigo-400 tracking-wider">
              Hackathon Evaluation Demo Credentials
            </span>
            <button
              onClick={handleQuickDemoFill}
              className="text-blue-400 hover:text-blue-300 font-semibold text-xs flex items-center gap-1 transition-colors"
            >
              <Sparkles className="w-3 h-3" /> Auto-fill
            </button>
          </div>

          <div
            onClick={handleQuickDemoFill}
            className="bg-[#090814]/80 hover:bg-[#110e24] cursor-pointer border border-ambigo-800/60 hover:border-blue-500/40 p-3 rounded-xl transition-all group"
          >
            <div className="flex items-center justify-between text-xs">
              <div>
                <p className="text-white font-mono font-medium">officer@ambigo.app</p>
                <p className="text-ambigo-400 font-mono text-[11px] mt-0.5">Password: officer123</p>
              </div>
              <span className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-1 rounded-md group-hover:bg-blue-500/20 transition-colors">
                1-Click Load
              </span>
            </div>
          </div>
        </div>

        {/* Security watermark */}
        <p className="text-[10px] text-center text-ambigo-600 mt-6 uppercase tracking-widest font-mono">
          AmbiGo Tactical Incident Command v1.0
        </p>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { OfficerAuthPage } from "./pages/OfficerAuthPage";
import { OfficerDashboardPage } from "./pages/OfficerDashboardPage";
import type { OfficerSession } from "./types";

export const App: React.FC = () => {
  const [officer, setOfficer] = useState<OfficerSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const savedSession = localStorage.getItem("ambigo_officer_session");
      const savedToken = localStorage.getItem("ambigo_officer_token");
      if (savedSession && savedToken) {
        setOfficer(JSON.parse(savedSession));
      }
    } catch (e) {
      console.warn("Could not restore officer session", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLoginSuccess = (session: OfficerSession, token: string) => {
    localStorage.setItem("ambigo_officer_session", JSON.stringify(session));
    localStorage.setItem("ambigo_officer_token", token);
    setOfficer(session);
  };

  const handleLogout = () => {
    localStorage.removeItem("ambigo_officer_session");
    localStorage.removeItem("ambigo_officer_token");
    setOfficer(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#06050f] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!officer) {
    return <OfficerAuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  return <OfficerDashboardPage officer={officer} onLogout={handleLogout} />;
};

export default App;

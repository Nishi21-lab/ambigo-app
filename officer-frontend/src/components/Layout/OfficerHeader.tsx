import React from "react";
import { Shield, Volume2, VolumeX, LogOut, Activity, History } from "lucide-react";
import { Logo } from "../UI/Logo";
import type { OfficerSession } from "../../types";

interface OfficerHeaderProps {
  officer: OfficerSession;
  activeTripCount: number;
  activeTab: "command" | "history";
  isAlarmMuted: boolean;
  isSocketConnected: boolean;
  lastSyncTime: string;
  onToggleMute: () => void;
  onTabChange: (tab: "command" | "history") => void;
  onLogout: () => void;
}

export const OfficerHeader: React.FC<OfficerHeaderProps> = ({
  officer,
  activeTripCount,
  activeTab,
  isAlarmMuted,
  isSocketConnected,
  lastSyncTime,
  onToggleMute,
  onTabChange,
  onLogout,
}) => {
  return (
    <header className="h-16 bg-[#090814]/95 border-b border-ambigo-800/80 px-4 lg:px-6 flex items-center justify-between z-30 shrink-0 backdrop-blur">
      {/* Left: Brand + Identity */}
      <div className="flex items-center gap-6">
        <Logo size={36} subtitle="TRAFFIC COMMAND" />

        <div className="hidden md:flex items-center gap-2 border-l border-ambigo-800/80 pl-6 text-xs">
          <div className="flex items-center gap-1.5 bg-blue-950/40 border border-blue-800/40 px-2.5 py-1 rounded-lg">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-ambigo-200 font-semibold">{officer.name}</span>
            <span className="text-blue-400 font-mono font-bold">[{officer.officerId}]</span>
          </div>
          <span className="text-ambigo-500">•</span>
          <span className="text-ambigo-400 text-[11px] truncate max-w-[180px]">
            {officer.zone}
          </span>
        </div>
      </div>

      {/* Center: Navigation Tabs */}
      <nav className="flex items-center bg-ambigo-950/80 border border-ambigo-800/80 p-1 rounded-xl shadow-inner">
        <button
          onClick={() => onTabChange("command")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "command"
              ? "bg-gradient-to-r from-ambigo-600 to-ambigo-500 text-white shadow-md"
              : "text-ambigo-400 hover:text-ambigo-200 hover:bg-ambigo-900/60"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Live Command</span>
          {activeTripCount > 0 && (
            <span className="bg-alert-red text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
              {activeTripCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onTabChange("history")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "history"
              ? "bg-gradient-to-r from-ambigo-600 to-ambigo-500 text-white shadow-md"
              : "text-ambigo-400 hover:text-ambigo-200 hover:bg-ambigo-900/60"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Trip History</span>
        </button>
      </nav>

      {/* Right: Connection Status + Duty Status + Mute + Logout */}
      <div className="flex items-center gap-3">
        {/* Real Socket.IO Connection Indicator */}
        <div className="flex flex-col items-end">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide border ${
              isSocketConnected
                ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                : "bg-red-950/60 border-red-500/50 text-alert-red shadow-[0_0_10px_rgba(239,68,68,0.2)]"
            }`}
          >
            <span className="relative flex h-2 w-2">
              {isSocketConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isSocketConnected ? "bg-emerald-500" : "bg-alert-red"
                }`}
              />
            </span>
            <span>{isSocketConnected ? "CONNECTED — LIVE" : "DISCONNECTED"}</span>
          </div>
          {lastSyncTime && (
            <span className="text-[10px] text-ambigo-500 font-mono mt-0.5">
              Last synchronized: {lastSyncTime}
            </span>
          )}
        </div>

        {/* Audio Siren Mute Toggle */}
        <button
          onClick={onToggleMute}
          title={isAlarmMuted ? "Unmute alert chime" : "Mute alert chime"}
          className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
            isAlarmMuted
              ? "bg-ambigo-900/80 border-ambigo-700/50 text-ambigo-500 hover:text-ambigo-300"
              : "bg-blue-950/40 border-blue-500/40 text-blue-400 hover:bg-blue-900/40"
          }`}
        >
          {isAlarmMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          title="Sign out of command center"
          className="w-9 h-9 rounded-xl bg-ambigo-900/80 hover:bg-alert-red/10 border border-ambigo-700/50 hover:border-alert-red/40 text-ambigo-400 hover:text-alert-red flex items-center justify-center transition-all"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

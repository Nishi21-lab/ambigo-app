import React from "react";
import { Bell, CheckCircle, Siren, Trophy } from "lucide-react";
import type { TripAlert } from "../../hooks/useTripState";

interface StatusBannerProps {
  alerts: TripAlert[];
  isCompleted: boolean;
}

const alertConfig = {
  incoming: {
    icon: Bell,
    color: "text-alert-blue",
    bg: "bg-alert-blue/10 border-alert-blue/30",
    label: "Officers alerted",
    prefix: "📡 Incoming alert sent",
  },
  sirened: {
    icon: Siren,
    color: "text-alert-amber",
    bg: "bg-alert-amber/10 border-alert-amber/30",
    label: "Traffic alerted",
    prefix: "🚨 Traffic alerted at",
  },
  cleared: {
    icon: CheckCircle,
    color: "text-alert-green",
    bg: "bg-alert-green/10 border-alert-green/30",
    label: "Junction cleared",
    prefix: "✅ Cleared",
  },
  completed: {
    icon: Trophy,
    color: "text-ambigo-300",
    bg: "bg-ambigo-500/10 border-ambigo-400/30",
    label: "Trip complete",
    prefix: "🏁 Trip complete",
  },
};

export const StatusBanner: React.FC<StatusBannerProps> = ({
  alerts,
  isCompleted,
}) => {
  if (alerts.length === 0 && !isCompleted) return null;

  const latest = alerts[0];

  if (isCompleted) {
    return (
      <div className="animate-slide-up glass-card p-4 border-ambigo-500/40 glow-purple flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ambigo-500 to-ambigo-300 flex items-center justify-center flex-shrink-0">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-ambigo-200">Trip Complete</p>
          <p className="text-xs text-ambigo-400">
            All junctions cleared. Safe journey! 🚑
          </p>
        </div>
      </div>
    );
  }

  if (!latest) return null;
  const config = alertConfig[latest.type];
  const Icon = config.icon;

  return (
    <div className="space-y-2 animate-slide-up">
      {/* Primary latest alert */}
      <div
        className={`glass-card p-4 border ${config.bg} flex items-center gap-3`}
      >
        <div
          className={`w-10 h-10 rounded-full ${config.bg} border ${config.bg} flex items-center justify-center flex-shrink-0`}
        >
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${config.color}`}>
            {config.label}
          </p>
          <p className="text-xs text-ambigo-400 truncate">
            {config.prefix}
            {latest.junctionName ? ` — ${latest.junctionName}` : ""}
          </p>
        </div>
        <span className="text-xs text-ambigo-500 flex-shrink-0">
          {new Date(latest.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </span>
      </div>

      {/* Alert history (up to 3 previous) */}
      {alerts.slice(1, 4).map((alert) => {
        const c = alertConfig[alert.type];
        const I = c.icon;
        return (
          <div
            key={alert.id}
            className="glass-card py-2 px-4 flex items-center gap-2 opacity-60"
          >
            <I className={`w-3.5 h-3.5 ${c.color} flex-shrink-0`} />
            <p className="text-xs text-ambigo-400 truncate">
              {c.prefix}
              {alert.junctionName ? ` — ${alert.junctionName}` : ""}
            </p>
          </div>
        );
      })}
    </div>
  );
};

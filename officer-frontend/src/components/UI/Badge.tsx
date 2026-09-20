import React from "react";
import type { JunctionStatus, TrafficDensity } from "../../types";

interface JunctionBadgeProps {
  status: JunctionStatus;
}

export const JunctionBadge: React.FC<JunctionBadgeProps> = ({ status }) => {
  const config = {
    pending: {
      label: "WAITING",
      bg: "bg-ambigo-800/80 border-ambigo-700/60 text-ambigo-300",
      dot: "bg-ambigo-500",
      pulse: false,
    },
    incoming: {
      label: "INCOMING",
      bg: "bg-blue-500/20 border-blue-500/40 text-blue-300",
      dot: "bg-blue-400",
      pulse: false,
    },
    sirened: {
      label: "ALERTED",
      bg: "bg-amber-500/25 border-amber-500/60 text-amber-300",
      dot: "bg-amber-400",
      pulse: true,
    },
    authorized: {
      label: "AUTHORIZED",
      bg: "bg-emerald-500/25 border-emerald-500/60 text-emerald-300",
      dot: "bg-emerald-400",
      pulse: true,
    },
    cleared: {
      label: "CLEARED",
      bg: "bg-teal-500/20 border-teal-500/40 text-teal-300",
      dot: "bg-teal-400",
      pulse: false,
    },
  }[status] ?? {
    label: status.toUpperCase(),
    bg: "bg-ambigo-800 border-ambigo-700 text-ambigo-400",
    dot: "bg-ambigo-500",
    pulse: false,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border tracking-wider uppercase ${config.bg}`}
    >
      <span
        className={`w-2 h-2 rounded-full ${config.dot} ${
          config.pulse ? "animate-pulse" : ""
        }`}
      />
      {config.label}
    </span>
  );
};

interface TrafficBadgeProps {
  density?: TrafficDensity;
}

export const TrafficBadge: React.FC<TrafficBadgeProps> = ({ density = "moderate" }) => {
  const config = {
    clear: {
      label: "🟢 CLEAR",
      bg: "bg-emerald-950/60 border-emerald-700/50 text-emerald-300",
    },
    moderate: {
      label: "🟡 MODERATE",
      bg: "bg-amber-950/60 border-amber-700/50 text-amber-300",
    },
    heavy: {
      label: "🔴 HEAVY",
      bg: "bg-red-950/60 border-red-700/50 text-red-300",
    },
  }[density];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${config.bg}`}
    >
      {config.label}
    </span>
  );
};

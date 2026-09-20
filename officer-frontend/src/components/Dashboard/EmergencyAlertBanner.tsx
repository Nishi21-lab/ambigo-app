import React from "react";
import { Siren, Clock, Navigation, MapPin, AlertTriangle, ShieldAlert } from "lucide-react";
import type { Trip } from "../../types";

interface EmergencyAlertBannerProps {
  trip: Trip;
  currentDistanceStr?: string;
  etaStr?: string;
}

export const EmergencyAlertBanner: React.FC<EmergencyAlertBannerProps> = ({
  trip,
  currentDistanceStr = "Calculating...",
  etaStr = "Immediate",
}) => {
  const currentJunction = trip.junctions[trip.currentJunctionIndex] ?? trip.junctions[0];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-950/90 via-red-900/60 to-ambigo-950/90 border-2 border-alert-red/70 shadow-[0_0_30px_rgba(255,71,87,0.3)] animate-fade-in p-4 lg:p-5">
      {/* Background Warning Stripes Accent */}
      <div className="absolute top-0 right-0 h-full w-32 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-600/10 via-transparent to-transparent pointer-events-none" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Siren + Heading */}
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 rounded-2xl bg-alert-red flex items-center justify-center text-white shadow-[0_0_20px_rgba(255,71,87,0.8)] shrink-0 animate-bounce-subtle">
            <Siren className="w-6 h-6 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-white animate-ping" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                Priority 1 Emergency
              </span>
              <span className="text-[11px] text-ambigo-400 font-medium">
                Started {new Date(trip.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <h2 className="text-lg lg:text-xl font-black text-white tracking-wide mt-0.5">
              EMERGENCY AMBULANCE APPROACHING
            </h2>
            <p className="text-xs text-red-200/90 flex items-center gap-2 mt-0.5">
              <span>Unit: <strong className="text-white font-mono">{trip.vehicleId}</strong></span>
              <span>•</span>
              <span>Driver: <strong className="text-white">{trip.driverName}</strong></span>
            </p>
          </div>
        </div>

        {/* Center/Right: Routing Corridor Status */}
        <div className="flex items-center gap-4 sm:gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-red-800/40 pt-3 md:pt-0">
          {/* Target Junction */}
          {currentJunction && (
            <div className="text-left md:text-right">
              <span className="text-[10px] uppercase font-bold text-red-300/80 tracking-wider">
                Approaching Junction
              </span>
              <p className="text-sm font-bold text-white leading-tight">
                {currentJunction.name}
              </p>
              <span className="text-[11px] text-amber-300 font-semibold">
                Status: {currentJunction.status.toUpperCase()}
              </span>
            </div>
          )}

          {/* Live ETA Card */}
          <div className="bg-red-950/80 border border-red-500/40 px-4 py-2 rounded-xl text-center shrink-0 shadow-lg">
            <span className="text-[10px] uppercase font-bold tracking-widest text-red-300 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" /> ETA
            </span>
            <p className="text-lg font-black text-white leading-none mt-1 font-mono">
              {etaStr}
            </p>
            <span className="text-[10px] text-red-200/80 font-mono mt-0.5 block">
              {currentDistanceStr}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

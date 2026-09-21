import React from "react";
import {
  Ambulance,
  User,
  MapPin,
  Navigation,
  Gauge,
  Route,
  Clock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import type { Trip, Coordinates } from "../../types";
import { formatDistance, calculateETA, calculateDistanceMeters } from "../../utils/distance";

interface EmergencyDetailCardProps {
  trip: Trip;
  ambulanceLocation: Coordinates | null;
}

export const EmergencyDetailCard: React.FC<EmergencyDetailCardProps> = ({
  trip,
  ambulanceLocation,
}) => {
  const currentJunction = trip.junctions[trip.currentJunctionIndex] ?? trip.junctions[0];
  const nextJunction = trip.junctions[trip.currentJunctionIndex + 1];

  // Calculate distance to current junction and destination
  let distToCurrentJunction = "320 m";
  let etaToCurrentJunction = "45 sec";
  let distToHospital = "1.8 km";

  if (ambulanceLocation && currentJunction) {
    const meters = calculateDistanceMeters(ambulanceLocation, currentJunction.location);
    distToCurrentJunction = formatDistance(meters);
    etaToCurrentJunction = calculateETA(meters, 45);
  }

  if (ambulanceLocation && trip.junctions.length > 0) {
    const lastJunction = trip.junctions[trip.junctions.length - 1];
    const totalMeters = calculateDistanceMeters(ambulanceLocation, lastJunction.location);
    distToHospital = formatDistance(totalMeters);
  }

  return (
    <div className="command-card p-4 lg:p-5 flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-ambigo-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Ambulance className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base leading-tight">
              Vehicle {trip.vehicleId}
            </h3>
            <p className="text-xs text-ambigo-400">Emergency Response Unit</p>
          </div>
        </div>

        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          En Route
        </span>
      </div>

      {/* Grid of Key Info */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-[#090814] p-3 rounded-xl border border-ambigo-800/60">
          <span className="text-[10px] uppercase font-bold text-ambigo-400 flex items-center gap-1">
            <User className="w-3 h-3 text-blue-400" /> Driver
          </span>
          <p className="font-semibold text-white mt-1 text-sm">{trip.driverName}</p>
          <p className="text-[10px] text-ambigo-400 font-mono mt-0.5">+91 98765 43210</p>
        </div>

        <div className="bg-[#090814] p-3 rounded-xl border border-ambigo-800/60">
          <span className="text-[10px] uppercase font-bold text-ambigo-400 flex items-center gap-1">
            <Gauge className="w-3 h-3 text-amber-400" /> Live Coordinates
          </span>
          <p className="font-semibold text-white mt-1 text-xs font-mono">
            {ambulanceLocation
              ? `${ambulanceLocation.lat.toFixed(4)}, ${ambulanceLocation.lng.toFixed(4)}`
              : "Standby"}
          </p>
          <p className="text-[10px] text-emerald-400 font-medium mt-0.5">● Telemetry Stream</p>
        </div>

        <div className="bg-[#090814] p-3 rounded-xl border border-ambigo-800/60">
          <span className="text-[10px] uppercase font-bold text-ambigo-400 flex items-center gap-1">
            <Route className="w-3 h-3 text-emerald-400" /> Dist. to Hospital
          </span>
          <p className="font-semibold text-white mt-1 text-sm font-mono">{distToHospital}</p>
        </div>

        <div className="bg-[#090814] p-3 rounded-xl border border-ambigo-800/60">
          <span className="text-[10px] uppercase font-bold text-ambigo-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-red-400" /> Next Junction ETA
          </span>
          <p className="font-semibold text-white mt-1 text-sm font-mono">{etaToCurrentJunction}</p>
        </div>
      </div>

      {/* Origin -> Destination Route */}
      <div className="bg-[#090814] p-3.5 rounded-xl border border-ambigo-800/60 space-y-2.5 text-xs">
        <div className="flex items-start gap-2.5">
          <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-ambigo-400 uppercase tracking-wider block">
              Pickup Incident
            </span>
            <p className="font-semibold text-white truncate">{trip.pickup}</p>
          </div>
        </div>

        <div className="border-l-2 border-dashed border-ambigo-700/60 ml-2 pl-4 py-0.5" />

        <div className="flex items-start gap-2.5">
          <Navigation className="w-4 h-4 text-alert-red shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-ambigo-400 uppercase tracking-wider block">
              Hospital Destination
            </span>
            <p className="font-semibold text-white truncate">{trip.hospital}</p>
          </div>
        </div>
      </div>

      {/* Current vs Next Junction Bar */}
      <div className="bg-ambigo-950/70 p-3 rounded-xl border border-ambigo-800/60 flex items-center justify-between gap-3 text-xs">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] uppercase font-bold text-amber-400">Current Junction</span>
          <p className="font-bold text-white truncate">{currentJunction?.name || "Corridor Start"}</p>
          <span className="text-[10px] text-ambigo-400 font-mono">{distToCurrentJunction} away</span>
        </div>

        <ArrowRight className="w-4 h-4 text-ambigo-600 shrink-0" />

        <div className="min-w-0 flex-1 text-right">
          <span className="text-[10px] uppercase font-bold text-ambigo-400">Next Junction</span>
          <p className="font-semibold text-ambigo-200 truncate">
            {nextJunction?.name || "Hospital Gate"}
          </p>
          <span className="text-[10px] text-ambigo-500 uppercase">
            {nextJunction ? "Standby" : "Final Leg"}
          </span>
        </div>
      </div>
    </div>
  );
};

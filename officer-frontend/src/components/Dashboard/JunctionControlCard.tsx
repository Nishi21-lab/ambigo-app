import React, { useState } from "react";
import {
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Clock,
  Navigation,
  Car,
  ChevronRight,
  Radio,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "../UI/Button";
import { JunctionBadge, TrafficBadge } from "../UI/Badge";
import type { Junction, Coordinates, TrafficDensity } from "../../types";
import { formatDistance, calculateETA, calculateDistanceMeters } from "../../utils/distance";

interface JunctionControlCardProps {
  tripId: string;
  junctions: Junction[];
  currentJunctionIndex: number;
  ambulanceLocation: Coordinates | null;
  onAuthorize: (junctionId: string) => Promise<void>;
  onClear: (junctionId: string) => Promise<void>;
  onUpdateTraffic: (junctionId: string, density: TrafficDensity) => Promise<void>;
  actionLoadingId: string | null;
}

export const JunctionControlCard: React.FC<JunctionControlCardProps> = ({
  tripId,
  junctions,
  currentJunctionIndex,
  ambulanceLocation,
  onAuthorize,
  onClear,
  onUpdateTraffic,
  actionLoadingId,
}) => {
  const [holdingTrafficId, setHoldingTrafficId] = useState<string | null>(null);

  const handleHoldTraffic = (junctionId: string) => {
    setHoldingTrafficId(junctionId);
    setTimeout(() => {
      setHoldingTrafficId(null);
    }, 4000);
  };

  return (
    <div className="command-card p-4 lg:p-5 flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-ambigo-800/80 pb-3">
        <div>
          <h3 className="font-bold text-white text-base leading-tight flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            Corridor Junction Controls
          </h3>
          <p className="text-xs text-ambigo-400 mt-0.5">
            Authorize passage and coordinate signal priority ahead of ambulance
          </p>
        </div>

        <span className="text-xs text-ambigo-400 font-mono">
          Junction {Math.min(currentJunctionIndex + 1, junctions.length)} of {junctions.length}
        </span>
      </div>

      {/* Junctions List */}
      <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
        {junctions.map((junction, index) => {
          const isCurrent = index === currentJunctionIndex;
          const isPassed = index < currentJunctionIndex;
          const isUpcoming = index > currentJunctionIndex;

          // Compute distance and ETA from live ambulance to this junction
          let distanceStr = "—";
          let etaStr = "—";
          if (ambulanceLocation) {
            const meters = calculateDistanceMeters(ambulanceLocation, junction.location);
            distanceStr = formatDistance(meters);
            etaStr = calculateETA(meters, 45);
          }

          const isLoading = actionLoadingId === junction.id;
          const isHolding = holdingTrafficId === junction.id;

          return (
            <div
              key={junction.id}
              className={`p-4 rounded-xl border transition-all duration-200 ${
                isCurrent
                  ? "bg-gradient-to-r from-[#17142e] via-[#1a1738] to-[#17142e] border-blue-500/60 shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/30"
                  : isPassed
                  ? "bg-ambigo-950/40 border-ambigo-800/40 opacity-70"
                  : "bg-ambigo-950/60 border-ambigo-800/60"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                {/* Junction Title & Index */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isPassed
                        ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                        : isCurrent
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/40"
                        : "bg-ambigo-800 text-ambigo-400"
                    }`}
                  >
                    {isPassed ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                  </div>

                  <div>
                    <h4 className="font-bold text-white text-sm leading-tight flex items-center gap-2">
                      {junction.name}
                      {isCurrent && (
                        <span className="bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase px-2 py-0.2 rounded-full border border-blue-500/30">
                          Active Target
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-ambigo-400 mt-0.5">
                      Coordinates: {junction.location.lat.toFixed(4)}, {junction.location.lng.toFixed(4)}
                    </p>
                  </div>
                </div>

                {/* Status & Traffic Badges */}
                <div className="flex items-center gap-2">
                  {/* Traffic Density Toggle Dropdown */}
                  <div className="relative group">
                    <button
                      className="cursor-pointer"
                      title="Click to cycle traffic density"
                      onClick={() => {
                        const nextDensity: Record<TrafficDensity, TrafficDensity> = {
                          clear: "moderate",
                          moderate: "heavy",
                          heavy: "clear",
                        };
                        const current = junction.trafficDensity || "moderate";
                        onUpdateTraffic(junction.id, nextDensity[current]);
                      }}
                    >
                      <TrafficBadge density={junction.trafficDensity || "moderate"} />
                    </button>
                  </div>

                  <JunctionBadge status={junction.status} />
                </div>
              </div>

              {/* Telemetry Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#090814] p-2.5 rounded-lg border border-ambigo-800/60 text-xs mb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-ambigo-400 flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-blue-400" /> Distance
                  </span>
                  <p className="font-semibold text-white mt-0.5 font-mono">{distanceStr}</p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-ambigo-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" /> Ambulance ETA
                  </span>
                  <p className="font-semibold text-white mt-0.5 font-mono">{etaStr}</p>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-ambigo-400 flex items-center gap-1">
                    <Car className="w-3 h-3 text-emerald-400" /> Priority Status
                  </span>
                  <p className="font-semibold text-ambigo-200 mt-0.5">
                    {junction.status === "authorized"
                      ? "Corridor Green"
                      : junction.status === "cleared"
                      ? "Passed & Resumed"
                      : isCurrent
                      ? "Awaiting Action"
                      : "Standby"}
                  </p>
                </div>
              </div>

              {/* Action Buttons for Current / Active Junction */}
              {isCurrent && junction.status !== "cleared" && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {junction.status !== "authorized" ? (
                    <Button
                      variant="authorize"
                      size="sm"
                      isLoading={isLoading}
                      onClick={() => onAuthorize(junction.id)}
                      leftIcon={<ShieldCheck className="w-4 h-4" />}
                      className="flex-1 sm:flex-initial"
                    >
                      AUTHORIZE PASSAGE
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>PASSAGE AUTHORIZED</span>
                    </div>
                  )}

                  <Button
                    variant="clear"
                    size="sm"
                    isLoading={isLoading}
                    onClick={() => onClear(junction.id)}
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    className="flex-1 sm:flex-initial"
                  >
                    CLEAR JUNCTION
                  </Button>

                  <Button
                    variant="hold"
                    size="sm"
                    onClick={() => handleHoldTraffic(junction.id)}
                    className="flex-1 sm:flex-initial"
                  >
                    {isHolding ? "HOLDING SIGNALS (3s)..." : "HOLD CROSS-TRAFFIC"}
                  </Button>
                </div>
              )}

              {/* Already cleared indicator */}
              {isPassed && (
                <div className="text-[11px] text-teal-400/90 font-medium flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ambulance has cleared this junction. Perpendicular traffic resumed.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

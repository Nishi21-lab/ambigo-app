import React, { useState, useEffect } from "react";
import type { Junction } from "../types";
import {
  Wifi,
  MapPin,
  Navigation,
  Play,
  StopCircle,
  RotateCcw,
  LogOut,
} from "lucide-react";
import { Logo } from "../components/UI/Logo";
import { LiveMap } from "../components/Map/LiveMap";
import { DashboardPage } from "./DashboardPage";
import { StatusBanner } from "../components/Alerts/StatusBanner";
import { Button } from "../components/UI/Button";
import { useTripState } from "../hooks/useTripState";
import { useGeolocation } from "../hooks/useGeolocation";
import { startSimulator, stopSimulator } from "../utils/simulator";
import type { Coordinates } from "../types";

interface TripPageProps {
  session: { name: string; email: string };
  onSignOut: () => void;
}

export const TripPage: React.FC<TripPageProps> = ({ session, onSignOut }) => {
  type MovementMode = "none" | "gps" | "simulate";

  const { phase, trip, currentLocation, alerts, error, updateLocation, resetTrip, setTripActive } =
    useTripState();

  const [movementMode, setMovementMode] = useState<MovementMode>("none");
  const [gpsEnabled, setGpsEnabled] = useState(true); // Always ask for location on load
  const [isOffline, setIsOffline] = useState(false);

  const [shiftStart] = useState(() => {
    const saved = sessionStorage.getItem("ambigo_shift_start");
    if (saved) return parseInt(saved, 10);
    const newStart = Date.now() - (4 * 3600 * 1000 + 12 * 60 * 1000); // 4h 12m ago for demo
    sessionStorage.setItem("ambigo_shift_start", newStart.toString());
    return newStart;
  });

  const [shiftTime, setShiftTime] = useState("");
  const [tripsToday, setTripsToday] = useState(4);

  useEffect(() => {
    const updateTime = () => {
      const diff = Date.now() - shiftStart;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setShiftTime(`${h}h ${m}m`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [shiftStart]);

  const { location: gpsLocation, error: gpsError } = useGeolocation(gpsEnabled);

  // Forward GPS location to trip state
  useEffect(() => {
    if (gpsLocation && movementMode === "gps") {
      updateLocation(gpsLocation);
    }
  }, [gpsLocation, movementMode, updateLocation]);

  const handleStartSimulate = () => {
    setMovementMode("simulate");
    startSimulator(
      (loc: Coordinates) => updateLocation(loc),
      () => {
        setMovementMode("none");
      }
    );
  };

  const handleStopSimulate = () => {
    stopSimulator();
    setMovementMode("none");
  };

  const handleStartGps = () => {
    setMovementMode("gps");
    setGpsEnabled(true);
  };

  const handleReset = () => {
    stopSimulator();
    setGpsEnabled(false);
    setMovementMode("none");
    resetTrip();
  };

  const isActive = phase === "active";
  const isCompleted = phase === "completed";

  // Auto-reset completed trip after 1 minute
  useEffect(() => {
    if (isCompleted) {
      setTripsToday((t) => t + 1);
      const timer = setTimeout(() => {
        handleReset();
      }, 60000);
      return () => clearTimeout(timer);
    }
  }, [isCompleted]);

  // Determine status indicator properties
  let statusColor = "bg-alert-green shadow-[0_0_8px_rgba(46,213,115,0.6)]";
  let statusText = "On Duty, Available";

  if (isOffline && !isActive && !isCompleted) {
    statusColor = "bg-ambigo-600";
    statusText = "Offline";
  } else if (isActive) {
    statusColor = "bg-alert-amber animate-pulse shadow-[0_0_8px_rgba(255,165,2,0.6)]";
    statusText = "On Duty, In Action";
  } else if (isCompleted) {
    statusColor = "bg-alert-blue shadow-[0_0_8px_rgba(30,144,255,0.6)]";
    statusText = "Completed Action";
  }


  return (
    <div className="h-[100dvh] w-full bg-ambigo-950 flex flex-col-reverse lg:flex-row overflow-hidden">
      {/* ── Control Panel ── */}
      <aside
        className={`w-full ${
          isActive || isCompleted
            ? "lg:w-[400px] xl:w-[440px] flex-shrink-0 h-[50dvh] lg:h-full lg:border-r border-ambigo-800/50 bg-ambigo-950/95 lg:bg-transparent backdrop-blur-xl lg:backdrop-blur-none shadow-[0_-10px_40px_rgba(0,0,0,0.5)] lg:shadow-none rounded-t-3xl lg:rounded-none"
            : "h-full bg-ambigo-950"
        } flex flex-col p-4 lg:p-6 gap-4 overflow-y-auto z-10 relative transition-all duration-300`}
      >
        {/* Mobile Pull Indicator (Only visible if map is showing) */}
        {(isActive || isCompleted) && (
          <div className="w-12 h-1.5 bg-ambigo-700/50 rounded-full mx-auto lg:hidden shrink-0 mb-1" />
        )}
        <header className="flex items-center gap-3">
          <Logo variant="icon" size={30} />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white leading-tight">
              <span>AMBI</span><span style={{ color: '#e53935' }}>GO</span>
            </h1>
            <p className="text-xs text-ambigo-400 truncate">{session.name}</p>
          </div>
          
          {/* Shift Stats */}
          <div className="hidden sm:flex flex-col items-end pr-4 mr-2 border-r border-ambigo-700/50">
            <p className="text-[10px] uppercase text-ambigo-400 tracking-wider font-semibold">Shift: <span className="text-white ml-0.5">{shiftTime}</span></p>
            <p className="text-[10px] uppercase text-ambigo-400 tracking-wider font-semibold mt-0.5">Trips: <span className="text-white ml-0.5">{tripsToday}</span></p>
          </div>

          {/* Live indicator + Toggle + Sign out */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 bg-ambigo-800/40 px-3 py-1.5 rounded-full border border-ambigo-700/50">
              <div className={`w-2 h-2 rounded-full ${statusColor}`} />
              <span className="text-xs font-medium text-ambigo-200">
                {statusText}
              </span>
            </div>
            
            {/* Toggle switch */}
            <button
              onClick={() => setIsOffline(!isOffline)}
              disabled={isActive || isCompleted}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed ${
                !isOffline ? "bg-alert-green" : "bg-ambigo-700"
              }`}
            >
              <span className="sr-only">Toggle duty status</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  !isOffline ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>

            <button
              onClick={onSignOut}
              title="Sign out"
              className="w-8 h-8 rounded-lg bg-ambigo-800/60 hover:bg-ambigo-700/60 border border-ambigo-600/40 hover:border-ambigo-500/60 flex items-center justify-center transition-all"
            >
              <LogOut className="w-3.5 h-3.5 text-ambigo-400 hover:text-white" />
            </button>
          </div>
        </header>

        {/* Status Alerts */}
        <StatusBanner alerts={alerts} isCompleted={isCompleted} />

        {/* Error */}
        {(error || gpsError) && (
          <div className="glass-card p-3 border border-alert-red/30 bg-alert-red/5 text-alert-red text-sm">
            ⚠ {error || gpsError}
          </div>
        )}

        {/* Live Requests Dashboard (idle/error) */}
        {(phase === "idle" || phase === "error") && (
          <div className="flex-1 flex flex-col min-h-0 relative z-10 w-full animate-fade-in">
            <DashboardPage
              gpsLocation={gpsLocation}
              gpsError={gpsError}
              driverName={session.name}
              vehicleId={localStorage.getItem("ambigo_vehicle_id") || "UNIT-1"}
              onTripStart={setTripActive}
              isOffline={isOffline}
            />
          </div>
        )}

        {/* Requesting spinner */}
        {phase === "requesting" && (
          <div className="glass-card p-6 flex flex-col items-center gap-3 animate-fade-in">
            <div className="w-12 h-12 rounded-full border-2 border-ambigo-400 border-t-transparent animate-spin" />
            <p className="text-sm text-ambigo-300">Setting up your route…</p>
          </div>
        )}

        {/* Active Trip Panel */}
        {(isActive || isCompleted) && trip && (
          <div className="glass-card p-5 space-y-4 animate-fade-in">
            {/* Trip info */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-white">Active Trip</h2>
                <span
                  className={`status-badge ${
                    isCompleted
                      ? "bg-ambigo-500/20 text-ambigo-300"
                      : "bg-alert-green/10 text-alert-green"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isCompleted ? "bg-ambigo-400" : "bg-alert-green animate-pulse"
                    }`}
                  />
                  {isCompleted ? "Completed" : "En Route"}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-ambigo-300">
                  <MapPin className="w-3.5 h-3.5 text-ambigo-500" />
                  <span className="text-ambigo-500 text-xs">From:</span>
                  <span>{trip.pickup}</span>
                </div>
                <div className="flex items-center gap-2 text-ambigo-300">
                  <Navigation className="w-3.5 h-3.5 text-ambigo-500" />
                  <span className="text-ambigo-500 text-xs">To:</span>
                  <span>{trip.hospital}</span>
                </div>
              </div>
            </div>

            {/* Junction progress */}
            <div>
              <p className="text-xs text-ambigo-500 uppercase tracking-widest mb-2">
                Junctions
              </p>
              <div className="space-y-1.5">
                {trip.junctions.map((junction: Junction, i: number) => {
                  const colorMap = {
                    pending: "bg-ambigo-700",
                    incoming: "bg-alert-blue",
                    sirened: "bg-alert-amber",
                    cleared: "bg-alert-green",
                  };
                  return (
                    <div key={junction.id} className="flex items-center gap-2.5">
                      <div
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          colorMap[junction.status as keyof typeof colorMap]
                        } ${junction.status === "sirened" ? "animate-pulse" : ""}`}
                      />
                      <span className="text-xs text-ambigo-300 truncate">
                        {i + 1}. {junction.name}
                      </span>
                      <span className="ml-auto text-xs text-ambigo-500 capitalize flex-shrink-0">
                        {junction.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Movement Controls */}
            {isActive && (
              <div className="space-y-2 pt-2 border-t border-ambigo-700/50">
                <p className="text-xs text-ambigo-500 uppercase tracking-widest">
                  Movement
                </p>

                {movementMode === "none" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      onClick={handleStartGps}
                      leftIcon={<Navigation className="w-3.5 h-3.5" />}
                    >
                      Use GPS
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleStartSimulate}
                      leftIcon={<Play className="w-3.5 h-3.5" />}
                    >
                      Demo Mode
                    </Button>
                  </div>
                )}

                {movementMode === "gps" && (
                  <div className="flex items-center gap-2 text-sm text-alert-green">
                    <Wifi className="w-4 h-4 animate-pulse" />
                    <span>Broadcasting GPS location…</span>
                    {gpsError && (
                      <span className="text-alert-red text-xs">{gpsError}</span>
                    )}
                  </div>
                )}

                {movementMode === "simulate" && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-alert-amber">
                      <div className="w-2 h-2 rounded-full bg-alert-amber animate-pulse" />
                      <span>Demo mode running…</span>
                    </div>
                    <Button
                      variant="danger"
                      onClick={handleStopSimulate}
                      leftIcon={<StopCircle className="w-3.5 h-3.5" />}
                    >
                      Stop
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Reset */}
            <Button
              variant="secondary"
              fullWidth
              onClick={handleReset}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              {isCompleted ? "New Trip" : "Cancel Trip"}
            </Button>
          </div>
        )}

        {/* Current coordinates */}
        {(currentLocation || gpsLocation) && (
          <div className="glass-card px-4 py-2 flex items-center gap-2 text-xs text-ambigo-500">
            <MapPin className="w-3 h-3" />
            <span>
              {(currentLocation || gpsLocation)?.lat.toFixed(5)}, {(currentLocation || gpsLocation)?.lng.toFixed(5)}
            </span>
          </div>
        )}
      </aside>

      {/* ── Map Panel ── */}
      {(isActive || isCompleted) && (
        <main className="flex-1 relative z-0 min-h-[50dvh] lg:min-h-0">
          <LiveMap
            currentLocation={currentLocation || gpsLocation}
            junctions={trip?.junctions ?? []}
          />
        </main>
      )}
    </div>
  );
};

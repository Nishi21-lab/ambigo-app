import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Siren,
  Radio,
  Clock,
  Shield,
  Activity,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  ExternalLink,
} from "lucide-react";
import { OfficerHeader } from "../components/Layout/OfficerHeader";
import { OfficerLiveMap } from "../components/Map/OfficerLiveMap";
import { EmergencyAlertBanner } from "../components/Dashboard/EmergencyAlertBanner";
import { EmergencyDetailCard } from "../components/Dashboard/EmergencyDetailCard";
import { JunctionControlCard } from "../components/Dashboard/JunctionControlCard";
import { TripHistoryView } from "../components/History/TripHistoryView";
import { Button } from "../components/UI/Button";
import { officerTripsApi } from "../services/api";
import {
  connectOfficerSocket,
  disconnectOfficerSocket,
  joinOfficerTrip,
  onLocationUpdate,
  onTripSiren,
  onJunctionCleared,
  onJunctionAuthorized,
  onTripCompleted,
  onEmergencyNew,
  onRequestTaken,
  emitAuthorizeJunction,
  emitClearJunction,
} from "../services/socket";
import {
  formatDistance,
  calculateETA,
  calculateDistanceMeters,
  playEmergencyAlertSound,
} from "../utils/distance";
import type { Trip, Coordinates, OfficerSession, TrafficDensity } from "../types";

interface OfficerDashboardPageProps {
  officer: OfficerSession;
  onLogout: () => void;
}

export const OfficerDashboardPage: React.FC<OfficerDashboardPageProps> = ({
  officer,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<"command" | "history">("command");
  const [isAlarmMuted, setIsAlarmMuted] = useState(false);

  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [ambulanceLocation, setAmbulanceLocation] = useState<Coordinates | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeTrip = activeTrips.find((t) => t._id === selectedTripId) || activeTrips[0] || null;
  const isAlarmMutedRef = useRef(isAlarmMuted);
  isAlarmMutedRef.current = isAlarmMuted;

  // ── 1. Fetch active trips from backend ────────────────────────
  const fetchActiveTrips = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Try /api/trips/active first, fallback to /api/trips?status=en_route
      let tripsList: Trip[] = [];
      try {
        const res = await officerTripsApi.getActive();
        tripsList = res.trips || [];
      } catch {
        const fallbackRes = await officerTripsApi.getAll("en_route");
        tripsList = fallbackRes.trips || [];
      }

      setActiveTrips(tripsList);
      if (tripsList.length > 0 && !selectedTripId) {
        setSelectedTripId(tripsList[0]._id);
        if (tripsList[0].lastKnownLocation) {
          setAmbulanceLocation(tripsList[0].lastKnownLocation);
        } else if (tripsList[0].junctions.length > 0) {
          setAmbulanceLocation(tripsList[0].junctions[0].location);
        }
        joinOfficerTrip(tripsList[0]._id);
      }
    } catch (err) {
      console.warn("Could not load active trips:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedTripId]);

  // Initial load
  useEffect(() => {
    fetchActiveTrips();
  }, [fetchActiveTrips]);

  // ── 2. Socket.IO Real-time Synchronization ───────────────────
  useEffect(() => {
    connectOfficerSocket();

    // If an active trip is selected, join its room
    if (selectedTripId) {
      joinOfficerTrip(selectedTripId);
    }

    // A: Real-time location update from driver
    const unsubLoc = onLocationUpdate(({ tripId, location }) => {
      // Update ambulance position
      if (!selectedTripId || selectedTripId === tripId) {
        setAmbulanceLocation(location);
      }
      // Update trip's last known location
      setActiveTrips((prev) =>
        prev.map((t) => (t._id === tripId ? { ...t, lastKnownLocation: location } : t))
      );
    });

    // B: Real-time siren / approaching alert
    const unsubSiren = onTripSiren(({ tripId, junction }) => {
      if (!isAlarmMutedRef.current) {
        playEmergencyAlertSound();
      }
      setActiveTrips((prev) =>
        prev.map((t) => {
          if (t._id !== tripId) return t;
          return {
            ...t,
            junctions: t.junctions.map((j) =>
              j.id === junction.id ? { ...j, status: "sirened" } : j
            ),
          };
        })
      );
    });

    // C: Real-time junction clearance
    const unsubClear = onJunctionCleared(({ tripId, junction, nextJunction }) => {
      setActiveTrips((prev) =>
        prev.map((t) => {
          if (t._id !== tripId) return t;
          const nextIdx = t.currentJunctionIndex + 1;
          return {
            ...t,
            currentJunctionIndex: nextIdx,
            junctions: t.junctions.map((j) =>
              j.id === junction.id ? { ...j, status: "cleared" } : j
            ),
          };
        })
      );
    });

    // D: Real-time junction authorization
    const unsubAuth = onJunctionAuthorized(({ tripId, junctionId, junction }) => {
      setActiveTrips((prev) =>
        prev.map((t) => {
          if (t._id !== tripId) return t;
          return {
            ...t,
            junctions: t.junctions.map((j) =>
              j.id === junctionId ? { ...j, status: "authorized" } : j
            ),
          };
        })
      );
    });

    // E: Real-time trip completed
    const unsubComp = onTripCompleted(({ tripId }) => {
      setActiveTrips((prev) => prev.filter((t) => t._id !== tripId));
      if (selectedTripId === tripId) {
        setSelectedTripId(null);
        setAmbulanceLocation(null);
      }
    });

    // F: Real-time NEW emergency incoming
    const unsubNew = onEmergencyNew(({ trip }) => {
      if (!isAlarmMutedRef.current) {
        playEmergencyAlertSound();
      }
      setActiveTrips((prev) => {
        const exists = prev.some((t) => t._id === trip._id);
        if (exists) return prev;
        return [trip, ...prev];
      });
      setSelectedTripId(trip._id);
      if (trip.lastKnownLocation) {
        setAmbulanceLocation(trip.lastKnownLocation);
      } else if (trip.junctions.length > 0) {
        setAmbulanceLocation(trip.junctions[0].location);
      }
      joinOfficerTrip(trip._id);
    });

    // G: Dispatch request taken by driver
    const unsubTaken = onRequestTaken(() => {
      // Refresh active trips list to catch newly created trip
      setTimeout(fetchActiveTrips, 500);
    });

    return () => {
      unsubLoc();
      unsubSiren();
      unsubClear();
      unsubAuth();
      unsubComp();
      unsubNew();
      unsubTaken();
      disconnectOfficerSocket();
    };
  }, [selectedTripId, fetchActiveTrips]);

  // ── 3. Officer Actions ───────────────────────────────────────
  const handleAuthorize = async (junctionId: string) => {
    if (!activeTrip) return;
    setActionLoadingId(junctionId);

    // Optimistic local update
    setActiveTrips((prev) =>
      prev.map((t) => {
        if (t._id !== activeTrip._id) return t;
        return {
          ...t,
          junctions: t.junctions.map((j) =>
            j.id === junctionId ? { ...j, status: "authorized" } : j
          ),
        };
      })
    );

    // Socket emission
    emitAuthorizeJunction(activeTrip._id, junctionId, officer.officerId);

    // Backend REST API call
    try {
      await officerTripsApi.authorizeJunction(activeTrip._id, junctionId, officer.officerId);
    } catch (err) {
      console.warn("REST authorize call fallback to socket only", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleClear = async (junctionId: string) => {
    if (!activeTrip) return;
    setActionLoadingId(junctionId);

    // Optimistic local update
    setActiveTrips((prev) =>
      prev.map((t) => {
        if (t._id !== activeTrip._id) return t;
        const nextIdx = t.currentJunctionIndex + 1;
        const isCompleted = nextIdx >= t.junctions.length;
        return {
          ...t,
          status: isCompleted ? "completed" : t.status,
          currentJunctionIndex: nextIdx,
          junctions: t.junctions.map((j) =>
            j.id === junctionId ? { ...j, status: "cleared" } : j
          ),
        };
      })
    );

    // Socket emission
    emitClearJunction(activeTrip._id, junctionId, officer.officerId);

    // Backend REST API call
    try {
      const res = await officerTripsApi.clearJunction(activeTrip._id, junctionId, officer.officerId);
      if (res.isCompleted) {
        setActiveTrips((prev) => prev.filter((t) => t._id !== activeTrip._id));
        setSelectedTripId(null);
      }
    } catch (err) {
      console.warn("REST clear call fallback to socket only", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUpdateTraffic = async (junctionId: string, density: TrafficDensity) => {
    if (!activeTrip) return;

    setActiveTrips((prev) =>
      prev.map((t) => {
        if (t._id !== activeTrip._id) return t;
        return {
          ...t,
          junctions: t.junctions.map((j) =>
            j.id === junctionId ? { ...j, trafficDensity: density } : j
          ),
        };
      })
    );

    try {
      await officerTripsApi.updateTraffic(activeTrip._id, junctionId, density);
    } catch (err) {
      console.warn("Failed to update traffic density", err);
    }
  };

  // Compute live distance and ETA
  let distanceStr = "Calculating...";
  let etaStr = "Immediate";
  const currentJunc = activeTrip?.junctions[activeTrip.currentJunctionIndex];
  if (ambulanceLocation && currentJunc) {
    const meters = calculateDistanceMeters(ambulanceLocation, currentJunc.location);
    distanceStr = formatDistance(meters);
    etaStr = calculateETA(meters, 45);
  }

  return (
    <div className="h-[100dvh] w-full bg-[#06050f] flex flex-col overflow-hidden select-none">
      {/* ── Fixed Top Header ── */}
      <OfficerHeader
        officer={officer}
        activeTripCount={activeTrips.length}
        activeTab={activeTab}
        isAlarmMuted={isAlarmMuted}
        onToggleMute={() => setIsAlarmMuted(!isAlarmMuted)}
        onTabChange={setActiveTab}
        onLogout={onLogout}
      />

      {/* ── Tab: Incident History ── */}
      {activeTab === "history" && <TripHistoryView />}

      {/* ── Tab: Live Command Center ── */}
      {activeTab === "command" && (
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden p-3 lg:p-4 gap-3 lg:gap-4">
          {/* ── Left / Bottom Control & Detail Panels (42% width on desktop) ── */}
          <section className="w-full lg:w-[480px] xl:w-[520px] flex flex-col gap-3 shrink-0 h-[48dvh] lg:h-full overflow-y-auto z-10">
            {/* Active Incident Banner */}
            {activeTrip ? (
              <EmergencyAlertBanner
                trip={activeTrip}
                currentDistanceStr={distanceStr}
                etaStr={etaStr}
              />
            ) : (
              /* Standby / No Active Emergencies Card */
              <div className="command-card p-6 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
                  <Shield className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Corridors Normal</h3>
                  <p className="text-xs text-ambigo-400 mt-1 max-w-xs">
                    Standing by for active emergency dispatches. When a driver starts a trip, the corridor alerts will activate here automatically.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={fetchActiveTrips}
                  isLoading={isRefreshing}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  className="mt-1"
                >
                  Scan Active Incidents
                </Button>
              </div>
            )}

            {/* Multiple Incidents Selector Bar (if > 1 trip active) */}
            {activeTrips.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-[10px] uppercase font-bold text-ambigo-400 tracking-wider shrink-0">
                  Active Units:
                </span>
                {activeTrips.map((t) => (
                  <button
                    key={t._id}
                    onClick={() => {
                      setSelectedTripId(t._id);
                      if (t.lastKnownLocation) setAmbulanceLocation(t.lastKnownLocation);
                      joinOfficerTrip(t._id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 border transition-all ${
                      selectedTripId === t._id
                        ? "bg-alert-red text-white border-alert-red shadow-lg shadow-red-500/30"
                        : "bg-ambigo-900 text-ambigo-300 border-ambigo-800 hover:text-white"
                    }`}
                  >
                    🚑 {t.vehicleId} ({t.hospital.split(",")[0]})
                  </button>
                ))}
              </div>
            )}

            {/* Detailed Emergency Information Card */}
            {activeTrip && (
              <EmergencyDetailCard
                trip={activeTrip}
                ambulanceLocation={ambulanceLocation}
              />
            )}

            {/* Junction Clearance & Authorization Card */}
            {activeTrip && (
              <JunctionControlCard
                tripId={activeTrip._id}
                junctions={activeTrip.junctions}
                currentJunctionIndex={activeTrip.currentJunctionIndex}
                ambulanceLocation={ambulanceLocation}
                onAuthorize={handleAuthorize}
                onClear={handleClear}
                onUpdateTraffic={handleUpdateTraffic}
                actionLoadingId={actionLoadingId}
              />
            )}
          </section>

          {/* ── Right / Top: Tactical Live Map Panel ── */}
          <section className="flex-1 h-[52dvh] lg:h-full relative min-h-[300px]">
            <OfficerLiveMap
              ambulanceLocation={ambulanceLocation}
              junctions={activeTrip?.junctions ?? []}
              pickupLocation={
                activeTrip?.lastKnownLocation || activeTrip?.junctions[0]?.location
              }
              pickupName={activeTrip?.pickup}
              hospitalName={activeTrip?.hospital}
              activeJunctionIndex={activeTrip?.currentJunctionIndex ?? 0}
              onSelectJunction={(jId) => {
                const j = activeTrip?.junctions.find((item) => item.id === jId);
                if (j) setAmbulanceLocation(j.location);
              }}
            />
          </section>
        </main>
      )}
    </div>
  );
};

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
import { officerTripsApi, rememberTrackedTripId } from "../services/api";
import {
  connectOfficerSocket,
  disconnectOfficerSocket,
  joinOfficerTrip,
  onLocationUpdate,
  onTripSiren,
  onTripIncoming,
  onJunctionCleared,
  onJunctionAuthorized,
  onTripCompleted,
  onEmergencyNew,
  onRequestTaken,
  onRequestNew,
  onSocketStateChange,
  emitAuthorizeJunction,
  emitClearJunction,
  emitLocationUpdate,
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
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => new Date().toLocaleTimeString());

  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [ambulanceLocation, setAmbulanceLocation] = useState<Coordinates | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeTrip = activeTrips.find((t) => t._id === selectedTripId) || activeTrips[0] || null;
  const isAlarmMutedRef = useRef(isAlarmMuted);
  isAlarmMutedRef.current = isAlarmMuted;

  const loadingTripIdsRef = useRef<Set<string>>(new Set());
  const activeTripsRef = useRef<Trip[]>(activeTrips);
  activeTripsRef.current = activeTrips;
  const selectedTripIdRef = useRef<string | null>(selectedTripId);
  selectedTripIdRef.current = selectedTripId;

  // ── Auto-hydrate any trip from backend by ID ─────────────────
  const hydrateTrip = useCallback(async (tripId: string, locationOverride?: Coordinates) => {
    const tid = tripId ? String(tripId).trim() : "";
    if (!tid || loadingTripIdsRef.current.has(tid)) return;
    loadingTripIdsRef.current.add(tid);
    try {
      const res = await officerTripsApi.getById(tid);
      const tripObj = res?.trip;
      if (tripObj && (tripObj.status === "en_route" || !tripObj.status)) {
        const canonicalId = tripObj._id || (tripObj as any).id || tid;
        rememberTrackedTripId(canonicalId);
        const loc =
          locationOverride ||
          tripObj.lastKnownLocation ||
          tripObj.junctions?.[0]?.location ||
          null;
        const fullTrip: Trip = { ...tripObj, _id: canonicalId, lastKnownLocation: loc || undefined };

        setActiveTrips((prev) => {
          const exists = prev.some((t) => (t._id || (t as any).id) === canonicalId);
          if (exists) {
            return prev.map((t) => ((t._id || (t as any).id) === canonicalId ? fullTrip : t));
          }
          return [fullTrip, ...prev];
        });
        setSelectedTripId((cur) => cur || canonicalId);
        if (loc) {
          setAmbulanceLocation(loc);
        }
        joinOfficerTrip(canonicalId);
        if (!isAlarmMutedRef.current) {
          playEmergencyAlertSound();
        }
      }
    } catch (err) {
      console.warn("Could not hydrate trip:", tid, err);
    } finally {
      loadingTripIdsRef.current.delete(tid);
    }
  }, []);

  // ── 1. Fetch active trips from backend ────────────────────────
  const fetchActiveTrips = useCallback(async () => {
    setIsRefreshing(true);
    try {
      let tripsList: Trip[] = [];
      try {
        const res = await officerTripsApi.getActive();
        tripsList = res.trips || [];
      } catch {
        const fallbackRes = await officerTripsApi.getAll("en_route");
        tripsList = fallbackRes.trips || [];
      }

      if (tripsList.length > 0) {
        tripsList.forEach((t) => rememberTrackedTripId(t._id));
        setActiveTrips((prev) => {
          // Merge while preserving any real-time location telemetry
          const map = new Map<string, Trip>();
          tripsList.forEach((t) => map.set(t._id, t));
          prev.forEach((t) => {
            if (map.has(t._id) && t.lastKnownLocation) {
              map.set(t._id, { ...map.get(t._id)!, lastKnownLocation: t.lastKnownLocation });
            } else if (!map.has(t._id) && t.status === "en_route") {
              map.set(t._id, t);
            }
          });
          return Array.from(map.values());
        });

        if (!selectedTripId) {
          setSelectedTripId(tripsList[0]._id);
          if (tripsList[0].lastKnownLocation) {
            setAmbulanceLocation(tripsList[0].lastKnownLocation);
          } else if (tripsList[0].junctions.length > 0) {
            setAmbulanceLocation(tripsList[0].junctions[0].location);
          }
          joinOfficerTrip(tripsList[0]._id);
        }
      }
    } catch (err) {
      console.warn("Could not load active trips:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedTripId]);

  const hydrateTripRef = useRef(hydrateTrip);
  hydrateTripRef.current = hydrateTrip;
  const fetchActiveTripsRef = useRef(fetchActiveTrips);
  fetchActiveTripsRef.current = fetchActiveTrips;

  // Initial load
  useEffect(() => {
    fetchActiveTrips();
  }, [fetchActiveTrips]);

  // ── 2. Socket.IO Real-time Synchronization ───────────────────
  // Join room when active trip selection changes
  useEffect(() => {
    if (selectedTripId) {
      joinOfficerTrip(selectedTripId);
    }
  }, [selectedTripId]);

  // Main real-time socket subscription (lifecycle mounted once)
  useEffect(() => {
    connectOfficerSocket();

    // Polling heartbeat (every 4s) to guarantee new or existing trips are captured
    const pollInterval = setInterval(() => {
      fetchActiveTripsRef.current();
    }, 4000);

    // 0: Live connection state tracking
    const unsubState = onSocketStateChange((connected) => {
      setIsSocketConnected(connected);
      setLastSyncTime(new Date().toLocaleTimeString());
    });

    // A: Real-time location update from driver (exact telemetry)
    const unsubLoc = onLocationUpdate(({ tripId, location }) => {
      setLastSyncTime(new Date().toLocaleTimeString());
      if (!selectedTripIdRef.current || selectedTripIdRef.current === tripId) {
        setAmbulanceLocation(location);
      }
      let exists = false;
      setActiveTrips((prev) => {
        const found = prev.some((t) => t._id === tripId);
        if (found) {
          exists = true;
          return prev.map((t) => (t._id === tripId ? { ...t, lastKnownLocation: location } : t));
        }
        return prev;
      });
      if (!exists) {
        hydrateTripRef.current(tripId, location);
      }
    });

    // B: Real-time siren / approaching alert
    const unsubSiren = onTripSiren(({ tripId, junction }) => {
      setLastSyncTime(new Date().toLocaleTimeString());
      if (!isAlarmMutedRef.current) {
        playEmergencyAlertSound();
      }
      let exists = false;
      setActiveTrips((prev) => {
        const found = prev.some((t) => t._id === tripId);
        if (found) {
          exists = true;
          return prev.map((t) => {
            if (t._id !== tripId) return t;
            return {
              ...t,
              junctions: t.junctions.map((j) =>
                j.id === junction.id ? { ...j, status: "sirened" } : j
              ),
            };
          });
        }
        return prev;
      });
      if (!exists) {
        hydrateTripRef.current(tripId, junction?.location);
      }
    });

    // C: Real-time junction clearance
    const unsubClear = onJunctionCleared(({ tripId, junction, nextJunction }) => {
      setLastSyncTime(new Date().toLocaleTimeString());
      let exists = false;
      setActiveTrips((prev) => {
        const found = prev.some((t) => t._id === tripId);
        if (found) {
          exists = true;
          return prev.map((t) => {
            if (t._id !== tripId) return t;
            const nextIdx = t.currentJunctionIndex + 1;
            return {
              ...t,
              currentJunctionIndex: nextIdx,
              junctions: t.junctions.map((j) =>
                j.id === junction.id ? { ...j, status: "cleared" } : j
              ),
            };
          });
        }
        return prev;
      });
      if (!exists) {
        hydrateTripRef.current(tripId, junction?.location);
      }
    });

    // D: Real-time junction authorization
    const unsubAuth = onJunctionAuthorized(({ tripId, junctionId, junction }) => {
      setLastSyncTime(new Date().toLocaleTimeString());
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
      setLastSyncTime(new Date().toLocaleTimeString());
      setActiveTrips((prev) => prev.filter((t) => t._id !== tripId));
      if (selectedTripIdRef.current === tripId) {
        setSelectedTripId(null);
        setAmbulanceLocation(null);
      }
    });

    // F: Real-time NEW emergency incoming
    const unsubNew = onEmergencyNew(({ trip }) => {
      setLastSyncTime(new Date().toLocaleTimeString());
      if (!trip) return;
      const tid = trip._id || (trip as any).id;
      if (!tid) return;
      rememberTrackedTripId(tid);
      const normalizedTrip: Trip = { ...trip, _id: tid };
      setActiveTrips((prev) => {
        const exists = prev.some((t) => (t._id || (t as any).id) === tid);
        if (exists) return prev;
        return [normalizedTrip, ...prev];
      });
      setSelectedTripId((cur) => cur || tid);
      if (normalizedTrip.lastKnownLocation) {
        setAmbulanceLocation(normalizedTrip.lastKnownLocation);
      } else if (normalizedTrip.junctions && normalizedTrip.junctions.length > 0) {
        setAmbulanceLocation(normalizedTrip.junctions[0].location);
      }
      joinOfficerTrip(tid);
      if (!isAlarmMutedRef.current) {
        playEmergencyAlertSound();
      }
    });

    // G: Dispatch request taken by driver
    const unsubTaken = onRequestTaken(() => {
      setLastSyncTime(new Date().toLocaleTimeString());
      setTimeout(() => fetchActiveTripsRef.current(), 500);
    });

    // H: Incoming trip notification
    const unsubIncoming = onTripIncoming(({ tripId, junction }) => {
      setLastSyncTime(new Date().toLocaleTimeString());
      hydrateTripRef.current(tripId, junction?.location);
    });

    // I: Global emergency dispatch alert broadcast
    const unsubReqNew = onRequestNew(async ({ request }) => {
      setLastSyncTime(new Date().toLocaleTimeString());
      const addr = request?.incidentLocation?.address || "";
      let tid = "";
      if (addr.startsWith("EMERGENCY_DISPATCH:")) {
        tid = addr.replace("EMERGENCY_DISPATCH:", "").trim();
      } else {
        const hex = addr.match(/[0-9a-fA-F]{24}/);
        if (hex) tid = hex[0];
      }
      if (tid) {
        hydrateTripRef.current(tid, request?.incidentLocation);
      }
    });

    return () => {
      clearInterval(pollInterval);
      unsubState();
      unsubLoc();
      unsubSiren();
      unsubIncoming();
      unsubClear();
      unsubAuth();
      unsubComp();
      unsubNew();
      unsubTaken();
      unsubReqNew();
    };
  }, []);

  // ── 3. Officer Actions ───────────────────────────────────────
  const handleAuthorize = async (junctionId: string) => {
    if (!activeTrip) return;
    setActionLoadingId(junctionId);

    const targetJunc = activeTrip.junctions.find((j) => j.id === junctionId);

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

    // Socket emission with target junction coordinates for broadcast
    emitAuthorizeJunction(activeTrip._id, junctionId, officer.officerId, targetJunc?.location);

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

    const targetJunc = activeTrip.junctions.find((j) => j.id === junctionId);

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

    // Socket emission: pass junction location so production backend distance check triggers junction:cleared
    emitClearJunction(activeTrip._id, junctionId, officer.officerId, targetJunc?.location);

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
        isSocketConnected={isSocketConnected}
        lastSyncTime={lastSyncTime}
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

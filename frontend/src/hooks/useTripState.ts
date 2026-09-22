import { useState, useEffect, useCallback, useRef } from "react";
import type { Trip, Coordinates, Junction } from "../types";
import { tripsApi } from "../services/api";
import {
  connectSocket,
  disconnectSocket,
  joinTrip,
  sendLocationUpdate,
  onLocationUpdate,
  onTripIncoming,
  onTripSiren,
  onJunctionCleared,
  onTripCompleted,
  onJunctionAuthorized,
} from "../services/socket";

const ACTIVE_TRIP_KEY = "ambigo_active_trip_id";

export type TripPhase =
  | "idle"
  | "requesting"
  | "active"
  | "completed"
  | "error";

export interface TripAlert {
  id: string;
  type: "incoming" | "sirened" | "authorized" | "cleared" | "completed";
  junctionName?: string;
  timestamp: number;
}

interface UseTripStateReturn {
  phase: TripPhase;
  trip: Trip | null;
  currentLocation: Coordinates | null;
  alerts: TripAlert[];
  error: string | null;
  startTrip: (payload: {
    driverName: string;
    vehicleId: string;
    pickup: string;
    hospital: string;
  }) => Promise<void>;
  updateLocation: (location: Coordinates) => void;
  resetTrip: () => void;
  setTripActive: (trip: Trip) => void;
}

export function useTripState(): UseTripStateReturn {
  const [phase, setPhase] = useState<TripPhase>("idle");
  const [trip, setTrip] = useState<Trip | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [alerts, setAlerts] = useState<TripAlert[]>([]);
  const [error, setError] = useState<string | null>(null);

  const tripIdRef = useRef<string | null>(null);

  const addAlert = useCallback((alert: Omit<TripAlert, "id" | "timestamp">) => {
    setAlerts((prev) => [
      {
        ...alert,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      },
      ...prev.slice(0, 9), // keep last 10
    ]);
  }, []);

  // ── Reconnect on mount ─────────────────────────────────────
  useEffect(() => {
    const savedTripId = localStorage.getItem(ACTIVE_TRIP_KEY);
    if (!savedTripId) return;

    (async () => {
      try {
        const { trip: rehydrated } = await tripsApi.getById(savedTripId);
        if (rehydrated.status === "en_route") {
          setTrip(rehydrated);
          setPhase("active");
          tripIdRef.current = rehydrated._id;
          setupSocketListeners(rehydrated._id);
          connectSocket();
          joinTrip(rehydrated._id);
        } else {
          localStorage.removeItem(ACTIVE_TRIP_KEY);
        }
      } catch {
        localStorage.removeItem(ACTIVE_TRIP_KEY);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Socket listeners ────────────────────────────────────────
  function setupSocketListeners(_tripId: string) {
    const cleanupIncoming = onTripIncoming(({ junction }) => {
      addAlert({ type: "incoming", junctionName: junction.name });
      setTrip((t: Trip | null) =>
        t
          ? {
              ...t,
              junctions: t.junctions.map((j: Junction) =>
                j.id === junction.id ? { ...j, status: "incoming" as const } : j
              ),
            }
          : t
      );
    });

    const cleanupSiren = onTripSiren(({ junction }) => {
      addAlert({ type: "sirened", junctionName: junction.name });
      setTrip((t: Trip | null) =>
        t
          ? {
              ...t,
              junctions: t.junctions.map((j: Junction) =>
                j.id === junction.id ? { ...j, status: "sirened" as const } : j
              ),
            }
          : t
      );
    });

    const cleanupCleared = onJunctionCleared(({ junction }) => {
      addAlert({ type: "cleared", junctionName: junction.name });
      setTrip((t: Trip | null) =>
        t
          ? {
              ...t,
              junctions: t.junctions.map((j: Junction) =>
                j.id === junction.id ? { ...j, status: "cleared" as const } : j
              ),
              currentJunctionIndex: (t.currentJunctionIndex ?? 0) + 1,
            }
          : t
      );
    });

    const cleanupAuth = onJunctionAuthorized(({ junction }) => {
      addAlert({ type: "authorized", junctionName: junction.name });
      setTrip((t: Trip | null) =>
        t
          ? {
              ...t,
              junctions: t.junctions.map((j: Junction) =>
                j.id === junction.id ? { ...j, status: "authorized" as const } : j
              ),
            }
          : t
      );
    });

    const cleanupLoc = onLocationUpdate(({ location }) => {
      if ((location as any)?.passageAuthorized && (location as any)?.authorizedJunctionId) {
        const jId = (location as any).authorizedJunctionId;
        setTrip((t: Trip | null) => {
          if (!t) return t;
          const junction = t.junctions.find((j: Junction) => j.id === jId);
          if (junction && junction.status !== "authorized") {
            addAlert({ type: "authorized", junctionName: junction.name });
          }
          return {
            ...t,
            junctions: t.junctions.map((j: Junction) =>
              j.id === jId ? { ...j, status: "authorized" as const, officerId: (location as any).officerId } : j
            ),
          };
        });
      }
    });

    const cleanupCompleted = onTripCompleted(() => {
      addAlert({ type: "completed" });
      setPhase("completed");
      setTrip((t: Trip | null) => (t ? { ...t, status: "completed" as const } : t));
      localStorage.removeItem(ACTIVE_TRIP_KEY);
      disconnectSocket();
    });

    return () => {
      cleanupIncoming();
      cleanupSiren();
      cleanupAuth();
      cleanupLoc();
      cleanupCleared();
      cleanupCompleted();
    };
  }

  // ── Start a new trip ────────────────────────────────────────
  const startTrip = useCallback(
    async (payload: {
      driverName: string;
      vehicleId: string;
      pickup: string;
      hospital: string;
    }) => {
      setPhase("requesting");
      setError(null);

      try {
        const { trip: created } = await tripsApi.create(payload);
        setTrip(created);
        setPhase("active");
        tripIdRef.current = created._id;
        localStorage.setItem(ACTIVE_TRIP_KEY, created._id);

        connectSocket();
        setupSocketListeners(created._id);
        joinTrip(created._id);

        // Real-time notification to traffic officers via production backend request broadcast
        try {
          await fetch(`${import.meta.env.VITE_API_URL || "https://ambigo-driver.onrender.com/api"}/requests`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patientName: `Emergency Transit (${created.vehicleId})`,
              patientPhone: "+91 98765 43210",
              incidentLocation: {
                lat: created.junctions[0]?.location.lat || 17.4504,
                lng: created.junctions[0]?.location.lng || 78.3808,
                address: `EMERGENCY_DISPATCH:${created._id}`,
              },
              hospital: created.hospital,
              severity: "critical",
            }),
          });
        } catch {
          // Non-blocking fallback
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start trip.");
        setPhase("error");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Set existing trip active (e.g. from accepting a request) ──
  const setTripActive = useCallback((newTrip: Trip) => {
    setError(null);
    setTrip(newTrip);
    setPhase("active");
    tripIdRef.current = newTrip._id;
    localStorage.setItem(ACTIVE_TRIP_KEY, newTrip._id);

    connectSocket();
    setupSocketListeners(newTrip._id);
    joinTrip(newTrip._id);

    // Real-time notification to traffic officers via production backend request broadcast
    fetch(`${import.meta.env.VITE_API_URL || "https://ambigo-driver.onrender.com/api"}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientName: `Emergency Transit (${newTrip.vehicleId})`,
        patientPhone: "+91 98765 43210",
        incidentLocation: {
          lat: newTrip.junctions[0]?.location.lat || 17.4504,
          lng: newTrip.junctions[0]?.location.lng || 78.3808,
          address: `EMERGENCY_DISPATCH:${newTrip._id}`,
        },
        hospital: newTrip.hospital,
        severity: "critical",
      }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Send location update ────────────────────────────────────
  const updateLocation = useCallback((location: Coordinates) => {
    setCurrentLocation(location);
    if (tripIdRef.current) {
      sendLocationUpdate(tripIdRef.current, location);
    }
  }, []);

  // ── Reset ───────────────────────────────────────────────────
  const resetTrip = useCallback(() => {
    disconnectSocket();
    localStorage.removeItem(ACTIVE_TRIP_KEY);
    setPhase("idle");
    setTrip(null);
    setCurrentLocation(null);
    setAlerts([]);
    setError(null);
    tripIdRef.current = null;
  }, []);

  return {
    phase,
    trip,
    currentLocation,
    alerts,
    error,
    startTrip,
    updateLocation,
    resetTrip,
    setTripActive,
  };
}

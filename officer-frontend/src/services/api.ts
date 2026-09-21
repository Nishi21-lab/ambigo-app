import type {
  Trip,
  Junction,
  TrafficDensity,
  OfficerAuthResponse,
} from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "https://ambigo-driver.onrender.com/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = localStorage.getItem("ambigo_officer_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ── Officer Auth API ──────────────────────────────────────────
export const officerAuthApi = {
  login: async (payload: { email: string; password: string }): Promise<OfficerAuthResponse> => {
    try {
      return await request<OfficerAuthResponse>("/auth/officer/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      // If /auth/officer/login is not deployed on production backend yet, fallback to /auth/login
      if (err.message && (err.message.includes("404") || err.message.includes("not found") || err.message.includes("Route not found"))) {
        const res = await request<{ token: string; driver?: any; officer?: any }>("/auth/login", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        return {
          token: res.token,
          officer: {
            id: res.officer?.id || res.driver?.id || "officer_001",
            officerId: res.officer?.officerId || res.driver?.vehicleId || "OFF-HYD-042",
            name: res.officer?.name || res.driver?.name || "Insp. K. Vikram Rao",
            email: res.officer?.email || res.driver?.email || payload.email,
            badgeNumber: res.officer?.badgeNumber || "TRF-8842",
            zone: res.officer?.zone || "Cyberabad Central Corridor",
          },
        };
      }
      throw err;
    }
  },
};

// ── Officer Trips & Junction API ──────────────────────────────
export const officerTripsApi = {
  getAll: async (status?: string): Promise<{ trips: Trip[] }> => {
    try {
      return await request(status ? `/trips?status=${encodeURIComponent(status)}` : "/trips");
    } catch {
      // Production Render backend fallback: hydrate trips from /requests
      try {
        const reqRes = await request<{ requests: any[] }>("/requests");
        const tripIds = [
          ...new Set(
            (reqRes.requests || [])
              .filter((r) => r.incidentLocation?.address?.startsWith("EMERGENCY_DISPATCH:"))
              .map((r) => r.incidentLocation.address.replace("EMERGENCY_DISPATCH:", "").trim())
          ),
        ];
        const fetchedTrips: Trip[] = [];
        for (const tid of tripIds) {
          try {
            const tRes = await request<{ trip: Trip }>(`/trips/${tid}`);
            if (tRes.trip) {
              if (!status || tRes.trip.status === status) {
                fetchedTrips.push(tRes.trip);
              }
            }
          } catch {}
        }
        return { trips: fetchedTrips };
      } catch {
        return { trips: [] };
      }
    }
  },

  getActive: async (): Promise<{ trips: Trip[] }> => {
    try {
      return await request("/trips/active");
    } catch {
      return officerTripsApi.getAll("en_route");
    }
  },

  getById: (id: string): Promise<{ trip: Trip }> =>
    request(`/trips/${id}`),

  authorizeJunction: (
    tripId: string,
    junctionId: string,
    officerId: string = "OFF-HYD-042"
  ): Promise<{ trip: Trip; junction: Junction }> =>
    request(`/trips/${tripId}/junctions/${junctionId}/authorize`, {
      method: "PATCH",
      body: JSON.stringify({ officerId }),
    }),

  clearJunction: (
    tripId: string,
    junctionId: string,
    officerId: string = "OFF-HYD-042"
  ): Promise<{ trip: Trip; junction: Junction; isCompleted: boolean }> =>
    request(`/trips/${tripId}/junctions/${junctionId}/clear`, {
      method: "PATCH",
      body: JSON.stringify({ officerId }),
    }),

  updateTraffic: (
    tripId: string,
    junctionId: string,
    density: TrafficDensity
  ): Promise<{ trip: Trip; junction: Junction }> =>
    request(`/trips/${tripId}/junctions/${junctionId}/traffic`, {
      method: "PATCH",
      body: JSON.stringify({ density }),
    }),

  completeTrip: (id: string): Promise<{ trip: Trip }> =>
    request(`/trips/${id}/complete`, { method: "PATCH" }),
};

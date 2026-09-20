import type {
  Trip,
  Junction,
  TrafficDensity,
  OfficerAuthResponse,
} from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

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
  login: (payload: { email: string; password: string }): Promise<OfficerAuthResponse> =>
    request("/auth/officer/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

// ── Officer Trips & Junction API ──────────────────────────────
export const officerTripsApi = {
  getAll: (status?: string): Promise<{ trips: Trip[] }> =>
    request(status ? `/trips?status=${encodeURIComponent(status)}` : "/trips"),

  getActive: (): Promise<{ trips: Trip[] }> =>
    request("/trips/active"),

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

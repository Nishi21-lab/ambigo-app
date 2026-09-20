import type { CreateTripPayload, Trip, AmbulanceRequest, AcceptRequestPayload, Inventory, Crew, UpdateInventoryPayload, AuthResponse } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = localStorage.getItem("ambigo_token");
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

// ── Auth API ─────────────────────────────────────────────────
export const authApi = {
  register: (payload: any): Promise<AuthResponse> =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  login: (payload: any): Promise<AuthResponse> =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getMe: (): Promise<{ driver: AuthResponse["driver"] }> =>
    request("/auth/me"),
};

// ── Trips API ─────────────────────────────────────────────────
export const tripsApi = {
  create: (payload: CreateTripPayload): Promise<{ trip: Trip }> =>
    request("/trips", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getById: (id: string): Promise<{ trip: Trip }> =>
    request(`/trips/${id}`),

  complete: (id: string): Promise<{ trip: Trip }> =>
    request(`/trips/${id}/complete`, { method: "PATCH" }),

  cancel: (id: string): Promise<{ trip: Trip }> =>
    request(`/trips/${id}/cancel`, { method: "PATCH" }),
};

// ── Requests API ─────────────────────────────────────────────────
export const requestsApi = {
  getPending: (): Promise<{ requests: AmbulanceRequest[] }> =>
    request(`/requests?status=pending`),

  accept: (id: string, payload: AcceptRequestPayload): Promise<{ trip: Trip }> =>
    request(`/requests/${id}/accept`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

// ── Vehicles API ─────────────────────────────────────────────────
export const vehiclesApi = {
  getInventory: (vehicleId: string): Promise<{ inventory: Inventory }> =>
    request(`/vehicles/${vehicleId}/inventory`),

  getCrew: (vehicleId: string): Promise<{ crew: Crew }> =>
    request(`/vehicles/${vehicleId}/crew`),

  updateInventory: (vehicleId: string, payload: UpdateInventoryPayload): Promise<{ inventory: Inventory }> =>
    request(`/vehicles/${vehicleId}/inventory`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};

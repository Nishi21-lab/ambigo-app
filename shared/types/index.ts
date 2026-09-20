// Shared types used by both frontend and backend

// ──────────────────────────────────────────
// Inventory & Crew
// ──────────────────────────────────────────
export interface InventoryItem {
  name: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
}

export interface Inventory {
  _id: string;
  vehicleId: string;
  items: InventoryItem[];
  updatedAt: string;
}

export interface CrewMember {
  name: string;
  role: string;
  phone?: string;
  experience?: string;
  certifications?: string[];
  skills?: string[];
}

export interface Crew {
  _id: string;
  vehicleId: string;
  members: CrewMember[];
  shiftStart?: string;
  updatedAt: string;
}

// ──────────────────────────────────────────
// Auth
// ──────────────────────────────────────────
export interface DriverSession {
  id: string;
  name: string;
  email: string;
  vehicleId: string;
}

export interface OfficerSession {
  id: string;
  officerId: string;
  name: string;
  email: string;
  badgeNumber: string;
  zone: string;
}

export interface AuthResponse {
  token: string;
  driver: DriverSession;
}

export interface OfficerAuthResponse {
  token: string;
  officer: OfficerSession;
}

// ──────────────────────────────────────────
// Request (Dispatch -> Driver)
// ──────────────────────────────────────────
export type RequestStatus = "pending" | "accepted" | "cancelled";

export interface AmbulanceRequest {
  _id: string; // nanoid
  incidentLocation: {
    lat: number;
    lng: number;
    address?: string;
  };
  hospital: string;
  status: RequestStatus;
  createdAt: string;
  acceptedBy?: Driver;
  acceptedAt?: string;
}

// ──────────────────────────────────────────
// Driver
// ──────────────────────────────────────────
export interface Driver {
  driverName: string;
  vehicleId: string;
}

// ──────────────────────────────────────────
// Location
// ──────────────────────────────────────────
export interface Coordinates {
  lat: number;
  lng: number;
}

// ──────────────────────────────────────────
// Junction
// ──────────────────────────────────────────
export type JunctionStatus = "pending" | "incoming" | "sirened" | "authorized" | "cleared";
export type TrafficDensity = "clear" | "moderate" | "heavy";

export interface Junction {
  id: string;
  name: string;
  location: Coordinates;
  status: JunctionStatus;
  officerId?: string;
  trafficDensity?: TrafficDensity;
  authorizedAt?: string;
  clearedAt?: string;
}

// ──────────────────────────────────────────
// Trip
// ──────────────────────────────────────────
export type TripStatus = "en_route" | "completed" | "cancelled";

export interface Trip {
  _id: string;
  driverName: string;
  vehicleId: string;
  pickup: string;
  hospital: string;
  status: TripStatus;
  junctions: Junction[];
  currentJunctionIndex: number;
  startedAt: string;
  completedAt?: string;
  lastKnownLocation?: Coordinates;
}

// ──────────────────────────────────────────
// API Payloads
// ──────────────────────────────────────────
export interface CreateTripPayload {
  driverName: string;
  vehicleId: string;
  pickup: string;
  hospital: string;
}

export interface CreateTripResponse {
  trip: Trip;
}

export interface GetTripResponse {
  trip: Trip;
}

export interface CreateRequestPayload {
  incidentLocation: {
    lat: number;
    lng: number;
    address?: string;
  };
  hospital: string;
}

export interface GetRequestsResponse {
  requests: AmbulanceRequest[];
}

export interface AcceptRequestPayload {
  driverName: string;
  vehicleId: string;
}

export interface AcceptRequestResponse {
  trip: Trip;
}

export interface UpdateInventoryPayload {
  items: { name: string; quantity: number }[];
}

// ──────────────────────────────────────────
// Socket.io Events
// ──────────────────────────────────────────
// Driver emits:
export interface DriverJoinTripPayload {
  tripId: string;
}

export interface DriverLocationUpdatePayload {
  tripId: string;
  location: Coordinates;
}

// Server emits back:
export interface TripIncomingPayload {
  tripId: string;
  junction: Junction;
}

export interface TripSirenPayload {
  tripId: string;
  junction: Junction;
}

export interface JunctionClearedPayload {
  tripId: string;
  junction: Junction;
  nextJunction?: Junction;
}

export interface TripCompletedPayload {
  tripId: string;
}

export interface RequestNewPayload {
  request: AmbulanceRequest;
}

export interface RequestTakenPayload {
  requestId: string;
}

// Officer Events
export interface JunctionAuthorizedPayload {
  tripId: string;
  junctionId: string;
  junction: Junction;
}

export interface EmergencyNewPayload {
  trip: Trip;
}

export interface OfficerAuthorizePayload {
  tripId: string;
  junctionId: string;
  officerId: string;
}

export interface OfficerClearPayload {
  tripId: string;
  junctionId: string;
  officerId: string;
}

export interface TrafficUpdatePayload {
  tripId: string;
  junctionId: string;
  density: TrafficDensity;
}

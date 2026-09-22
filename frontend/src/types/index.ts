// AmbiGo Driver Types (Self-contained for independent build & deployment)

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

export interface DriverSession {
  id: string;
  name: string;
  email: string;
  vehicleId: string;
}

export interface AuthResponse {
  token: string;
  driver: DriverSession;
}

export type RequestStatus = "pending" | "accepted" | "cancelled";

export interface AmbulanceRequest {
  _id: string;
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

export interface Driver {
  driverName: string;
  vehicleId: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

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

export interface DriverJoinTripPayload {
  tripId: string;
}

export interface DriverLocationUpdatePayload {
  tripId: string;
  location: Coordinates;
}

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

export interface JunctionAuthorizedPayload {
  tripId: string;
  junctionId: string;
  junction: Junction;
}

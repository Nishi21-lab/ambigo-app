// AmbiGo Traffic Officer Types (Self-contained for independent build & deployment)

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

export interface OfficerSession {
  id: string;
  officerId: string;
  name: string;
  email: string;
  badgeNumber: string;
  zone: string;
}

export interface OfficerAuthResponse {
  token: string;
  officer: OfficerSession;
}

export interface TripCompletedPayload {
  tripId: string;
}

export interface RequestTakenPayload {
  requestId: string;
}

export interface OfficerUIState {
  isAlarmMuted: boolean;
  selectedTripId: string | null;
  activeTab: "command" | "history";
}

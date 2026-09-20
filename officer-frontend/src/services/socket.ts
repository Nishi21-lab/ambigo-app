/// <reference types="vite/client" />
import { io, Socket } from "socket.io-client";
import type {
  Coordinates,
  Junction,
  Trip,
  TripCompletedPayload,
  RequestTakenPayload,
} from "../types";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "https://ambigo-driver.onrender.com";

let socket: Socket | null = null;

export function getOfficerSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
  }
  return socket;
}

export function connectOfficerSocket() {
  const s = getOfficerSocket();
  if (!s.connected) {
    s.connect();
    s.emit("officer:join");
  }
}

export function disconnectOfficerSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// ── Emits ─────────────────────────────────────────────────────
export function joinOfficerTrip(tripId: string) {
  const s = getOfficerSocket();
  s.emit("driver:join_trip", { tripId });
  s.emit("officer:join_trip", { tripId });
}

export function emitAuthorizeJunction(tripId: string, junctionId: string, officerId: string = "OFF-HYD-042") {
  getOfficerSocket().emit("officer:authorize_junction", { tripId, junctionId, officerId });
}

export function emitClearJunction(tripId: string, junctionId: string, officerId: string = "OFF-HYD-042") {
  getOfficerSocket().emit("officer:clear_junction", { tripId, junctionId, officerId });
}

// ── Listeners ─────────────────────────────────────────────────
export function onLocationUpdate(
  cb: (payload: { tripId: string; location: Coordinates }) => void
) {
  const s = getOfficerSocket();
  s.on("location:update", cb);
  return () => {
    s.off("location:update", cb);
  };
}

export function onTripSiren(
  cb: (payload: { tripId: string; junction: Junction }) => void
) {
  const s = getOfficerSocket();
  s.on("trip:siren", cb);
  return () => {
    s.off("trip:siren", cb);
  };
}

export function onJunctionCleared(
  cb: (payload: {
    tripId: string;
    junction: Junction;
    nextJunction?: Junction;
  }) => void
) {
  const s = getOfficerSocket();
  s.on("junction:cleared", cb);
  return () => {
    s.off("junction:cleared", cb);
  };
}

export function onJunctionAuthorized(
  cb: (payload: {
    tripId: string;
    junctionId: string;
    junction: Junction;
  }) => void
) {
  const s = getOfficerSocket();
  s.on("junction:authorized", cb);
  return () => {
    s.off("junction:authorized", cb);
  };
}

export function onTripCompleted(cb: (payload: TripCompletedPayload) => void) {
  const s = getOfficerSocket();
  s.on("trip:completed", cb);
  return () => {
    s.off("trip:completed", cb);
  };
}

export function onEmergencyNew(cb: (payload: { trip: Trip }) => void) {
  const s = getOfficerSocket();
  s.on("emergency:new", cb);
  return () => {
    s.off("emergency:new", cb);
  };
}

export function onRequestTaken(cb: (payload: RequestTakenPayload) => void) {
  const s = getOfficerSocket();
  s.on("request:taken", cb);
  return () => {
    s.off("request:taken", cb);
  };
}

export function onTripIncoming(
  cb: (payload: { tripId: string; junction: Junction }) => void
) {
  const s = getOfficerSocket();
  s.on("trip:incoming", cb);
  return () => {
    s.off("trip:incoming", cb);
  };
}

/// <reference types="vite/client" />
import { io, Socket } from "socket.io-client";
import type {
  Coordinates,
  Junction,
  TripCompletedPayload,
  RequestNewPayload,
  RequestTakenPayload,
} from "../types";

function cleanSocketUrl(rawUrl?: string): string {
  const fallback = "https://ambigo-driver.onrender.com";
  if (!rawUrl || typeof rawUrl !== "string") return fallback;
  const firstLine = rawUrl.split(/[\r\n]+/).map((s) => s.trim()).filter(Boolean)[0];
  let cleaned = (firstLine || rawUrl).trim().replace(/\/+$/, "");
  const match = cleaned.match(/https?:\/\/[^\s"'<>\n\r]+/);
  if (match) {
    cleaned = match[0].replace(/\/+$/, "");
  }
  cleaned = cleaned.replace(/\/api$/, "");
  return cleaned || fallback;
}

const SOCKET_URL = cleanSocketUrl(import.meta.env.VITE_SOCKET_URL);

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket() {
  getSocket().connect();
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

// ── Emit helpers ──────────────────────────────────────────────
export function joinTrip(tripId: string) {
  getSocket().emit("driver:join_trip", { tripId });
}

export function sendLocationUpdate(tripId: string, location: Coordinates) {
  getSocket().emit("driver:location_update", { tripId, location });
}

// ── Listener helpers ──────────────────────────────────────────
export function onLocationUpdate(
  cb: (payload: { tripId: string; location: Coordinates }) => void
) {
  getSocket().on("location:update", cb);
  return () => getSocket().off("location:update", cb);
}

export function onTripIncoming(
  cb: (payload: { tripId: string; junction: Junction }) => void
) {
  getSocket().on("trip:incoming", cb);
  return () => getSocket().off("trip:incoming", cb);
}

export function onTripSiren(
  cb: (payload: { tripId: string; junction: Junction }) => void
) {
  getSocket().on("trip:siren", cb);
  return () => getSocket().off("trip:siren", cb);
}

export function onJunctionCleared(
  cb: (payload: {
    tripId: string;
    junction: Junction;
    nextJunction?: Junction;
  }) => void
) {
  getSocket().on("junction:cleared", cb);
  return () => getSocket().off("junction:cleared", cb);
}

export function onTripCompleted(cb: (payload: TripCompletedPayload) => void) {
  getSocket().on("trip:completed", cb);
  return () => getSocket().off("trip:completed", cb);
}

export function onRequestNew(cb: (payload: RequestNewPayload) => void) {
  getSocket().on("request:new", cb);
  return () => getSocket().off("request:new", cb);
}

export function onRequestTaken(cb: (payload: RequestTakenPayload) => void) {
  getSocket().on("request:taken", cb);
  return () => getSocket().off("request:taken", cb);
}

export function onJunctionAuthorized(
  cb: (payload: { tripId: string; junctionId: string; junction: Junction }) => void
) {
  getSocket().on("junction:authorized", cb);
  return () => getSocket().off("junction:authorized", cb);
}

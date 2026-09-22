/// <reference types="vite/client" />
import { io, Socket } from "socket.io-client";
import type {
  Coordinates,
  Junction,
  Trip,
  TripCompletedPayload,
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

export function getOfficerSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: false,
    });

    socket.on("connect", () => {
      socket?.emit("officer:join");
    });
  }
  return socket;
}

export function connectOfficerSocket() {
  const s = getOfficerSocket();
  if (!s.connected) {
    s.connect();
  }
  s.emit("officer:join");
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

export function emitAuthorizeJunction(
  tripId: string,
  junctionId: string,
  officerId: string = "OFF-HYD-042",
  junctionLocation?: Coordinates
) {
  getOfficerSocket().emit("officer:authorize_junction", { tripId, junctionId, officerId });
  getOfficerSocket().emit("driver:location_update", {
    tripId,
    location: {
      lat: junctionLocation?.lat || 17.4350,
      lng: junctionLocation?.lng || 78.3980,
      authorizedJunctionId: junctionId,
      officerId,
      passageAuthorized: true,
    },
  });
}

export function emitClearJunction(
  tripId: string,
  junctionId: string,
  officerId: string = "OFF-HYD-042",
  junctionLocation?: Coordinates
) {
  getOfficerSocket().emit("officer:clear_junction", { tripId, junctionId, officerId });
  if (junctionLocation) {
    getOfficerSocket().emit("driver:location_update", { tripId, location: junctionLocation });
  }
}

export function emitLocationUpdate(tripId: string, location: Coordinates) {
  getOfficerSocket().emit("driver:location_update", { tripId, location });
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

export function onRequestNew(cb: (payload: { request: any }) => void) {
  const s = getOfficerSocket();
  s.on("request:new", cb);
  return () => {
    s.off("request:new", cb);
  };
}

export function onSocketStateChange(cb: (connected: boolean) => void) {
  const s = getOfficerSocket();
  const onConnect = () => cb(true);
  const onDisconnect = () => cb(false);
  s.on("connect", onConnect);
  s.on("disconnect", onDisconnect);
  // initial state
  cb(s.connected);
  return () => {
    s.off("connect", onConnect);
    s.off("disconnect", onDisconnect);
  };
}

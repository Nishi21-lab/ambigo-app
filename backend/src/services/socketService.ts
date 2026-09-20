import type { Server } from "socket.io";
import { TripModel } from "../models/Trip.js";
import type { Coordinates } from "../../../shared/types/index.js";

const SIREN_DISTANCE_METERS = 300; // trigger sirening/alert when within 300m

function haversineDistance(a: Coordinates, b: Coordinates): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const a2 =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      sinDLng *
      sinDLng;
  return 2 * R * Math.asin(Math.sqrt(a2));
}

let ioInstance: Server | null = null;

export function getIO(): Server {
  if (!ioInstance) {
    throw new Error("Socket.io not initialized!");
  }
  return ioInstance;
}

export function setupSocketHandlers(io: Server): void {
  ioInstance = io;
  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // ── Driver/Officer joins a trip room ────────────────────────
    socket.on("driver:join_trip", async ({ tripId }: { tripId: string }) => {
      socket.join(tripId);
      console.log(`[Socket] Client ${socket.id} joined trip room: ${tripId}`);

      const trip = await TripModel.findById(tripId);
      if (!trip) return;

      // Emit current junctions as "incoming" so driver/officer knows system is active
      const incomingJunctions = trip.junctions.filter(
        (j) => j.status === "incoming" || j.status === "sirened" || j.status === "authorized"
      );
      for (const junc of incomingJunctions) {
        socket.emit("trip:incoming", { tripId, junction: junc });
      }
    });

    // ── Officer global join ───────────────────────────────────
    socket.on("officer:join", () => {
      socket.join("officers");
      console.log(`[Socket] Officer ${socket.id} joined officers room`);
    });

    socket.on("officer:join_trip", ({ tripId }: { tripId: string }) => {
      socket.join(tripId);
      console.log(`[Socket] Officer ${socket.id} explicitly joined trip room: ${tripId}`);
    });

    // ── Officer authorizes passage via Socket ─────────────────
    socket.on(
      "officer:authorize_junction",
      async ({
        tripId,
        junctionId,
        officerId = "OFF-HYD-042",
      }: {
        tripId: string;
        junctionId: string;
        officerId?: string;
      }) => {
        try {
          const trip = await TripModel.findById(tripId);
          if (!trip) return;

          const junction = trip.junctions.find((j) => j.id === junctionId);
          if (!junction) return;

          junction.status = "authorized";
          junction.officerId = officerId;
          junction.authorizedAt = new Date().toISOString();

          await trip.save();

          console.log(`[Socket] Junction authorized: ${junction.name} on Trip: ${tripId}`);

          const payload = { tripId, junctionId, junction };
          io.to(tripId).emit("junction:authorized", payload);
          io.emit("junction:authorized", payload);
          io.to(tripId).emit("junction:status_update", payload);
          io.emit("junction:status_update", payload);
        } catch (err) {
          console.error("[Socket] officer:authorize_junction error:", err);
        }
      }
    );

    // ── Officer clears junction via Socket ────────────────────
    socket.on(
      "officer:clear_junction",
      async ({
        tripId,
        junctionId,
        officerId = "OFF-HYD-042",
      }: {
        tripId: string;
        junctionId: string;
        officerId?: string;
      }) => {
        try {
          const trip = await TripModel.findById(tripId);
          if (!trip) return;

          const junctionIndex = trip.junctions.findIndex((j) => j.id === junctionId);
          if (junctionIndex === -1) return;

          const junction = trip.junctions[junctionIndex];
          junction.status = "cleared";
          junction.clearedAt = new Date().toISOString();
          if (officerId) junction.officerId = officerId;

          if (trip.currentJunctionIndex <= junctionIndex) {
            trip.currentJunctionIndex = junctionIndex + 1;
          }

          let isCompleted = false;
          if (trip.currentJunctionIndex >= trip.junctions.length) {
            trip.status = "completed";
            trip.completedAt = new Date();
            isCompleted = true;
          }

          await trip.save();

          console.log(`[Socket] Junction cleared: ${junction.name} on Trip: ${tripId}`);

          const nextJunction = trip.junctions[trip.currentJunctionIndex];
          const clearedPayload = {
            tripId,
            junction,
            nextJunction: nextJunction ?? undefined,
          };

          io.to(tripId).emit("junction:cleared", clearedPayload);
          io.emit("junction:cleared", clearedPayload);

          if (isCompleted) {
            io.to(tripId).emit("trip:completed", { tripId });
            io.emit("trip:completed", { tripId });
          }
        } catch (err) {
          console.error("[Socket] officer:clear_junction error:", err);
        }
      }
    );

    // ── Driver sends a location update ────────────────────────
    socket.on(
      "driver:location_update",
      async ({
        tripId,
        location,
      }: {
        tripId: string;
        location: Coordinates;
      }) => {
        try {
          const trip = await TripModel.findById(tripId);
          if (!trip || trip.status !== "en_route") return;

          // Persist latest known location
          trip.lastKnownLocation = location;

          const currentJunction = trip.junctions[trip.currentJunctionIndex];
          if (!currentJunction) return;

          const distance = haversineDistance(
            location,
            currentJunction.location
          );

          // Broadcast live location to trip room AND all connected clients
          const locPayload = { tripId, location };
          io.to(tripId).emit("location:update", locPayload);
          io.emit("location:update", locPayload);

          // ── Siren / Alert: within SIREN_DISTANCE_METERS of next junction ──
          if (
            distance <= SIREN_DISTANCE_METERS &&
            (currentJunction.status === "incoming" || currentJunction.status === "pending")
          ) {
            currentJunction.status = "sirened";
            await trip.save();

            const sirenPayload = {
              tripId,
              junction: currentJunction,
            };
            io.to(tripId).emit("trip:siren", sirenPayload);
            io.emit("trip:siren", sirenPayload);
            console.log(
              `[Socket] Sirened: ${currentJunction.name} (Trip: ${tripId})`
            );
          }

          // ── Clear: past the junction (50m threshold) ──────────────
          if (
            distance <= 50 &&
            (currentJunction.status === "sirened" || currentJunction.status === "authorized")
          ) {
            currentJunction.status = "cleared";
            currentJunction.clearedAt = new Date().toISOString();
            trip.currentJunctionIndex += 1;
            await trip.save();

            const nextJunction = trip.junctions[trip.currentJunctionIndex];
            const clearedPayload = {
              tripId,
              junction: currentJunction,
              nextJunction: nextJunction ?? undefined,
            };

            io.to(tripId).emit("junction:cleared", clearedPayload);
            io.emit("junction:cleared", clearedPayload);
            console.log(
              `[Socket] Cleared: ${currentJunction.name} (Trip: ${tripId})`
            );

            // ── Trip complete: all junctions cleared ──────────────────
            if (trip.currentJunctionIndex >= trip.junctions.length) {
              trip.status = "completed";
              trip.completedAt = new Date();
              await trip.save();

              io.to(tripId).emit("trip:completed", { tripId });
              io.emit("trip:completed", { tripId });
              console.log(`[Socket] Trip completed: ${tripId}`);
            }
          }
        } catch (err) {
          console.error("[Socket] location_update error:", err);
        }
      }
    );

    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
}

import type { Context } from "hono";
import { TripModel } from "../models/Trip.js";
import { getSeededJunctions } from "../utils/seededRoute.js";
import { getIO } from "../services/socketService.js";
import type { CreateTripPayload } from "../../../shared/types/index.js";

// ──────────────────────────────────────────
// POST /api/trips
// ──────────────────────────────────────────
export async function createTrip(c: Context) {
  try {
    const body = await c.req.json<CreateTripPayload>();
    const { driverName, vehicleId, pickup, hospital } = body;

    if (!driverName || !vehicleId || !pickup || !hospital) {
      return c.json({ error: "All fields are required." }, 400);
    }

    const junctions = getSeededJunctions();

    // Mark all junctions as "incoming" immediately on trip creation (Tier 1 alert)
    const junctionsWithIncoming = junctions.map((j) => ({
      ...j,
      status: "incoming" as const,
      trafficDensity: "moderate" as const,
    }));

    const trip = await TripModel.create({
      driverName: driverName.trim(),
      vehicleId: vehicleId.trim(),
      pickup: pickup.trim(),
      hospital: hospital.trim(),
      status: "en_route",
      junctions: junctionsWithIncoming,
      currentJunctionIndex: 0,
      startedAt: new Date(),
    });

    console.log(
      `[Trip] Created: ${trip._id} | Driver: ${driverName} | Vehicle: ${vehicleId}`
    );

    const tripJSON = trip.toJSON();

    // Real-time broadcast to all connected clients & officers
    try {
      const io = getIO();
      io.emit("emergency:new", { trip: tripJSON });
      io.emit("trip:incoming", { tripId: trip._id.toString(), junction: junctionsWithIncoming[0] });
    } catch (e) {
      console.warn("[Socket] Could not broadcast emergency:new", e);
    }

    return c.json({ trip: tripJSON }, 201);
  } catch (error) {
    console.error("[Trip] Create error:", error);
    return c.json({ error: "Failed to create trip." }, 500);
  }
}

// ──────────────────────────────────────────
// GET /api/trips (List trips with status filter)
// ──────────────────────────────────────────
export async function getTrips(c: Context) {
  try {
    const status = c.req.query("status");
    const query: Record<string, any> = {};

    if (status) {
      query.status = status;
    }

    const trips = await TripModel.find(query)
      .sort({ startedAt: -1, createdAt: -1 })
      .limit(50);

    return c.json({ trips: trips.map((t) => t.toJSON()) }, 200);
  } catch (error) {
    console.error("[Trip] List error:", error);
    return c.json({ error: "Failed to retrieve trips." }, 500);
  }
}

// ──────────────────────────────────────────
// GET /api/trips/active
// ──────────────────────────────────────────
export async function getActiveTrips(c: Context) {
  try {
    const trips = await TripModel.find({ status: "en_route" })
      .sort({ startedAt: -1 })
      .limit(10);

    return c.json({ trips: trips.map((t) => t.toJSON()) }, 200);
  } catch (error) {
    console.error("[Trip] Active trips error:", error);
    return c.json({ error: "Failed to retrieve active trips." }, 500);
  }
}

// ──────────────────────────────────────────
// GET /api/trips/:id
// ──────────────────────────────────────────
export async function getTrip(c: Context) {
  try {
    const id = c.req.param("id");
    if (!id) {
      return c.json({ error: "Trip ID is required." }, 400);
    }
    const trip = await TripModel.findById(id);

    if (!trip) {
      return c.json({ error: "Trip not found." }, 404);
    }

    return c.json({ trip: trip.toJSON() }, 200);
  } catch (error) {
    console.error("[Trip] Get error:", error);
    return c.json({ error: "Failed to retrieve trip." }, 500);
  }
}

// ──────────────────────────────────────────
// PATCH /api/trips/:id/junctions/:junctionId/authorize
// ──────────────────────────────────────────
export async function authorizeJunction(c: Context) {
  try {
    const id = c.req.param("id");
    const junctionId = c.req.param("junctionId");
    if (!id || !junctionId) {
      return c.json({ error: "Trip ID and Junction ID are required." }, 400);
    }
    const body = await c.req.json().catch(() => ({}));
    const officerId = body.officerId || "OFF-HYD-042";

    const trip = await TripModel.findById(id);
    if (!trip) {
      return c.json({ error: "Trip not found." }, 404);
    }

    const junction = trip.junctions.find((j) => j.id === junctionId);
    if (!junction) {
      return c.json({ error: "Junction not found in trip." }, 404);
    }

    junction.status = "authorized";
    junction.officerId = officerId;
    junction.authorizedAt = new Date().toISOString();

    await trip.save();

    console.log(
      `[Officer] Authorized: ${junction.name} by ${officerId} (Trip: ${id})`
    );

    // Broadcast authorized event to driver room and global sockets
    try {
      const io = getIO();
      const payload = { tripId: id, junctionId, junction };
      io.to(id).emit("junction:authorized", payload);
      io.emit("junction:authorized", payload);
      io.to(id).emit("junction:status_update", payload);
      io.emit("junction:status_update", payload);
    } catch (e) {
      console.warn("[Socket] Broadcast error:", e);
    }

    return c.json({ trip: trip.toJSON(), junction }, 200);
  } catch (error) {
    console.error("[Trip] Authorize junction error:", error);
    return c.json({ error: "Failed to authorize junction." }, 500);
  }
}

// ──────────────────────────────────────────
// PATCH /api/trips/:id/junctions/:junctionId/clear
// ──────────────────────────────────────────
export async function clearJunction(c: Context) {
  try {
    const id = c.req.param("id");
    const junctionId = c.req.param("junctionId");
    if (!id || !junctionId) {
      return c.json({ error: "Trip ID and Junction ID are required." }, 400);
    }
    const body = await c.req.json().catch(() => ({}));
    const officerId = body.officerId || "OFF-HYD-042";

    const trip = await TripModel.findById(id);
    if (!trip) {
      return c.json({ error: "Trip not found." }, 404);
    }

    const junctionIndex = trip.junctions.findIndex((j) => j.id === junctionId);
    if (junctionIndex === -1) {
      return c.json({ error: "Junction not found in trip." }, 404);
    }

    const junction = trip.junctions[junctionIndex];
    junction.status = "cleared";
    junction.clearedAt = new Date().toISOString();
    if (officerId) junction.officerId = officerId;

    // Advance junction index if this was the current junction
    if (trip.currentJunctionIndex <= junctionIndex) {
      trip.currentJunctionIndex = junctionIndex + 1;
    }

    // Check if all junctions cleared
    let isCompleted = false;
    if (trip.currentJunctionIndex >= trip.junctions.length) {
      trip.status = "completed";
      trip.completedAt = new Date();
      isCompleted = true;
    }

    await trip.save();

    console.log(
      `[Officer] Cleared: ${junction.name} (Trip: ${id}, Completed: ${isCompleted})`
    );

    // Reuse existing junction:cleared event
    try {
      const io = getIO();
      const nextJunction = trip.junctions[trip.currentJunctionIndex];
      const clearedPayload = {
        tripId: id,
        junction,
        nextJunction: nextJunction ?? undefined,
      };

      io.to(id).emit("junction:cleared", clearedPayload);
      io.emit("junction:cleared", clearedPayload);

      if (isCompleted) {
        io.to(id).emit("trip:completed", { tripId: id });
        io.emit("trip:completed", { tripId: id });
      }
    } catch (e) {
      console.warn("[Socket] Broadcast error:", e);
    }

    return c.json({ trip: trip.toJSON(), junction, isCompleted }, 200);
  } catch (error) {
    console.error("[Trip] Clear junction error:", error);
    return c.json({ error: "Failed to clear junction." }, 500);
  }
}

// ──────────────────────────────────────────
// PATCH /api/trips/:id/junctions/:junctionId/traffic
// ──────────────────────────────────────────
export async function updateJunctionTraffic(c: Context) {
  try {
    const id = c.req.param("id");
    const junctionId = c.req.param("junctionId");
    if (!id || !junctionId) {
      return c.json({ error: "Trip ID and Junction ID are required." }, 400);
    }
    const { density } = await c.req.json<{ density: "clear" | "moderate" | "heavy" }>();

    const trip = await TripModel.findById(id);
    if (!trip) {
      return c.json({ error: "Trip not found." }, 404);
    }

    const junction = trip.junctions.find((j) => j.id === junctionId);
    if (!junction) {
      return c.json({ error: "Junction not found." }, 404);
    }

    junction.trafficDensity = density;
    await trip.save();

    try {
      const io = getIO();
      const payload = { tripId: id, junctionId, density };
      io.to(id).emit("traffic:updated", payload);
      io.emit("traffic:updated", payload);
    } catch (e) {
      console.warn("[Socket] Broadcast error:", e);
    }

    return c.json({ trip: trip.toJSON(), junction }, 200);
  } catch (error) {
    console.error("[Trip] Update traffic error:", error);
    return c.json({ error: "Failed to update traffic density." }, 500);
  }
}

// ──────────────────────────────────────────
// PATCH /api/trips/:id/complete
// ──────────────────────────────────────────
export async function completeTrip(c: Context) {
  try {
    const id = c.req.param("id");
    if (!id) {
      return c.json({ error: "Trip ID is required." }, 400);
    }
    const trip = await TripModel.findByIdAndUpdate(
      id,
      { status: "completed", completedAt: new Date() },
      { new: true }
    );

    if (!trip) {
      return c.json({ error: "Trip not found." }, 404);
    }

    try {
      const io = getIO();
      io.to(id).emit("trip:completed", { tripId: id });
      io.emit("trip:completed", { tripId: id });
    } catch (e) {
      console.warn("[Socket] Broadcast error:", e);
    }

    return c.json({ trip: trip.toJSON() }, 200);
  } catch (error) {
    console.error("[Trip] Complete error:", error);
    return c.json({ error: "Failed to complete trip." }, 500);
  }
}

// ──────────────────────────────────────────
// PATCH /api/trips/:id/cancel
// ──────────────────────────────────────────
export async function cancelTrip(c: Context) {
  try {
    const id = c.req.param("id");
    if (!id) {
      return c.json({ error: "Trip ID is required." }, 400);
    }
    const trip = await TripModel.findByIdAndUpdate(
      id,
      { status: "cancelled" },
      { new: true }
    );

    if (!trip) {
      return c.json({ error: "Trip not found." }, 404);
    }

    return c.json({ trip: trip.toJSON() }, 200);
  } catch (error) {
    console.error("[Trip] Cancel error:", error);
    return c.json({ error: "Failed to cancel trip." }, 500);
  }
}

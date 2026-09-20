import type { Context } from "hono";
import { RequestModel } from "../models/Request.js";
import { TripModel } from "../models/Trip.js";
import { getSeededJunctions } from "../utils/seededRoute.js";
import { getIO } from "../services/socketService.js";
import type {
  CreateRequestPayload,
  AcceptRequestPayload,
} from "../../../shared/types/index.js";

// ──────────────────────────────────────────
// POST /api/requests
// ──────────────────────────────────────────
export async function createRequest(c: Context) {
  try {
    const body = await c.req.json<CreateRequestPayload>();
    const { incidentLocation, hospital } = body;

    if (!incidentLocation || !hospital) {
      return c.json({ error: "incidentLocation and hospital are required." }, 400);
    }

    const newRequest = await RequestModel.create({
      incidentLocation,
      hospital: hospital.trim(),
      status: "pending",
    });

    console.log(`[Request] Created: ${newRequest._id} to ${hospital}`);

    // Broadcast to all drivers
    getIO().emit("request:new", { request: newRequest.toJSON() });

    return c.json({ request: newRequest.toJSON() }, 201);
  } catch (error) {
    console.error("[Request] Create error:", error);
    return c.json({ error: "Failed to create request." }, 500);
  }
}

// ──────────────────────────────────────────
// GET /api/requests?status=pending
// ──────────────────────────────────────────
export async function getRequests(c: Context) {
  try {
    const status = c.req.query("status") || "pending";
    const requests = await RequestModel.find({ status }).sort({ createdAt: -1 });
    return c.json({ requests: requests.map((r) => r.toJSON()) }, 200);
  } catch (error) {
    console.error("[Request] Get error:", error);
    return c.json({ error: "Failed to retrieve requests." }, 500);
  }
}

// ──────────────────────────────────────────
// POST /api/requests/:id/accept
// ──────────────────────────────────────────
export async function acceptRequest(c: Context) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json<AcceptRequestPayload>();
    const { driverName, vehicleId } = body;

    if (!driverName || !vehicleId) {
      return c.json({ error: "driverName and vehicleId are required." }, 400);
    }

    // Atomic findOneAndUpdate prevents race conditions
    const reqDoc = await RequestModel.findOneAndUpdate(
      { _id: id, status: "pending" },
      {
        status: "accepted",
        acceptedBy: { driverName, vehicleId },
        acceptedAt: new Date(),
      },
      { new: true }
    );

    if (!reqDoc) {
      return c.json({ error: "Request not found or already accepted." }, 409);
    }

    // Broadcast that this request is no longer available
    getIO().emit("request:taken", { requestId: reqDoc._id });

    // Reuse trip creation logic
    const junctions = getSeededJunctions();
    const junctionsWithIncoming = junctions.map((j) => ({
      ...j,
      status: "incoming" as const,
    }));

    const pickupString = reqDoc.incidentLocation.address
      ? reqDoc.incidentLocation.address
      : `${reqDoc.incidentLocation.lat.toFixed(5)}, ${reqDoc.incidentLocation.lng.toFixed(5)}`;

    const trip = await TripModel.create({
      driverName: driverName.trim(),
      vehicleId: vehicleId.trim(),
      pickup: pickupString,
      hospital: reqDoc.hospital,
      status: "en_route",
      junctions: junctionsWithIncoming,
      currentJunctionIndex: 0,
      startedAt: new Date(),
    });

    console.log(`[Request] ${id} accepted by ${driverName}. Created Trip: ${trip._id}`);

    const tripJSON = trip.toJSON();
    try {
      getIO().emit("emergency:new", { trip: tripJSON });
      getIO().emit("trip:incoming", { tripId: trip._id.toString(), junction: junctionsWithIncoming[0] });
    } catch (e) {
      console.warn("[Socket] Could not emit emergency:new", e);
    }

    return c.json({ trip: tripJSON }, 200);
  } catch (error) {
    console.error("[Request] Accept error:", error);
    return c.json({ error: "Failed to accept request." }, 500);
  }
}

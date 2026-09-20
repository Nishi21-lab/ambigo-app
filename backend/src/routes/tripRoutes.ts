import { Hono } from "hono";
import {
  createTrip,
  getTrips,
  getActiveTrips,
  getTrip,
  completeTrip,
  cancelTrip,
  authorizeJunction,
  clearJunction,
  updateJunctionTraffic,
} from "../controllers/tripController.js";

const router = new Hono();

router.post("/", createTrip);
router.get("/", getTrips);
router.get("/active", getActiveTrips);
router.get("/:id", getTrip);
router.patch("/:id/complete", completeTrip);
router.patch("/:id/cancel", cancelTrip);
router.patch("/:id/junctions/:junctionId/authorize", authorizeJunction);
router.patch("/:id/junctions/:junctionId/clear", clearJunction);
router.patch("/:id/junctions/:junctionId/traffic", updateJunctionTraffic);

export default router;

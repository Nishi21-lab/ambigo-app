import { Hono } from "hono";
import {
  getInventory,
  getCrew,
  updateInventory,
} from "../controllers/vehicleController.js";

const router = new Hono();

router.get("/:vehicleId/inventory", getInventory);
router.patch("/:vehicleId/inventory", updateInventory);
router.get("/:vehicleId/crew", getCrew);

export default router;

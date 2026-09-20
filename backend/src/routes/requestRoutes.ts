import { Hono } from "hono";
import {
  createRequest,
  getRequests,
  acceptRequest,
} from "../controllers/requestController.js";

const requestRouter = new Hono();

requestRouter.post("/", createRequest);
requestRouter.get("/", getRequests);
requestRouter.post("/:id/accept", acceptRequest);

export { requestRouter };

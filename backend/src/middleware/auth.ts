import { Context, Next } from "hono";
import jwt from "jsonwebtoken";
import { DriverModel } from "../models/Driver.js";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized. Missing Bearer token." }, 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { driverId: string };
    const driver = await DriverModel.findById(decoded.driverId);

    if (!driver) {
      return c.json({ error: "Unauthorized. Driver not found." }, 401);
    }

    // Attach driver to the request context
    c.set("driver", driver);
    await next();
  } catch (err) {
    return c.json({ error: "Unauthorized. Invalid token." }, 401);
  }
};

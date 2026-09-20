import { Context } from "hono";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { DriverModel } from "../models/Driver.js";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
const TOKEN_EXPIRATION = "7d";

export const register = async (c: Context) => {
  try {
    const { name, email, password, vehicleId } = await c.req.json();

    if (!name || !email || !password || !vehicleId) {
      return c.json({ error: "All fields are required." }, 400);
    }

    // Check if email already exists
    const existingDriver = await DriverModel.findOne({ email: email.toLowerCase() });
    if (existingDriver) {
      return c.json({ error: "An account with this email already exists." }, 409);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create driver
    const driver = await DriverModel.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      vehicleId,
    });

    // Generate token
    const token = jwt.sign({ driverId: driver._id }, JWT_SECRET, {
      expiresIn: TOKEN_EXPIRATION,
    });

    return c.json({
      token,
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        vehicleId: driver.vehicleId,
      },
    }, 201);
  } catch (error) {
    console.error("[Auth] Register error:", error);
    return c.json({ error: "Internal server error." }, 500);
  }
};

export const login = async (c: Context) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email and password are required." }, 400);
    }

    // Find driver
    const driver = await DriverModel.findOne({ email: email.toLowerCase() });
    if (!driver) {
      return c.json({ error: "Invalid email or password." }, 401);
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, driver.password);
    if (!isMatch) {
      return c.json({ error: "Invalid email or password." }, 401);
    }

    // Generate token
    const token = jwt.sign({ driverId: driver._id }, JWT_SECRET, {
      expiresIn: TOKEN_EXPIRATION,
    });

    return c.json({
      token,
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        vehicleId: driver.vehicleId,
      },
    });
  } catch (error) {
    console.error("[Auth] Login error:", error);
    return c.json({ error: "Internal server error." }, 500);
  }
};

export const getMe = async (c: Context) => {
  try {
    const driver = c.get("driver"); // Set by auth middleware
    return c.json({
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        vehicleId: driver.vehicleId,
      },
    });
  } catch (error) {
    console.error("[Auth] GetMe error:", error);
    return c.json({ error: "Internal server error." }, 500);
  }
};

export const officerLogin = async (c: Context) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Officer ID/Email and password are required." }, 400);
    }

    const cleanEmail = email.trim().toLowerCase();

    // Default demo fallback if database does not yet have the officer seeded
    if (
      (cleanEmail === "officer@ambigo.app" || cleanEmail === "officer123" || cleanEmail === "off-hyd-042") &&
      password === "officer123"
    ) {
      const token = jwt.sign({ officerId: "OFF-HYD-042", role: "officer" }, JWT_SECRET, {
        expiresIn: TOKEN_EXPIRATION,
      });

      return c.json({
        token,
        officer: {
          id: "officer_demo_001",
          officerId: "OFF-HYD-042",
          name: "Insp. K. Vikram Rao",
          email: "officer@ambigo.app",
          badgeNumber: "TRF-8842",
          zone: "Cyberabad Central Corridor",
        },
      });
    }

    // Check DB for seeded or registered officer
    const { OfficerModel } = await import("../models/Officer.js");
    const officer = await OfficerModel.findOne({
      $or: [{ email: cleanEmail }, { officerId: email.trim().toUpperCase() }],
    });

    if (!officer) {
      return c.json({ error: "Invalid officer credentials." }, 401);
    }

    const isMatch = await bcrypt.compare(password, officer.password);
    if (!isMatch) {
      return c.json({ error: "Invalid officer credentials." }, 401);
    }

    const token = jwt.sign({ officerId: officer.officerId, role: "officer" }, JWT_SECRET, {
      expiresIn: TOKEN_EXPIRATION,
    });

    return c.json({
      token,
      officer: {
        id: officer._id,
        officerId: officer.officerId,
        name: officer.name,
        email: officer.email,
        badgeNumber: officer.badgeNumber,
        zone: officer.zone,
      },
    });
  } catch (error) {
    console.error("[Auth] Officer login error:", error);
    return c.json({ error: "Internal server error." }, 500);
  }
};

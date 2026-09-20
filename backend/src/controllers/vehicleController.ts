import { Context } from "hono";
import { InventoryModel } from "../models/Inventory.js";
import { CrewModel } from "../models/Crew.js";
import type { UpdateInventoryPayload } from "../../../shared/types/index.js";

// GET /api/vehicles/:vehicleId/inventory
export const getInventory = async (c: Context) => {
  const vehicleId = c.req.param("vehicleId");

  try {
    const inventory = await InventoryModel.findOne({ vehicleId }).lean();
    if (!inventory) {
      return c.json({ error: "Inventory not found" }, 404);
    }
    return c.json({ inventory }, 200);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
};

// GET /api/vehicles/:vehicleId/crew
export const getCrew = async (c: Context) => {
  const vehicleId = c.req.param("vehicleId");

  try {
    const crew = await CrewModel.findOne({ vehicleId }).lean();
    if (!crew) {
      return c.json({ error: "Crew not found" }, 404);
    }
    return c.json({ crew }, 200);
  } catch (error) {
    console.error("Error fetching crew:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
};

// PATCH /api/vehicles/:vehicleId/inventory
export const updateInventory = async (c: Context) => {
  const vehicleId = c.req.param("vehicleId");

  try {
    const payload = await c.req.json<UpdateInventoryPayload>();
    
    // We need to update specific items within the array.
    // For simplicity in a real app, this might be a complex bulkWrite, 
    // but here we can just fetch, update, and save.
    const inventory = await InventoryModel.findOne({ vehicleId });
    
    if (!inventory) {
      return c.json({ error: "Inventory not found" }, 404);
    }

    for (const updateItem of payload.items) {
      const existingItem = inventory.items.find((i) => i.name === updateItem.name);
      if (existingItem) {
        existingItem.quantity = updateItem.quantity;
      }
    }

    await inventory.save();
    return c.json({ inventory }, 200);
  } catch (error) {
    console.error("Error updating inventory:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
};

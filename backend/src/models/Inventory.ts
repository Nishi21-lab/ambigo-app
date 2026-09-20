import mongoose, { Document, Schema } from "mongoose";
import { nanoid } from "nanoid";

export interface InventoryDocument extends Document<string> {
  _id: string;
  vehicleId: string;
  items: {
    name: string;
    quantity: number;
    unit: string;
    lowStockThreshold: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const inventorySchema = new Schema<InventoryDocument>(
  {
    _id: { type: String, default: () => nanoid() },
    vehicleId: { type: String, required: true, unique: true, index: true },
    items: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 0 },
        unit: { type: String, required: true },
        lowStockThreshold: { type: Number, required: true, min: 0 },
      },
    ],
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

export const InventoryModel = mongoose.model<InventoryDocument>(
  "Inventory",
  inventorySchema
);

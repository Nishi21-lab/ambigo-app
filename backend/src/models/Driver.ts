import mongoose from "mongoose";
import { nanoid } from "nanoid";

const driverSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => nanoid(10),
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    vehicleId: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const DriverModel = mongoose.model("Driver", driverSchema);

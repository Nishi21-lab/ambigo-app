import mongoose, { Schema, type Document } from "mongoose";
import { nanoid } from "nanoid";
import type { RequestStatus } from "../../../shared/types/index.js";

export interface RequestDocument extends Document<string> {
  _id: string; // nanoid
  incidentLocation: {
    lat: number;
    lng: number;
    address?: string;
  };
  hospital: string;
  status: RequestStatus;
  createdAt: Date;
  acceptedBy?: {
    driverName: string;
    vehicleId: string;
  };
  acceptedAt?: Date;
}

const requestSchema = new Schema<RequestDocument>(
  {
    _id: { type: String, default: () => nanoid(10) },
    incidentLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String },
    },
    hospital: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "cancelled"],
      default: "pending",
    },
    acceptedBy: {
      driverName: { type: String },
      vehicleId: { type: String },
    },
    acceptedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const RequestModel = mongoose.model<RequestDocument>("Request", requestSchema);

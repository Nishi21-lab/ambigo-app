import mongoose, { Schema, type Document } from "mongoose";
import type {
  Junction,
  JunctionStatus,
  TripStatus,
  Coordinates,
} from "../../../shared/types/index.js";

// ──────────────────────────────────────────
// Junction Sub-document
// ──────────────────────────────────────────
const coordinatesSchema = new Schema<Coordinates>(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const junctionSchema = new Schema<Junction>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    location: { type: coordinatesSchema, required: true },
    status: {
      type: String,
      enum: ["pending", "incoming", "sirened", "authorized", "cleared"],
      default: "pending",
    },
    officerId: { type: String },
    trafficDensity: {
      type: String,
      enum: ["clear", "moderate", "heavy"],
      default: "moderate",
    },
    authorizedAt: { type: String },
    clearedAt: { type: String },
  },
  { _id: false }
);

// ──────────────────────────────────────────
// Trip Document
// ──────────────────────────────────────────
export interface TripDocument extends Document {
  driverName: string;
  vehicleId: string;
  pickup: string;
  hospital: string;
  status: TripStatus;
  junctions: Junction[];
  currentJunctionIndex: number;
  lastKnownLocation?: Coordinates;
  startedAt: Date;
  completedAt?: Date;
}

const tripSchema = new Schema<TripDocument>(
  {
    driverName: { type: String, required: true, trim: true },
    vehicleId: { type: String, required: true, trim: true },
    pickup: { type: String, required: true, trim: true },
    hospital: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["en_route", "completed", "cancelled"],
      default: "en_route",
    },
    junctions: { type: [junctionSchema], default: [] },
    currentJunctionIndex: { type: Number, default: 0 },
    lastKnownLocation: { type: coordinatesSchema },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const TripModel = mongoose.model<TripDocument>("Trip", tripSchema);

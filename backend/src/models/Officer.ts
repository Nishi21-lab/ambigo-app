import mongoose, { Schema, type Document } from "mongoose";

export interface OfficerDocument extends Document {
  officerId: string;
  name: string;
  email: string;
  password: string;
  badgeNumber: string;
  zone: string;
  status: "on_duty" | "off_duty";
}

const officerSchema = new Schema<OfficerDocument>(
  {
    officerId: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    badgeNumber: { type: String, required: true, trim: true },
    zone: { type: String, default: "Cyberabad Central Corridor" },
    status: { type: String, enum: ["on_duty", "off_duty"], default: "on_duty" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const OfficerModel = mongoose.model<OfficerDocument>("Officer", officerSchema);

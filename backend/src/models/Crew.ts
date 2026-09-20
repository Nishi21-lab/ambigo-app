import mongoose, { Document, Schema } from "mongoose";
import { nanoid } from "nanoid";

export interface CrewDocument extends Document<string> {
  _id: string;
  vehicleId: string;
  members: {
    name: string;
    role: string;
    phone?: string;
  }[];
  shiftStart?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const crewSchema = new Schema<CrewDocument>(
  {
    _id: { type: String, default: () => nanoid() },
    vehicleId: { type: String, required: true, unique: true, index: true },
    members: [
      {
        name: { type: String, required: true },
        role: { type: String, required: true },
        phone: { type: String, required: false },
        experience: { type: String },
        certifications: { type: [String], default: [] },
        skills: { type: [String], default: [] },
      },
    ],
    shiftStart: { type: Date, required: false },
  },
  {
    timestamps: true,
  }
);

export const CrewModel = mongoose.model<CrewDocument>("Crew", crewSchema);

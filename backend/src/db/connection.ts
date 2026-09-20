import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ambigo_driver";

export async function connectToDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`[DB] Connected to MongoDB: ${MONGODB_URI}`);
  } catch (error) {
    console.error("[DB] Connection failed:", error);
    process.exit(1);
  }
}

mongoose.connection.on("disconnected", () => {
  console.warn("[DB] MongoDB disconnected. Attempting to reconnect...");
});

mongoose.connection.on("error", (err) => {
  console.error("[DB] MongoDB error:", err);
});

import "dotenv/config";
import { connectToDatabase } from "../src/db/connection.js";
import { InventoryModel } from "../src/models/Inventory.js";
import { CrewModel } from "../src/models/Crew.js";
import { DriverModel } from "../src/models/Driver.js";
import { OfficerModel } from "../src/models/Officer.js";
import { RequestModel } from "../src/models/Request.js";
import { TripModel } from "../src/models/Trip.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

async function seed() {
  await connectToDatabase();

  const defaultVehicleId = "UNIT-1";

  console.log(`Seeding data for vehicle: ${defaultVehicleId}`);

  // 0. Seed Driver
  const seedPassword = process.env.DEFAULT_DRIVER_PASSWORD || "SecureTempPwd!123";
  await DriverModel.deleteMany({ email: "driver@ambigo.com" });
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(seedPassword, salt);
  await DriverModel.create({
    name: "Raj Mehta",
    email: "driver@ambigo.com",
    password: hashedPassword,
    vehicleId: defaultVehicleId,
  });
  console.log(`✅ Driver seeded (Email: driver@ambigo.com, Password: ${seedPassword})`);

  // 0b. Seed Traffic Officer
  await OfficerModel.deleteMany({ email: "officer@ambigo.app" });
  const officerHashedPassword = await bcrypt.hash("officer123", salt);
  await OfficerModel.create({
    officerId: "OFF-HYD-042",
    name: "Insp. K. Vikram Rao",
    email: "officer@ambigo.app",
    password: officerHashedPassword,
    badgeNumber: "TRF-8842",
    zone: "Cyberabad Central Corridor",
    status: "on_duty",
  });
  console.log(`✅ Officer seeded (Email: officer@ambigo.app, Password: officer123, ID: OFF-HYD-042)`);

  // 1. Seed Inventory
  await InventoryModel.deleteMany({ vehicleId: defaultVehicleId });
  await InventoryModel.create({
    vehicleId: defaultVehicleId,
    items: [
      { name: "Oxygen Cylinders", quantity: 2, unit: "units", lowStockThreshold: 1 },
      { name: "Bandages", quantity: 50, unit: "boxes", lowStockThreshold: 20 },
      { name: "Saline IV", quantity: 5, unit: "L", lowStockThreshold: 10 },
      { name: "Epinephrine Auto-Injectors", quantity: 4, unit: "units", lowStockThreshold: 2 },
      { name: "Defibrillator Pads", quantity: 2, unit: "pairs", lowStockThreshold: 2 },
    ],
  });
  console.log("✅ Inventory seeded");

  // 2. Seed Crew
  await CrewModel.deleteMany({ vehicleId: defaultVehicleId });
  await CrewModel.create({
    vehicleId: defaultVehicleId,
    shiftStart: new Date(),
    members: [
      {
        name: "Rajesh Kumar",
        role: "Paramedic",
        phone: "+91 98765 43210",
        experience: "8 years in Emergency Response & Critical Care. Formerly at AIIMS Trauma Center.",
        certifications: ["Advanced Cardiovascular Life Support (ACLS)", "Prehospital Trauma Life Support (PHTLS)"],
        skills: ["Intravenous Therapy", "Advanced Airway Management", "Triage"]
      },
      {
        name: "Amit Singh",
        role: "Driver",
        phone: "+91 87654 32109",
        experience: "12 years specialized EVDO (Emergency Vehicle Driving Operations). 0 accidents on record.",
        certifications: ["Defensive Driving Course (DDC)", "Basic Life Support (BLS)"],
        skills: ["Evasive Maneuvering", "Route Optimization", "Vehicle Maintenance"]
      },
      {
        name: "Priya Sharma",
        role: "EMT",
        phone: "+91 76543 21098",
        experience: "4 years as an Emergency Medical Technician. Specialist in pediatric and maternal emergency care.",
        certifications: ["Emergency Medical Technician - Basic (EMT-B)", "CPR & AED Certified"],
        skills: ["Patient Assessment", "Wound Care", "Oxygen Administration"]
      },
    ],
  });
  console.log("✅ Crew seeded");

  // 3. Seed Requests (50 dummy requests in Hyderabad)
  await RequestModel.deleteMany({});
  
  const hyderabadHospitals = [
    "Apollo Hospitals, Jubilee Hills",
    "KIMS Hospital, Secunderabad",
    "Yashoda Hospitals, Somajiguda",
    "CARE Hospitals, Banjara Hills",
    "AIG Hospitals, Gachibowli",
    "Medicover Hospitals, Hitec City",
    "Osmania General Hospital",
    "Gandhi Hospital",
    "Continental Hospitals, Nanakramguda",
    "Aster Prime Hospital, Ameerpet"
  ];

  const hyderabadAreas = [
    "Banjara Hills", "Jubilee Hills", "Madhapur", "Gachibowli", 
    "Kukatpally", "Secunderabad", "Begumpet", "Ameerpet", 
    "Kondapur", "Hitec City", "Tolichowki", "Mehdipatnam",
    "Charminar", "L.B. Nagar", "Dilsukhnagar"
  ];

  const dummyRequests = Array.from({ length: 50 }).map(() => {
    // Generate random coordinates within Hyderabad bounds
    // Lat: 17.35 to 17.50, Lng: 78.35 to 78.55
    const lat = 17.35 + Math.random() * 0.15;
    const lng = 78.35 + Math.random() * 0.20;
    
    const randomHospital = hyderabadHospitals[Math.floor(Math.random() * hyderabadHospitals.length)];
    const randomArea = hyderabadAreas[Math.floor(Math.random() * hyderabadAreas.length)];
    
    // Randomize creation time between now and 2 hours ago
    const randomMinutesAgo = Math.floor(Math.random() * 120);
    const createdAt = new Date(Date.now() - randomMinutesAgo * 60000);

    return {
      incidentLocation: { 
        lat, 
        lng, 
        address: `${randomArea}, Hyderabad` 
      },
      hospital: randomHospital,
      status: "pending",
      createdAt
    };
  });
  
  await RequestModel.create(dummyRequests);
  console.log(`✅ 50 Pending Requests seeded for Hyderabad`);

  // 4. Seed Trips
  await TripModel.deleteMany({});
  await TripModel.create({
    driverName: "Raj Mehta",
    vehicleId: defaultVehicleId,
    pickup: "Madhapur, Hyderabad",
    hospital: "AIG Hospitals, Gachibowli",
    status: "completed",
    startedAt: new Date(Date.now() - 3600000), // 1 hour ago
    completedAt: new Date(Date.now() - 1800000), // 30 mins ago
    junctions: [
      { id: "J1", name: "Jubilee Hills Checkpost", location: { lat: 17.4264, lng: 78.4140 }, status: "cleared" },
      { id: "J2", name: "Madhapur Junction", location: { lat: 17.4497, lng: 78.3812 }, status: "cleared" }
    ],
    currentJunctionIndex: 2
  });
  console.log("✅ Completed Trip seeded for Hyderabad");

  await mongoose.disconnect();
  console.log("✅ Seeding complete. Disconnected from database.");
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});

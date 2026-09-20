import { io } from "socket.io-client";

const BASE_URL = "http://localhost:3001";
const SOCKET_URL = "http://localhost:3001";

async function runE2ETest() {
  console.log("=================================================");
  console.log("🚦 STARTING AMBIGO END-TO-END ACCEPTANCE TEST 🚦");
  console.log("=================================================\n");

  // ── Step 1: Officer Login ────────────────────────────────────
  console.log("Step 1: Officer authenticating...");
  const authRes = await fetch(`${BASE_URL}/api/auth/officer/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "officer@ambigo.app", password: "officer123" }),
  });

  if (!authRes.ok) {
    throw new Error(`Officer login failed: ${authRes.statusText}`);
  }

  const authData = await authRes.json();
  console.log(`✅ Officer Authenticated: ${authData.officer.name} (${authData.officer.officerId})`);
  const officerToken = authData.token;

  // ── Step 2: Officer Connects to Socket.IO ────────────────────
  console.log("\nStep 2: Officer connecting to Socket.IO Command Channel...");
  const officerSocket = io(SOCKET_URL, {
    transports: ["websocket"],
  });

  await new Promise((resolve) => officerSocket.on("connect", resolve));
  console.log(`✅ Officer Socket connected (${officerSocket.id})`);
  officerSocket.emit("officer:join");

  let receivedEmergencyPromise = new Promise((resolve) => {
    officerSocket.on("emergency:new", (payload) => {
      console.log(`🚨 OFFICER RECEIVED REAL-TIME ALERT: Emergency from ${payload.trip.driverName}!`);
      resolve(payload.trip);
    });
  });

  // ── Step 3: Driver Starts Emergency Trip ─────────────────────
  console.log("\nStep 3: Driver starts an emergency trip via REST API...");
  const tripRes = await fetch(`${BASE_URL}/api/trips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      driverName: "Raj Mehta",
      vehicleId: "AMB-UNIT-1",
      pickup: "Civil Hospital Chowk, Hyderabad",
      hospital: "VS General Hospital",
    }),
  });

  if (!tripRes.ok) {
    throw new Error(`Trip creation failed: ${tripRes.statusText}`);
  }

  const { trip } = await tripRes.json();
  const tripId = trip._id;
  console.log(`✅ Trip Created: ${tripId} | Ambulance: ${trip.vehicleId} | Junctions: ${trip.junctions.length}`);

  // ── Step 4: Verify Officer Received Real-Time Alert ──────────
  console.log("\nStep 4: Verifying Officer received real-time emergency alert...");
  const receivedTrip = await receivedEmergencyPromise;
  if (receivedTrip._id !== tripId) {
    throw new Error("Trip ID mismatch in emergency alert!");
  }
  console.log(`✅ Confirmed: Officer received emergency alert for Trip ${tripId}`);

  // Officer joins the trip room for live tracking
  officerSocket.emit("driver:join_trip", { tripId });

  // ── Step 5: Driver Connects Socket & Sends Location Updates ──
  console.log("\nStep 5: Driver connects to Socket.IO and begins driving...");
  const driverSocket = io(SOCKET_URL, {
    transports: ["websocket"],
  });

  await new Promise((resolve) => driverSocket.on("connect", resolve));
  driverSocket.emit("driver:join_trip", { tripId });

  // Wait for officer to receive location update
  let locationPromise = new Promise((resolve) => {
    officerSocket.on("location:update", (data) => {
      console.log(`📍 OFFICER MAP UPDATED: Live ambulance at ${data.location.lat}, ${data.location.lng}`);
      resolve(data);
    });
  });

  // Driver sends initial location
  const junc1 = trip.junctions[0];
  driverSocket.emit("driver:location_update", {
    tripId,
    location: { lat: junc1.location.lat - 0.002, lng: junc1.location.lng - 0.002 },
  });

  await locationPromise;
  console.log("✅ Live ambulance location synchronized between Driver and Officer!");

  // ── Step 6: Ambulance Approaches Junction 1 (Triggers Siren/Alert) ─
  console.log("\nStep 6: Ambulance approaches Junction 1 (within 200m)...");
  let sirenPromise = new Promise((resolve) => {
    officerSocket.on("trip:siren", (data) => {
      console.log(`🚨 OFFICER JUNCTION ALERT: Junction 1 (${data.junction.name}) status -> ALERTED!`);
      resolve(data);
    });
  });

  driverSocket.emit("driver:location_update", {
    tripId,
    location: { lat: junc1.location.lat - 0.001, lng: junc1.location.lng - 0.001 },
  });

  await sirenPromise;
  console.log("✅ Junction 1 successfully alerted via proximity siren!");

  // ── Step 7: Officer Authorizes Passage ─────────────────────────
  console.log("\nStep 7: Officer clicks [ AUTHORIZE PASSAGE ] for Junction 1...");
  let driverAuthPromise = new Promise((resolve) => {
    driverSocket.on("junction:authorized", (data) => {
      console.log(`🛡️ DRIVER RECEIVED AUTHORIZATION: Junction 1 (${data.junction.name}) is AUTHORIZED!`);
      resolve(data);
    });
  });

  const authJuncRes = await fetch(`${BASE_URL}/api/trips/${tripId}/junctions/${junc1.id}/authorize`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${officerToken}`,
    },
    body: JSON.stringify({ officerId: authData.officer.officerId }),
  });

  if (!authJuncRes.ok) {
    throw new Error(`Authorize junction failed: ${authJuncRes.statusText}`);
  }

  await driverAuthPromise;
  console.log("✅ Officer authorization reached Driver in real time!");

  // ── Step 8: Ambulance Passes Junction 1 (<50m) ───────────────
  console.log("\nStep 8: Ambulance passes through Junction 1 (<30m)...");
  let clearedPromise = new Promise((resolve) => {
    officerSocket.on("junction:cleared", (data) => {
      console.log(`🏁 JUNCTION CLEARED: ${data.junction.name} status -> CLEARED!`);
      if (data.nextJunction) {
        console.log(`➡️ Next active target is now: ${data.nextJunction.name}`);
      }
      resolve(data);
    });
  });

  driverSocket.emit("driver:location_update", {
    tripId,
    location: { lat: junc1.location.lat, lng: junc1.location.lng },
  });

  await clearedPromise;
  console.log("✅ Junction 1 successfully cleared!");

  // ── Step 9: Complete remaining junctions & Trip ───────────────
  console.log("\nStep 9: Clearing remaining junctions to reach hospital...");
  let tripCompletePromise = new Promise((resolve) => {
    officerSocket.on("trip:completed", (data) => {
      console.log(`🏥 TRIP COMPLETED: Ambulance arrived safely at hospital!`);
      resolve(data);
    });
  });

  for (let i = 1; i < trip.junctions.length; i++) {
    const j = trip.junctions[i];
    await fetch(`${BASE_URL}/api/trips/${tripId}/junctions/${j.id}/clear`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${officerToken}`,
      },
      body: JSON.stringify({ officerId: authData.officer.officerId }),
    });
  }

  await tripCompletePromise;
  console.log("✅ Trip marked completed across all channels!");

  // ── Step 10: Verify Officer History ───────────────────────────
  console.log("\nStep 10: Checking Officer History records...");
  const historyRes = await fetch(`${BASE_URL}/api/trips?status=completed`);
  const historyData = await historyRes.json();
  const foundInHistory = historyData.trips.some((t) => t._id === tripId);

  if (!foundInHistory) {
    throw new Error("Completed trip was not found in officer history!");
  }

  console.log(`✅ Confirmed: Trip ${tripId} is properly recorded in Officer History (${historyData.trips.length} completed trips archived).`);

  // Cleanup
  driverSocket.disconnect();
  officerSocket.disconnect();

  console.log("\n=================================================");
  console.log("🎉 ALL 10 END-TO-END ACCEPTANCE TESTS PASSED! 🎉");
  console.log("=================================================");
}

runE2ETest().catch((err) => {
  console.error("\n❌ E2E TEST FAILED:", err);
  process.exit(1);
});

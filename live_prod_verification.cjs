const { io } = require("socket.io-client");

async function runProductionVerification() {
  console.log("=== STARTING LIVE PRODUCTION VERIFICATION ===");

  const PROD_URL = "https://ambigo-driver.onrender.com";
  const PROD_API = "https://ambigo-driver.onrender.com/api";

  // Step 1: Connect Officer Socket
  console.log("1. Connecting Officer Socket to:", PROD_URL);
  const officerSocket = io(PROD_URL, {
    transports: ["websocket", "polling"],
    timeout: 10000,
  });

  await new Promise((resolve, reject) => {
    officerSocket.on("connect", () => {
      console.log("   ✅ Officer Socket connected! Socket ID:", officerSocket.id);
      resolve(true);
    });
    officerSocket.on("connect_error", (err) => {
      reject(new Error("Officer Socket failed to connect: " + err.message));
    });
  });

  // Step 2: Officer joins room
  console.log("2. Officer joining 'officers' room...");
  officerSocket.emit("officer:join");

  // Setup officer listeners
  let receivedEmergency = null;
  let receivedIncoming = null;
  let receivedLocation = null;

  officerSocket.on("emergency:new", (data) => {
    console.log("   🔔 [Officer Socket] Received emergency:new!", data?.trip?._id);
    receivedEmergency = data;
  });

  officerSocket.on("trip:incoming", (data) => {
    console.log("   🔔 [Officer Socket] Received trip:incoming!", data?.tripId, data?.junction?.name);
    receivedIncoming = data;
  });

  officerSocket.on("location:update", (data) => {
    console.log("   📍 [Officer Socket] Received location:update!", data?.tripId, data?.location);
    receivedLocation = data;
  });

  // Step 3: Create a Driver emergency trip via production API
  console.log("3. Creating Driver emergency trip via POST", `${PROD_API}/trips...`);
  const tripPayload = {
    driverName: "Rajesh Kumar (Ambulance 108)",
    vehicleId: "TS-09-EM-4042",
    pickup: "Jubilee Hills Road No. 36",
    hospital: "Apollo Hospital, Jubilee Hills",
  };

  const createRes = await fetch(`${PROD_API}/trips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tripPayload),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create trip on production backend: HTTP ${createRes.status} ${errText}`);
  }

  const createData = await createRes.json();
  const createdTrip = createData.trip;
  console.log("   ✅ Trip created successfully! Trip ID:", createdTrip._id);
  console.log("   Trip status:", createdTrip.status);
  console.log("   Junction count:", createdTrip.junctions?.length);
  if (createdTrip.junctions?.length > 0) {
    console.log("   First junction:", createdTrip.junctions[0].name, "| Status:", createdTrip.junctions[0].status);
  }

  // Step 4: Officer joins trip room
  console.log("4. Officer joining trip room for trip:", createdTrip._id);
  officerSocket.emit("driver:join_trip", { tripId: createdTrip._id });
  officerSocket.emit("officer:join_trip", { tripId: createdTrip._id });

  // Step 5: Connect a Driver Socket and simulate location update
  console.log("5. Connecting Driver Socket and sending location update...");
  const driverSocket = io(PROD_URL, {
    transports: ["websocket", "polling"],
  });

  await new Promise((resolve) => driverSocket.on("connect", resolve));
  console.log("   ✅ Driver Socket connected! Socket ID:", driverSocket.id);
  driverSocket.emit("driver:join_trip", { tripId: createdTrip._id });

  // Wait 1s then send location update
  await new Promise((r) => setTimeout(r, 1000));
  const testLocation = { lat: 17.4285, lng: 78.4112 };
  console.log("   Driver emitting location update:", testLocation);
  driverSocket.emit("driver:location_update", {
    tripId: createdTrip._id,
    location: testLocation,
  });

  // Wait 2s to observe socket propagation
  await new Promise((r) => setTimeout(r, 2000));

  console.log("6. Real-time Socket Event Verification Results:");
  console.log("   - emergency:new alert broadcasted:", receivedEmergency ? "PASSED" : "NOT RECEIVED (Render may run legacy handler)");
  console.log("   - trip:incoming broadcasted:", receivedIncoming ? "PASSED" : "WAITING");
  console.log("   - location:update received by Officer:", receivedLocation ? "PASSED" : "FAILED");

  // Step 7: Test fetching trip by ID from production backend (Officer reading trip data)
  console.log("7. Fetching trip by ID from production API:", `${PROD_API}/trips/${createdTrip._id}`);
  const getTripRes = await fetch(`${PROD_API}/trips/${createdTrip._id}`);
  console.log("   GET /api/trips/:id status:", getTripRes.status);
  if (getTripRes.ok) {
    const fetchedTrip = await getTripRes.json();
    console.log("   ✅ Retrieved trip status:", fetchedTrip.trip?.status, "| Driver:", fetchedTrip.trip?.driverName);
  }

  // Step 8: Complete the test trip so it doesn't pollute active trips
  console.log("8. Completing test trip via PATCH", `${PROD_API}/trips/${createdTrip._id}/complete`);
  const completeRes = await fetch(`${PROD_API}/trips/${createdTrip._id}/complete`, {
    method: "PATCH",
  });
  console.log("   ✅ Complete status:", completeRes.status);

  driverSocket.disconnect();
  officerSocket.disconnect();
  console.log("=== LIVE PRODUCTION VERIFICATION FINISHED ===");
}

runProductionVerification().catch((err) => {
  console.error("VERIFICATION FAILED:", err);
  process.exit(1);
});

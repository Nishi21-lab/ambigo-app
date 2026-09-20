import { io } from "socket.io-client";

const BASE_URL = "https://ambigo-driver.onrender.com";
const SOCKET_URL = "https://ambigo-driver.onrender.com";

async function testProductionBackend() {
  console.log("=================================================");
  console.log("🌐 TESTING PRODUCTION RENDER BACKEND & SOCKETS 🌐");
  console.log("=================================================\n");

  console.log("Connecting to production Socket.IO server at:", SOCKET_URL);
  const officerSocket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    timeout: 10000,
  });

  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Socket connection timeout")), 12000);
    officerSocket.on("connect", () => {
      clearTimeout(t);
      resolve(true);
    });
    officerSocket.on("connect_error", (e) => {
      clearTimeout(t);
      reject(e);
    });
  });

  console.log(`✅ Connected to Production Socket.IO (${officerSocket.id})`);

  // Create a trip on production backend
  console.log("Creating emergency trip on production backend...");
  const res = await fetch(`${BASE_URL}/api/trips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      driverName: "Production Test Driver",
      vehicleId: "AMB-RENDER-01",
      pickup: "Banjara Hills, Hyderabad",
      hospital: "Care Hospital",
    }),
  });

  if (!res.ok) {
    throw new Error(`Production trip creation failed: ${res.statusText}`);
  }

  const { trip } = await res.json();
  const tripId = trip._id;
  console.log(`✅ Production Trip Created: ${tripId} | Junctions: ${trip.junctions.length}`);

  // Officer joins trip room
  officerSocket.emit("driver:join_trip", { tripId });

  // Driver socket connects and joins
  const driverSocket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
  });
  await new Promise((resolve) => driverSocket.on("connect", resolve));
  driverSocket.emit("driver:join_trip", { tripId });

  let locationReceived = new Promise((resolve) => {
    officerSocket.on("location:update", (d) => {
      console.log(`📍 Production Location Update Received by Officer: ${d.location.lat}, ${d.location.lng}`);
      resolve(d);
    });
  });

  // Emit location update from driver
  driverSocket.emit("driver:location_update", {
    tripId,
    location: { lat: 23.0225, lng: 72.5714 },
  });

  await locationReceived;
  console.log("✅ Production Driver ↔ Officer real-time location streaming VERIFIED!");

  driverSocket.disconnect();
  officerSocket.disconnect();

  console.log("\n=================================================");
  console.log("🎉 PRODUCTION BACKEND TEST FULLY PASSED! 🎉");
  console.log("=================================================");
}

testProductionBackend().catch((err) => {
  console.error("Production test error:", err);
});

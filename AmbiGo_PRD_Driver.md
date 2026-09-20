# Product Requirements Document: AmbiGo — Driver App

**Version:** Draft v1.0 (derived from MVP v2 codebase, MongoDB-backed)
**Status:** Working draft — for review
**Scope:** `/driver` — the ambulance driver–facing side of AmbiGo only. See the companion **AmbiGo — Officer App PRD** for the other side of the loop.
**Date:** September 17, 2026

---

## 1. Overview

The Driver app is the ambulance-side interface of AmbiGo. Its entire job is to take almost no time and attention to operate — an ambulance driver has exactly zero spare focus for a complicated form — while quietly doing the real work in the background: broadcasting the vehicle's live position so every officer downstream can be alerted before the ambulance arrives.

**One-line pitch:** Open the app, say where you're going, and drive — AmbiGo handles telling traffic control the rest.

## 2. Problem Statement

Ambulance drivers currently have no way to signal ahead that they're approaching a junction, beyond sirens and horns that only work at close range and in heavy traffic often aren't heard or heeded in time. Any tool built for this moment has to assume the driver is under stress, possibly one-handed, and cannot tolerate friction — multi-step logins, complex forms, or anything that takes eyes off the road for more than a couple of seconds.

## 3. Goals & Success Metrics

### Goals
- Get a driver from "opening the app" to "route requested and broadcasting" in as few taps as possible.
- Make the driver's login persistent so it's a one-time cost per device, not a per-trip cost.
- Give the driver clear, glanceable confirmation that traffic is actually being alerted — so they trust the system enough to rely on it.
- Support both real GPS and a simulated "demo mode" so the app is demoable without a moving vehicle.

### Success Metrics (post-pilot)
- Time from app open to "route requested" (target: under 15 seconds).
- % of trips where the driver sees the "traffic alerted" confirmation before reaching the first junction.
- Driver drop-off rate mid-flow (proxy for whether the UI is too much friction under stress).

*Note: the MVP is a functional prototype and is not yet instrumented for these metrics — see Section 9.*

## 4. Target User

**Ambulance Driver** — operating the vehicle, often under time pressure and stress, using a phone mounted in the cab or handled briefly by a partner/attendant. Needs the interface to ask for the minimum information necessary and get out of the way.

## 5. Scope

### 5.1 In Scope (MVP v2, current build)

- **One-time local login** — name + vehicle ID entered once per device, remembered via browser local storage. No password, no account creation.
- **Trip request form** — two fields: pickup location and destination hospital (free text in the MVP). Tapping "Request emergency route" immediately creates the trip and notifies every officer on the (currently fixed, seeded) route corridor — this is the Tier 1 "incoming" alert, fired instantly and silently on the officer side.
- **Two ways to generate movement:**
  - Real device GPS, streamed continuously once the trip starts.
  - **"Simulate approach (demo mode)"** — a built-in button that auto-drives a virtual ambulance along the seeded corridor at a realistic pace, so the app can be demoed anywhere without a real vehicle moving.
- **Live map** (Leaflet + OpenStreetMap, no API key required) showing the ambulance's own current position as it moves.
- **"Traffic alerted" banner** — appears the moment a junction ahead has been sirened for the officer stationed there, so the driver gets confirmation the system is working without needing to interpret raw data.
- **Trip completion state** — once the ambulance has cleared the final junction on the route, the app shows "Trip complete" and stops broadcasting.
- **Reconnect support** — if the driver's app reloads or reconnects mid-trip, `GET /api/trips/:id` rehydrates the trip's current state from MongoDB so progress isn't lost.

### 5.2 Explicitly Out of Scope (MVP v2)

- **Real authentication** — local-storage login only; no password or server-verified identity.
- **Real routing** — pickup/hospital text is currently cosmetic; every trip runs the same fixed 4-junction demo corridor. No Directions API integration yet.
- **Multi-stop or re-routing mid-trip** — a trip is a single fixed path from creation to completion; there's no way to change destination or route after starting.
- **Vehicle/driver identity verification** against any real registry (license, dispatch system, etc.).
- **Offline mode** — if connectivity drops, location updates simply stop being sent; there's no local queuing/replay.
- **Trip history** — a driver has no view of past trips; only the current active trip is tracked.
- **Multi-ambulance awareness** — the driver has no visibility into whether another ambulance is also approaching the same junction.

## 6. User Flow

1. Open the driver app. If this is a new device, enter name + vehicle ID once — this is remembered for all future sessions.
2. Enter pickup location and destination hospital.
3. Tap **"Request emergency route."** The trip is created server-side; the seeded route's junctions are attached to it; every officer whose junction is anywhere on that route gets an instant, silent "incoming" notification.
4. Choose how to move:
   - Tap **"Simulate approach (demo mode)"** to auto-drive the demo corridor, or
   - Allow real GPS and start driving.
5. Watch the live map track the ambulance's own position in real time.
6. As junctions ahead get sirened for their officer, the **"traffic alerted"** banner appears — confirmation without detail overload.
7. On reaching and clearing the final junction, the app shows **"Trip complete"** and stops sending location updates.

## 7. Functional Requirements

| ID | Requirement | Status in MVP |
|---|---|---|
| DR-1 | Driver can register a name + vehicle ID once per device, persisted locally | Done |
| DR-2 | Driver can submit pickup + hospital and start a trip with one tap | Done |
| DR-3 | Starting a trip immediately notifies every officer on the route (Tier 1) | Done, against the fixed seeded corridor |
| DR-4 | Driver can stream real GPS location continuously while a trip is active | Done |
| DR-5 | Driver can trigger a simulated approach along the seeded route for demo purposes | Done |
| DR-6 | Driver sees a live map of the ambulance's own position | Done |
| DR-7 | Driver sees a clear, non-technical confirmation ("traffic alerted") when a junction ahead has been sirened | Done |
| DR-8 | Driver sees a "trip complete" state once the final junction clears | Done |
| DR-9 | Trip state survives a page reload/reconnect mid-trip | Done (MongoDB-backed `GET /api/trips/:id`) |
| DR-10 | Route is computed dynamically from the entered pickup/hospital via a real routing API | **Not built** — next milestone |
| DR-11 | Driver can view past completed trips | **Not built** |
| DR-12 | Driver can cancel or edit a trip in progress | **Not built** |

## 8. Non-Functional Considerations

- **Zero-friction entry:** every extra field or tap on this side of the app has an outsized cost given the driver's context — resist adding fields unless there's a strong reason.
- **Works without a data connection to any paid service:** map tiles and geolocation don't require an API key, keeping the app usable in a pilot with no procurement delay.
- **Location update frequency:** current implementation streams updates as fast as the browser's geolocation API (or the simulate-mode timer) produces them; a production version should consider battery impact and update-interval tuning for long shifts.
- **Trust signal:** the "traffic alerted" banner exists specifically so the driver isn't operating on blind faith that the system is working — this pattern should be preserved and possibly expanded (e.g., a subtle indicator per upcoming junction) as the app matures.

## 9. Open Questions / Next Milestones

1. **Real routing integration** — replace the fixed seeded corridor with a live Directions API call based on actual pickup/hospital input. Highest-priority gap.
2. **GPS reliability in motion** — validate real-world GPS accuracy and update frequency from inside a moving vehicle, not just stationary testing.
3. **Driver identity** — decide on a lightweight-but-real verification model (e.g., phone OTP tied to a dispatch roster) before piloting with real drivers.
4. **Trip cancellation** — what should happen if a trip is started in error or the ambulance is rerouted mid-trip? Currently unhandled.
5. **Multi-ambulance visibility** — should a driver be informed if another ambulance is converging on the same junction, or is that purely an officer-side concern?

## 10. Appendix: Relevant Technical Reference

- **Client:** static HTML/CSS/JS under `public/driver/`, Leaflet + OpenStreetMap for the map.
- **Trip creation:** `POST /api/trips` (driverName, vehicleId, pickup, hospital) → creates a MongoDB `Trip` document with the seeded junction list embedded and `status: "en_route"`.
- **Live updates:** `driver:join_trip` and `driver:location_update` Socket.io events; the server pushes back `trip:incoming`, `trip:siren`, `location:update`, and `junction:cleared` events that drive the UI states described above.
- **Reconnect:** `GET /api/trips/:id` returns the full trip document from MongoDB, including current junction index and status, so the client can resume mid-trip.

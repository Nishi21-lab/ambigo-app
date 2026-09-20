# AmbiGo Driver API Reference

Base URL: `http://localhost:3001`

## Endpoints

### `GET /health`
Returns server status.

**Response** `200`
```json
{ "status": "ok", "timestamp": "2026-09-17T05:00:00.000Z" }
```

---

### `POST /api/trips`
Create a new emergency trip. Attaches seeded junctions, sets all to `incoming`.

**Body**
```json
{
  "driverName": "Raj Mehta",
  "vehicleId": "GJ-01-Z-1234",
  "pickup": "Maninagar",
  "hospital": "VS Hospital"
}
```

**Response** `201`
```json
{
  "trip": {
    "_id": "64f...",
    "driverName": "Raj Mehta",
    "vehicleId": "GJ-01-Z-1234",
    "pickup": "Maninagar",
    "hospital": "VS Hospital",
    "status": "en_route",
    "junctions": [ ... ],
    "currentJunctionIndex": 0,
    "startedAt": "2026-09-17T05:00:00.000Z"
  }
}
```

---

### `GET /api/trips/:id`
Retrieve full trip document (used for reconnect rehydration).

**Response** `200` — full Trip object as above.

---

### `PATCH /api/trips/:id/complete`
Mark trip as completed.

**Response** `200` — updated Trip object.

---

### `PATCH /api/trips/:id/cancel`
Cancel a trip in progress.

**Response** `200` — updated Trip object.

---

## Socket.io Events

Socket server: `http://localhost:3002`

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `driver:join_trip` | `{ tripId }` | Join the trip room |
| `driver:location_update` | `{ tripId, location: { lat, lng } }` | Send current location |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `location:update` | `{ tripId, location }` | Echoed to all room members |
| `trip:incoming` | `{ tripId, junction }` | Junction is aware — officer alerted |
| `trip:siren` | `{ tripId, junction }` | Ambulance within 300m — siren active |
| `junction:cleared` | `{ tripId, junction, nextJunction? }` | Junction passed |
| `trip:completed` | `{ tripId }` | All junctions cleared |

---

## Junction Status Flow

```
pending → incoming → sirened → cleared
```

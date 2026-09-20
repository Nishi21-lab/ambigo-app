# AmbiGo Driver App — Architecture

## Overview

AmbiGo is a split architecture: a **Driver App** (this repo) and an **Officer App** (companion). This document covers the Driver side only.

```
                ┌─────────────────────────────────────┐
                │          Driver Browser              │
                │  React + Vite + Tailwind + Leaflet   │
                │                                      │
                │  TripPage                            │
                │   ├── RequestForm (REST POST)        │
                │   ├── LiveMap (Leaflet OSM)          │
                │   └── StatusBanner (socket events)   │
                └───────────────┬─────────────────────┘
                                │ REST + WebSocket
                ┌───────────────▼─────────────────────┐
                │            Hono Backend              │
                │        Node.js + TypeScript          │
                │                                      │
                │  REST API  (port 3001)               │
                │   POST /api/trips                    │
                │   GET  /api/trips/:id                │
                │   PATCH /api/trips/:id/complete      │
                │   PATCH /api/trips/:id/cancel        │
                │                                      │
                │  Socket.io (port 3002)               │
                │   driver:join_trip                   │
                │   driver:location_update             │
                │   → trip:incoming                    │
                │   → trip:siren                       │
                │   → junction:cleared                 │
                │   → trip:completed                   │
                └───────────────┬─────────────────────┘
                                │ Mongoose
                ┌───────────────▼─────────────────────┐
                │            MongoDB                   │
                │  Collection: trips                   │
                │  Embedded: junctions[]               │
                └─────────────────────────────────────┘
```

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Static seeded corridor | Avoids Directions API dependency for MVP; real routing is next milestone |
| Embedded junctions in Trip doc | Atomic updates without joins; small data set |
| Socket.io on separate port (3002) | Hono's Node adapter and Socket.io share HTTP differently; clean separation |
| localStorage for driver identity | Zero-friction login; no server-side sessions in MVP |
| Haversine distance for siren trigger | GPS-accurate great-circle distance without external dependency |
| react-leaflet + OSM | Free, no API key, works on any network |

## Data Flow

1. Driver fills form → `POST /api/trips` → MongoDB doc created with seeded junctions all set to `incoming`.
2. Driver's socket emits `driver:join_trip` → server joins them to a room keyed by tripId.
3. Every GPS/simulator tick → `driver:location_update` → server computes distance to current junction:
   - ≤ 300 m → set junction `sirened` → emit `trip:siren` to room.
   - ≤ 50 m → set junction `cleared`, advance index → emit `junction:cleared`.
   - All cleared → set trip `completed` → emit `trip:completed`.
4. Frontend socket listeners update local React state, driving UI changes.

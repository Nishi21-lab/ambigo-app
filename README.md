# AmbiGo Driver App 🚑

> **Open the app, say where you're going, and drive — AmbiGo handles telling traffic control the rest.**

The ambulance-side interface of the AmbiGo system. Broadcasts live GPS position so traffic officers at each junction can pre-clear the route before the ambulance arrives.

---

## Stack

| Layer | Technology |
|---|---|
| UI | React 18 + Vite |
| Styling | Tailwind CSS |
| Map | react-leaflet + OpenStreetMap (no API key) |
| Backend | Hono + TypeScript |
| Real-time | Socket.io |
| Database | MongoDB + Mongoose |
| Charts | Recharts (ready to use) |
| Deployment | Vercel (frontend) / Railway (backend) |

---

## Project Structure

```
ambigo-driver/
├── frontend/          # React + Vite
├── backend/           # Hono + TypeScript + Socket.io
├── shared/            # Shared TypeScript types
├── docs/
│   ├── architecture.md
│   └── api.md
├── .env.example
└── package.json       # npm workspaces root
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB running locally (`mongodb://localhost:27017`)

### 1. Clone & Install

```bash
git clone <your-repo>
cd ambigo-driver
cp .env.example .env
npm install
```

### 2. Run (dev mode — both frontend & backend)

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend REST: http://localhost:3001
- Socket.io: http://localhost:3002

### 3. Usage

1. Open `http://localhost:5173`
2. Enter your name and vehicle ID (saved for future sessions)
3. Enter pickup location and destination hospital
4. Tap **"Request Emergency Route"**
5. Choose **"Demo Mode"** to simulate driving, or **"Use GPS"** for real navigation
6. Watch the map and status alerts update in real time

---

## Environment Variables

See `.env.example` for all variables. Required:

```
MONGODB_URI=mongodb://localhost:27017/ambigo_driver
PORT=3001
FRONTEND_URL=http://localhost:5173
```

---

## Documentation

- [Architecture](docs/architecture.md)
- [API Reference](docs/api.md)

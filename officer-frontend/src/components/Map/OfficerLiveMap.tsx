import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Crosshair } from "lucide-react";
import type { Coordinates, Junction } from "../../types";

const markerIconUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const markerShadowUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

// Standard Junction icon
const JunctionIcon = L.icon({
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [22, 36],
  iconAnchor: [11, 36],
  popupAnchor: [1, -30],
});

// Pickup marker icon (Location pin)
const PickupIcon = L.divIcon({
  className: "",
  html: `<div style="
    width: 32px; height: 32px; border-radius: 50%;
    background: #3b82f6; border: 2.5px solid #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; box-shadow: 0 0 12px rgba(59,130,246,0.6);
  ">📍</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Hospital destination marker icon
const HospitalIcon = L.divIcon({
  className: "",
  html: `<div style="
    width: 34px; height: 34px; border-radius: 50%;
    background: #ef4444; border: 2.5px solid #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; box-shadow: 0 0 15px rgba(239,68,68,0.7);
  ">🏥</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

// Real-time Ambulance marker icon with radar beacon
const AmbulanceMarkerIcon = L.divIcon({
  className: "",
  html: `<div class="ambulance-officer-marker" style="
    width: 38px; height: 38px; border-radius: 50%;
    background: linear-gradient(135deg, #ef4444, #f87171);
    border: 3px solid #ffffff;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; line-height: 1;
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.7);
    cursor: pointer;
  ">🚑</div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

// Junction color mapping
const junctionColorMap: Record<string, string> = {
  pending: "#6b5ea8",    // WAITING (purple)
  incoming: "#3b82f6",   // INCOMING (blue)
  sirened: "#f59e0b",    // ALERTED (amber)
  authorized: "#10b981", // AUTHORIZED (emerald green)
  cleared: "#14b8a6",    // CLEARED (teal)
};

// Map Pan Controller
function MapFollower({
  location,
  shouldFollow,
}: {
  location: Coordinates | null;
  shouldFollow: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (location && shouldFollow) {
      map.panTo([location.lat, location.lng], { animate: true, duration: 0.8 });
    }
  }, [location, shouldFollow, map]);

  return null;
}

// Auto invalidates container dimensions on resize
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    const t = setTimeout(() => map.invalidateSize(), 300);
    return () => {
      observer.disconnect();
      clearTimeout(t);
    };
  }, [map]);
  return null;
}

interface OfficerLiveMapProps {
  ambulanceLocation: Coordinates | null;
  junctions: Junction[];
  pickupLocation?: Coordinates | null;
  pickupName?: string;
  hospitalName?: string;
  activeJunctionIndex?: number;
  onSelectJunction?: (junctionId: string) => void;
}

// Default center: First junction or Cyberabad / Hyderabad Emergency Transit Corridor
const DEFAULT_CENTER: Coordinates = { lat: 17.4350, lng: 78.3980 };

export const OfficerLiveMap: React.FC<OfficerLiveMapProps> = ({
  ambulanceLocation,
  junctions,
  pickupLocation,
  pickupName = "Incident Location",
  hospitalName = "General Hospital",
  activeJunctionIndex = 0,
  onSelectJunction,
}) => {
  const [autoFollow, setAutoFollow] = useState(true);

  // Compute center
  const initialCenter = ambulanceLocation || junctions[0]?.location || DEFAULT_CENTER;

  // Build corridor polyline points
  const routePoints: [number, number][] = [];
  if (pickupLocation) {
    routePoints.push([pickupLocation.lat, pickupLocation.lng]);
  }
  junctions.forEach((j) => {
    routePoints.push([j.location.lat, j.location.lng]);
  });

  return (
    <div className="relative w-full h-full min-h-[350px] overflow-hidden rounded-2xl border border-ambigo-800/80 shadow-2xl bg-[#090814]">
      {/* Map View Mode Controls */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
        <button
          onClick={() => setAutoFollow(!autoFollow)}
          title={autoFollow ? "Locking camera on ambulance" : "Click to track ambulance"}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur shadow-lg border transition-all ${
            autoFollow
              ? "bg-blue-600/90 border-blue-400 text-white shadow-blue-500/25"
              : "bg-ambigo-900/90 border-ambigo-700/80 text-ambigo-300 hover:text-white"
          }`}
        >
          <Crosshair className={`w-3.5 h-3.5 ${autoFollow ? "animate-spin" : ""}`} />
          <span>{autoFollow ? "Tracking Ambulance" : "Free Pan"}</span>
        </button>
      </div>

      {/* Corridor Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-[#0d0b1e]/90 backdrop-blur-md border border-ambigo-800/80 px-3 py-2 rounded-xl text-[11px] space-y-1 shadow-lg pointer-events-none hidden sm:block">
        <div className="font-bold text-ambigo-300 uppercase tracking-wider text-[9px] mb-1">
          Corridor Signals
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Alerted
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Authorized
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-teal-400" /> Cleared
          </span>
        </div>
      </div>

      <MapContainer
        center={[initialCenter.lat, initialCenter.lng]}
        zoom={14}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapResizer />
        <MapFollower location={ambulanceLocation} shouldFollow={autoFollow} />

        {/* Route Polyline */}
        {routePoints.length > 1 && (
          <>
            <Polyline
              positions={routePoints}
              pathOptions={{
                color: "#1e90ff",
                weight: 5,
                opacity: 0.7,
                dashArray: "8, 6",
              }}
            />
            <Polyline
              positions={routePoints}
              pathOptions={{
                color: "#60a5fa",
                weight: 2,
                opacity: 0.9,
              }}
            />
          </>
        )}

        {/* Pickup Pin */}
        {pickupLocation && (
          <Marker position={[pickupLocation.lat, pickupLocation.lng]} icon={PickupIcon}>
            <Popup>
              <div className="p-1">
                <p className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                  Pickup Location
                </p>
                <p className="text-xs font-semibold text-white mt-0.5">{pickupName}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Junctions along Route */}
        {junctions.map((junction, index) => {
          const isCurrentTarget = index === activeJunctionIndex;
          const color = junctionColorMap[junction.status] || "#6b5ea8";

          return (
            <React.Fragment key={junction.id}>
              {/* Radar pulse circle around active junction */}
              <Circle
                center={[junction.location.lat, junction.location.lng]}
                radius={isCurrentTarget ? 140 : 90}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: isCurrentTarget ? 0.35 : 0.18,
                  weight: isCurrentTarget ? 3 : 1.5,
                  dashArray: isCurrentTarget ? "4, 4" : undefined,
                }}
              />

              <Marker
                position={[junction.location.lat, junction.location.lng]}
                icon={JunctionIcon}
                eventHandlers={{
                  click: () => onSelectJunction?.(junction.id),
                }}
              >
                <Popup>
                  <div className="p-1 min-w-[160px]">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-bold text-ambigo-400 uppercase">
                        Junction #{index + 1}
                      </span>
                      <span
                        className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded"
                        style={{ color }}
                      >
                        {junction.status}
                      </span>
                    </div>
                    <p className="font-bold text-white text-xs leading-tight">
                      {junction.name}
                    </p>
                    <p className="text-[10px] text-ambigo-300 mt-1">
                      Lat: {junction.location.lat.toFixed(4)}, Lng:{" "}
                      {junction.location.lng.toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Hospital Destination Marker */}
        {junctions.length > 0 && (
          <Marker
            position={[
              junctions[junctions.length - 1].location.lat,
              junctions[junctions.length - 1].location.lng,
            ]}
            icon={HospitalIcon}
          >
            <Popup>
              <div className="p-1">
                <p className="text-[10px] uppercase font-bold text-red-400 tracking-wider">
                  Destination Hospital
                </p>
                <p className="text-xs font-semibold text-white mt-0.5">{hospitalName}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Live Ambulance Marker */}
        {ambulanceLocation && (
          <Marker
            position={[ambulanceLocation.lat, ambulanceLocation.lng]}
            icon={AmbulanceMarkerIcon}
          >
            <Popup>
              <div className="p-1 min-w-[140px]">
                <p className="text-[10px] uppercase font-black text-alert-red tracking-wider">
                  🚨 Emergency Vehicle
                </p>
                <p className="text-xs font-bold text-white mt-0.5">Live Ambulance</p>
                <p className="text-[10px] text-ambigo-400 mt-1">
                  {ambulanceLocation.lat.toFixed(5)}, {ambulanceLocation.lng.toFixed(5)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

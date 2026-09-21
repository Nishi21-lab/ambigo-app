import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { Coordinates, Junction } from "../../types";

// Fix default Leaflet icon paths broken by Vite bundling
// Use string URLs instead of PNG imports to avoid missing type declarations
const markerIconUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const markerShadowUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Custom ambulance icon
const AmbulanceIcon = L.divIcon({
  className: "",
  html: `<div class="ambulance-marker-icon" style="
    width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(135deg, #ff4757, #ff6b81);
    border: 3px solid #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; line-height: 1;
    box-shadow: 0 0 0 4px rgba(255,71,87,0.25);
  ">🚑</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Junction status → color
const junctionColor: Record<string, string> = {
  pending: "#4a3f7f",
  incoming: "#1e90ff",
  sirened: "#ffa502",
  authorized: "#00d2d3",
  cleared: "#2ed573",
};

// Auto-pan to ambulance position
function MapFollower({ location }: { location: Coordinates }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([location.lat, location.lng], { animate: true, duration: 0.8 });
  }, [location, map]);
  return null;
}

// Ensure map recalculates size when container resizes (e.g. CSS transitions)
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(map.getContainer());

    // Also trigger once slightly after mount to catch transition end
    const timeout = setTimeout(() => map.invalidateSize(), 350);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timeout);
    };
  }, [map]);
  return null;
}

interface LiveMapProps {
  currentLocation: Coordinates | null;
  junctions: Junction[];
  initialCenter?: Coordinates;
}

const DEFAULT_CENTER: Coordinates = { lat: 23.0225, lng: 72.5714 };

export const LiveMap: React.FC<LiveMapProps> = ({
  currentLocation,
  junctions,
  initialCenter = DEFAULT_CENTER,
}) => {
  return (
    <MapContainer
      center={[initialCenter.lat, initialCenter.lng]}
      zoom={14}
      className="w-full h-full rounded-xl z-0"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapResizer />

      {/* Junction markers */}
      {junctions.map((junction) => (
        <React.Fragment key={junction.id}>
          <Circle
            center={[junction.location.lat, junction.location.lng]}
            radius={80}
            pathOptions={{
              color: junctionColor[junction.status] ?? "#4a3f7f",
              fillColor: junctionColor[junction.status] ?? "#4a3f7f",
              fillOpacity: 0.25,
              weight: 2,
            }}
          />
          <Marker
            position={[junction.location.lat, junction.location.lng]}
            icon={DefaultIcon}
          >
            <Popup>
              <div>
                <p className="font-semibold">{junction.name}</p>
                <p className="capitalize text-xs mt-0.5">
                  Status:{" "}
                  <span style={{ color: junctionColor[junction.status] }}>
                    {junction.status}
                  </span>
                </p>
              </div>
            </Popup>
          </Marker>
        </React.Fragment>
      ))}

      {/* Ambulance */}
      {currentLocation && (
        <>
          <Marker
            position={[currentLocation.lat, currentLocation.lng]}
            icon={AmbulanceIcon}
          >
            <Popup>
              <p className="font-semibold">Your Ambulance</p>
              <p className="text-xs text-gray-400">
                {currentLocation.lat.toFixed(5)},{" "}
                {currentLocation.lng.toFixed(5)}
              </p>
            </Popup>
          </Marker>
          <MapFollower location={currentLocation} />
        </>
      )}
    </MapContainer>
  );
};

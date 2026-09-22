import type { Coordinates } from "../../../shared/types/index.js";

/**
 * Seeded demo corridor: 4 junctions along a fixed route.
 * Used when real routing is not yet available.
 */

export interface SeededJunction {
  id: string;
  name: string;
  location: Coordinates;
}

export const SEEDED_ROUTE: SeededJunction[] = [
  {
    id: "junction-001",
    name: "Cyber Towers Junction",
    location: { lat: 17.4504, lng: 78.3808 },
  },
  {
    id: "junction-002",
    name: "Madhapur Metro Junction",
    location: { lat: 17.4435, lng: 78.3942 },
  },
  {
    id: "junction-003",
    name: "Jubilee Hills Checkpost",
    location: { lat: 17.4264, lng: 78.4140 },
  },
  {
    id: "junction-004",
    name: "Apollo Hospital Gate",
    location: { lat: 17.4168, lng: 78.4132 },
  },
];

/**
 * Returns seeded junction documents ready to embed in a Trip.
 */
export function getSeededJunctions() {
  return SEEDED_ROUTE.map((j) => ({
    ...j,
    status: "pending" as const,
    officerId: undefined,
  }));
}

/**
 * Interpolates coordinates for the simulate-approach mode.
 * Returns ~20 waypoints between each consecutive junction pair.
 */
export function interpolateRoute(steps = 20): Coordinates[] {
  const points: Coordinates[] = [];
  for (let i = 0; i < SEEDED_ROUTE.length - 1; i++) {
    const from = SEEDED_ROUTE[i].location;
    const to = SEEDED_ROUTE[i + 1].location;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      points.push({
        lat: from.lat + (to.lat - from.lat) * t,
        lng: from.lng + (to.lng - from.lng) * t,
      });
    }
  }
  return points;
}

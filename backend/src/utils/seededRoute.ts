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
    name: "Civil Hospital Chowk",
    location: { lat: 23.0225, lng: 72.5714 },
  },
  {
    id: "junction-002",
    name: "Nehru Bridge",
    location: { lat: 23.027, lng: 72.5803 },
  },
  {
    id: "junction-003",
    name: "Kalupur Signal",
    location: { lat: 23.031, lng: 72.5885 },
  },
  {
    id: "junction-004",
    name: "VS Hospital Gate",
    location: { lat: 23.0356, lng: 72.5945 },
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

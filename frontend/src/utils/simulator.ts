import type { Coordinates } from "../types";

// Seeded waypoints mirroring the backend seeded corridor (interpolated)
const SEEDED_WAYPOINTS: Coordinates[] = [
  { lat: 23.0225, lng: 72.5714 },
  { lat: 23.0234, lng: 72.5730 },
  { lat: 23.0243, lng: 72.5746 },
  { lat: 23.0252, lng: 72.5762 },
  { lat: 23.0261, lng: 72.5778 },
  { lat: 23.0270, lng: 72.5803 }, // Junction 2
  { lat: 23.0279, lng: 72.5818 },
  { lat: 23.0288, lng: 72.5833 },
  { lat: 23.0297, lng: 72.5848 },
  { lat: 23.0306, lng: 72.5863 },
  { lat: 23.0310, lng: 72.5885 }, // Junction 3
  { lat: 23.0319, lng: 72.5900 },
  { lat: 23.0328, lng: 72.5912 },
  { lat: 23.0337, lng: 72.5924 },
  { lat: 23.0347, lng: 72.5934 },
  { lat: 23.0356, lng: 72.5945 }, // Junction 4
];

export interface SimulatorState {
  isRunning: boolean;
  currentIndex: number;
  currentLocation: Coordinates | null;
}

let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Starts the demo-mode simulator. Calls `onUpdate` with each successive
 * coordinate on the route, and `onComplete` when the route ends.
 */
export function startSimulator(
  onUpdate: (location: Coordinates, index: number) => void,
  onComplete: () => void,
  intervalMs: number = 1500
): void {
  if (intervalId) stopSimulator();

  let index = 0;

  // Emit first position immediately
  onUpdate(SEEDED_WAYPOINTS[index], index);
  index++;

  intervalId = setInterval(() => {
    if (index >= SEEDED_WAYPOINTS.length) {
      stopSimulator();
      onComplete();
      return;
    }
    onUpdate(SEEDED_WAYPOINTS[index], index);
    index++;
  }, intervalMs);
}

export function stopSimulator(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export function isSimulatorRunning(): boolean {
  return intervalId !== null;
}

export { SEEDED_WAYPOINTS };

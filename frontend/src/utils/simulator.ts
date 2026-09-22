import type { Coordinates } from "../types";

// Seeded waypoints mirroring the backend seeded corridor in Hyderabad (interpolated)
const SEEDED_WAYPOINTS: Coordinates[] = [
  { lat: 17.4504, lng: 78.3808 }, // Junction 1: Cyber Towers
  { lat: 17.4490, lng: 78.3835 },
  { lat: 17.4476, lng: 78.3862 },
  { lat: 17.4462, lng: 78.3888 },
  { lat: 17.4449, lng: 78.3915 },
  { lat: 17.4435, lng: 78.3942 }, // Junction 2: Madhapur Metro
  { lat: 17.4401, lng: 78.3982 },
  { lat: 17.4367, lng: 78.4021 },
  { lat: 17.4332, lng: 78.4061 },
  { lat: 17.4298, lng: 78.4100 },
  { lat: 17.4264, lng: 78.4140 }, // Junction 3: Jubilee Hills Checkpost
  { lat: 17.4245, lng: 78.4138 },
  { lat: 17.4226, lng: 78.4137 },
  { lat: 17.4206, lng: 78.4135 },
  { lat: 17.4187, lng: 78.4134 },
  { lat: 17.4168, lng: 78.4132 }, // Junction 4: Apollo Hospital Gate
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

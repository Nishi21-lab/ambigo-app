import type { Coordinates } from "../types";

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

export function calculateDistanceMeters(a: Coordinates, b: Coordinates): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const a2 =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      sinDLng *
      sinDLng;
  return Math.round(2 * R * Math.asin(Math.sqrt(a2)));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function calculateETA(meters: number, avgSpeedKmh: number = 45): string {
  const speedMps = (avgSpeedKmh * 1000) / 3600;
  const seconds = Math.max(5, Math.round(meters / speedMps));

  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSec = seconds % 60;
  return `${minutes}m ${remainingSec}s`;
}

// ── Web Audio API Emergency Siren / Chime ───────────────────────
let audioCtx: AudioContext | null = null;

export function playEmergencyAlertSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx || audioCtx.state === "closed") {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Two-tone high priority dispatch alert (880Hz -> 660Hz)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.setValueAtTime(660, now + 0.18);
    osc1.frequency.setValueAtTime(880, now + 0.36);

    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);

    osc1.start(now);
    osc1.stop(now + 0.6);
  } catch (err) {
    console.warn("Could not play synthesized alert sound", err);
  }
}

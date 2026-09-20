import { useState, useEffect, useCallback } from "react";
import type { Coordinates } from "../types";

interface GeolocationState {
  location: Coordinates | null;
  error: string | null;
  isWatching: boolean;
}

export function useGeolocation(enabled: boolean = false) {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    isWatching: false,
  });

  const [watchId, setWatchId] = useState<number | null>(null);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: "Geolocation is not supported by this browser." }));
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          error: null,
          isWatching: true,
        });
      },
      (err) => {
        setState((s) => ({
          ...s,
          error: `GPS error: ${err.message}`,
          isWatching: false,
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    setWatchId(id);
  }, []);

  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setState((s) => ({ ...s, isWatching: false }));
    }
  }, [watchId]);

  useEffect(() => {
    if (enabled) {
      startWatching();
    } else {
      stopWatching();
    }
    return () => stopWatching();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { ...state, startWatching, stopWatching };
}

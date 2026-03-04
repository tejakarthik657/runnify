// hooks/useGPS.ts
// Real GPS tracking using Geolocation API

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

export type GPSState = {
    lat: number | null;
    lng: number | null;
    accuracy: number | null;
    altitude: number | null;
    error: string | null;
    pointIndex: number;
};

type Options = {
    onUpdate?: (state: GPSState) => void;
    enabled?: boolean;
};

export function useGps({ onUpdate, enabled = false }: Options = {}) {
    const [active, setActive] = useState(false);
    const [state, setState] = useState<GPSState>({ lat: null, lng: null, accuracy: null, altitude: null, error: null, pointIndex: 0 });
    const watchIdRef = useRef<number>(0);
    const onUpdateRef = useRef(onUpdate);

    // Keep onUpdateRef in sync
    useEffect(() => {
        onUpdateRef.current = onUpdate;
    }, [onUpdate]);

    const handleUpdate = useCallback((newState: GPSState) => {
        setState(newState);
    }, []);

    const stop = useCallback(() => {
        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = 0;
        }
        setActive(false);
    }, []);

    const start = useCallback(() => {
        if (!navigator.geolocation) {
            handleUpdate({ lat: null, lng: null, accuracy: null, altitude: null, error: 'Geolocation not supported', pointIndex: 0 });
            toast.error('GPS not available on this device');
            return;
        }

        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }

        setActive(true);

        // STAGE 1: Instant Coarse Fix (Bypass "Searching..." hang)
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude: lat, longitude: lng, accuracy, altitude } = pos.coords;
                setState(prev => {
                    if (prev.lat !== null) return prev; // Already have a better fix
                    return { lat, lng, accuracy, altitude, error: null, pointIndex: 1 };
                });
            },
            (err) => console.warn('[GPS] Quick fix failed, waiting for precision watch...', err),
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 10000 }
        );

        // STAGE 2: Precision Watch
        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude: lat, longitude: lng, accuracy, altitude } = pos.coords;

                setState(prev => {
                    // Accuracy Filtering
                    const limit = 30;
                    if (accuracy > limit) return prev;

                    if (prev.lat !== null && prev.lng !== null) {
                        const dist = getDistance(prev.lat, prev.lng, lat, lng);
                        if (dist < 0.005) return prev;
                    }

                    return {
                        lat,
                        lng,
                        accuracy,
                        altitude,
                        error: null,
                        pointIndex: prev.pointIndex + 1,
                    };
                });
            },
            (err) => {
                let message = 'GPS Update Failed';
                if (err.code === err.PERMISSION_DENIED) message = 'GPS Permission Denied';
                else if (err.code === err.POSITION_UNAVAILABLE) message = 'GPS Signal Lost';
                else if (err.code === 3) message = 'Searching for Satellites...';

                setState(prev => ({ ...prev, error: message }));
                if (err.code === 1) toast.error(message);
                console.error(`[GPS] ${message}`, err);
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
        );

        function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }
    }, [handleUpdate]);

    useEffect(() => {
        if (onUpdateRef.current) {
            onUpdateRef.current(state);
        }
    }, [state]);

    useEffect(() => {
        if (enabled && !active) {
            start();
        }
        return () => {
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = 0;
            }
        };
    }, [enabled, start]); // removed 'active' to avoid loops

    const updatePosition = useCallback((point: { lat: number; lng: number; accuracy?: number; altitude?: number }) => {
        handleUpdate({
            lat: point.lat,
            lng: point.lng,
            accuracy: point.accuracy ?? 8,
            altitude: point.altitude ?? null,
            error: null,
            pointIndex: 0
        });
    }, [handleUpdate]);

    return { start, stop, active, state, position: state, error: state.error, updatePosition };
}

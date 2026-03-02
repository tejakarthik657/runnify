import { useState, useEffect, useCallback } from 'react';

interface GpsPosition {
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: number;
    speed: number | null;
    heading: number | null;
}

export const useGps = (enabled: boolean = false) => {
    const [position, setPosition] = useState<GpsPosition | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<PermissionState | null>(null);

    const handleSuccess = useCallback((pos: GeolocationPosition) => {
        setPosition({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
        });
        setError(null);
    }, []);

    const handleError = useCallback((err: GeolocationPositionError) => {
        let message = 'Unknown GPS error';
        switch (err.code) {
            case err.PERMISSION_DENIED:
                message = 'GPS permission denied';
                break;
            case err.POSITION_UNAVAILABLE:
                message = 'GPS position unavailable';
                break;
            case err.TIMEOUT:
                message = 'GPS request timed out';
                break;
        }
        setError(message);
        toast.error(message); // Assuming toast is available or we can handle it in the component
    }, []);

    useEffect(() => {
        if (!enabled || !navigator.geolocation) {
            if (enabled && !navigator.geolocation) {
                setError('Geolocation not supported');
            }
            return;
        }

        const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 10000,
        });

        // Check permission status
        navigator.permissions?.query({ name: 'geolocation' as any }).then((result) => {
            setPermissionStatus(result.state);
            result.onchange = () => setPermissionStatus(result.state);
        });

        return () => navigator.geolocation.clearWatch(watchId);
    }, [enabled, handleSuccess, handleError]);

    return { position, error, permissionStatus };
};

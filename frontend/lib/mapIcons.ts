import L from 'leaflet';

// Custom Marker for User Position
export const UserIcon = (color: string, isOther: boolean = false) => {
    if (typeof window === 'undefined') return null;
    const size = isOther ? 18 : 20;
    const pulseSize = isOther ? '-6px' : '-4px';
    const pulseAnim = isOther ? 'pulse-gps-other 1.5s infinite' : 'pulse-gps 2s infinite';

    return L.divIcon({
        className: isOther ? 'other-position-marker' : 'user-position-marker',
        html: `<div style="width: ${size}px; height: ${size}px; background: ${color}; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px ${color}88; position: relative;">
                <div style="position: absolute; inset: ${pulseSize}; border: 2px solid ${color}${isOther ? '88' : '44'}; border-radius: 50%; animation: ${pulseAnim};"></div>
               </div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
};

import React from 'react';
// Leaflet is provided globally via CDN
declare const L: typeof import('leaflet');

interface AirportMarkerProps {
  flightCount: number;
  markerType?: 'default' | 'itinerary' | 'current-destination';
  className?: string;
}

export const AirportMarker: React.FC<AirportMarkerProps> = ({ 
  flightCount, 
  markerType = 'default',
  className = ''
}) => {
  const getMarkerClass = () => {
    let baseClass = 'airport-icon';
    
    if (markerType === 'itinerary') {
      baseClass += ' itinerary';
    } else if (markerType === 'current-destination') {
      baseClass += ' current-destination';
    }
    
    if (className) {
      baseClass += ` ${className}`;
    }
    
    return baseClass;
  };

  return (
    <div className={getMarkerClass()}>
      {flightCount}
    </div>
  );
};

// Helper function to create Leaflet DivIcon from React component
export function createAirportIconFromReact(
  flightCount: number,
  markerType: 'default' | 'itinerary' | 'current-destination' = 'default'
): L.DivIcon | null {
  // Use static HTML string (no React root needed)
  const markerClass = `airport-icon${markerType === 'itinerary' ? ' itinerary' : ''}${markerType === 'current-destination' ? ' current-destination' : ''}`;
  const html = `<div class="${markerClass}">${flightCount}</div>`;

  return (L as any).divIcon({
    className: 'ryanair-marker',
    html,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}
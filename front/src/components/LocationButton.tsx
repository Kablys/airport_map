import { useState } from 'react';

export function LocationButton({ onLocationFound }: { onLocationFound: (lat: number, lng: number) => void }) {
  const [isLoading, setIsLoading] = useState(false);

  const requestUserLocation = () => {
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onLocationFound(coords.latitude, coords.longitude);
        setIsLoading(false);
      },
      (error) => {
        console.warn('Geolocation failed:', error.message);
        setIsLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  };

  return (
    <button
      type="button"
      className="location-button-inline"
      title="Go to your location"
      aria-label="Go to your location"
      onClick={requestUserLocation}
      disabled={isLoading}
    >
      {isLoading ? '🔄' : '📍'}
    </button>
  );
}

import { useState } from 'react';
import { Icon } from './Icon.tsx';

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
      className="icon-btn"
      title="Go to your location"
      aria-label="Go to your location"
      onClick={requestUserLocation}
      disabled={isLoading}
    >
      <Icon name={isLoading ? 'loader' : 'locate'} spin={isLoading} />
    </button>
  );
}

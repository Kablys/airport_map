import React, { useState, useCallback } from 'react';

interface LocationButtonProps {
  onLocationFound: (lat: number, lng: number) => void;
}

export const LocationButton: React.FC<LocationButtonProps> = ({
  onLocationFound
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const requestUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      console.log('Geolocation is not supported by this browser');
      return;
    }

    setIsLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onLocationFound(latitude, longitude);
        setIsLoading(false);
      },
      (error) => {
        console.log('Geolocation error:', error);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  }, [onLocationFound]);

  return (
    <button
      className="location-button-inline"
      title="Go to your location"
      onClick={requestUserLocation}
      disabled={isLoading}
    >
      {isLoading ? '🔄' : '📍'}
    </button>
  );
};
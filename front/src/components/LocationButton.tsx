import React, { useState, useCallback } from 'react';
import type { Airport } from '../main.ts';

interface LocationButtonProps {
  onLocationFound: (lat: number, lng: number) => void;
  airports: Airport[];
}

interface CityCoordinates {
  [key: string]: [number, number];
}

// Basic hardcoded coordinates for major European cities
const cityCoordinates: CityCoordinates = {
  london: [51.5074, -0.1278],
  paris: [48.8566, 2.3522],
  berlin: [52.52, 13.405],
  madrid: [40.4168, -3.7038],
  rome: [41.9028, 12.4964],
  amsterdam: [52.3676, 4.9041],
  vienna: [48.2082, 16.3738],
  prague: [50.0755, 14.4378],
  budapest: [47.4979, 19.0402],
  warsaw: [52.2297, 21.0122],
  stockholm: [59.3293, 18.0686],
  copenhagen: [55.6761, 12.5683],
  oslo: [59.9139, 10.7522],
  helsinki: [60.1699, 24.9384],
  dublin: [53.3498, -6.2603],
  lisbon: [38.7223, -9.1393],
  barcelona: [41.3851, 2.1734],
  milan: [45.4642, 9.19],
  munich: [48.1351, 11.582],
  zurich: [47.3769, 8.5417],
  brussels: [50.8503, 4.3517],
  athens: [37.9838, 23.7275],
  istanbul: [41.0082, 28.9784],
};

export const LocationButton: React.FC<LocationButtonProps> = ({ 
  onLocationFound, 
  airports 
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const getCityCoordinates = useCallback((city: string): [number, number] | null => {
    const searchTerm = city.toLowerCase().trim();
    
    for (const [cityName, coords] of Object.entries(cityCoordinates)) {
      if (cityName.includes(searchTerm) || searchTerm.includes(cityName)) {
        return coords;
      }
    }
    
    return null;
  }, []);

  const findMatchingAirport = useCallback((searchTerm: string): Airport | null => {
    return airports.find(
      (airport) =>
        airport.city.toLowerCase().includes(searchTerm) ||
        airport.country.toLowerCase().includes(searchTerm) ||
        airport.name.toLowerCase().includes(searchTerm)
    ) || null;
  }, [airports]);

  const promptForManualLocation = useCallback(() => {
    const location = prompt('Enter your city or location (e.g., "Paris", "London", "Berlin"):');
    
    if (!location || location.trim() === '') {
      return;
    }

    const searchTerm = location.toLowerCase().trim();
    
    // Try to find matching airport first
    const matchingAirport = findMatchingAirport(searchTerm);
    if (matchingAirport) {
      onLocationFound(matchingAirport.lat, matchingAirport.lng);
      return;
    }

    // If no airport match, try basic city coordinates
    const coordinates = getCityCoordinates(searchTerm);
    if (coordinates) {
      onLocationFound(coordinates[0], coordinates[1]);
    } else {
      alert(`Sorry, couldn't find location "${location}". Try entering a major European city.`);
    }
  }, [findMatchingAirport, getCityCoordinates, onLocationFound]);

  const requestUserLocation = useCallback(() => {
    setIsLoading(true);

    if (!navigator.geolocation) {
      setIsLoading(false);
      promptForManualLocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onLocationFound(latitude, longitude);
        setIsLoading(false);
      },
      (error) => {
        console.log('Geolocation error:', error);
        setIsLoading(false);
        promptForManualLocation();
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  }, [onLocationFound, promptForManualLocation]);

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
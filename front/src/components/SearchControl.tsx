import React, { useState, useCallback } from 'react';
import type { Airport } from '../main.ts';
import { LocationButton } from './LocationButton.tsx';

interface LeafletMap {
  flyTo(center: [number, number], zoom: number): void;
}

interface SearchControlProps {
  airports: Airport[];
  map: LeafletMap;
}

interface SearchResult {
  airport: Airport;
  onClick: () => void;
}

const SearchResult: React.FC<SearchResult> = ({ airport, onClick }) => (
  <div className="search-result" onClick={onClick}>
    <strong className="airport-name-code">{airport.name} ({airport.code})</strong><br />
    <span className="airport-location">{airport.city}, {airport.flag} {airport.country}</span>
  </div>
);

export const SearchControlReact: React.FC<SearchControlProps> = ({ airports, map }) => {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<Airport[]>([]);

  const handleSearch = useCallback((searchQuery: string) => {
    const trimmedQuery = searchQuery.toLowerCase().trim();
    setQuery(searchQuery);

    if (trimmedQuery.length < 2) {
      setMatches([]);
      return;
    }

    const filteredMatches = airports
      .filter(
        (airport) =>
          airport.name.toLowerCase().includes(trimmedQuery) ||
          airport.city.toLowerCase().includes(trimmedQuery) ||
          airport.country.toLowerCase().includes(trimmedQuery) ||
          airport.code.toLowerCase().includes(trimmedQuery)
      )
      .slice(0, 10);

    setMatches(filteredMatches);
  }, [airports]);

  const flyToAirport = useCallback((lat: number, lng: number) => {
    map.flyTo([lat, lng], 10);
    setQuery('');
    setMatches([]);
  }, [map]);

  const handleLocationFound = useCallback((lat: number, lng: number) => {
    map.flyTo([lat, lng], 10);
  }, [map]);

  return (
    <div className="search-control">
      <div className="ui-panel">
        <div className="search-input-container">
          <input
            type="text"
            id="airport-search"
            placeholder="Search airports..."
            className="search-input"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <LocationButton 
            onLocationFound={handleLocationFound}
            airports={airports}
          />
        </div>
        <div id="search-results" className="search-results">
          {matches.length === 0 && query.length >= 2 && (
            <div style={{ padding: '5px', color: '#666' }}>No airports found</div>
          )}
          {matches.map((airport) => (
            <SearchResult
              key={airport.code}
              airport={airport}
              onClick={() => flyToAirport(airport.lat, airport.lng)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
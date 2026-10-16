import { useState } from 'react';
import type { Airport } from '../types.ts';
import { LocationButton } from './LocationButton.tsx';

interface SearchControlProps {
  airports: Airport[];
  flyTo: (lat: number, lng: number) => void;
}

export function SearchControl({ airports, flyTo }: SearchControlProps) {
  const [query, setQuery] = useState('');
  const term = query.toLowerCase().trim();
  const matches =
    term.length < 2
      ? []
      : airports
          .filter((a) => [a.name, a.city, a.country, a.code].some((field) => field.toLowerCase().includes(term)))
          .slice(0, 10);

  const select = (airport: Airport) => {
    flyTo(airport.lat, airport.lng);
    setQuery('');
  };

  return (
    <div className="search-control">
      <div className="ui-panel">
        <div className="search-input-container">
          <input
            type="search"
            id="airport-search"
            placeholder="Search airports..."
            aria-label="Search airports"
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && matches[0] && select(matches[0])}
          />
          <LocationButton onLocationFound={flyTo} />
        </div>
        <div id="search-results" className="search-results">
          {matches.length === 0 && term.length >= 2 && <div className="no-results small-muted">No airports found</div>}
          {matches.map((airport) => (
            <button type="button" key={airport.code} className="search-result" onClick={() => select(airport)}>
              <strong className="airport-name-code">
                {airport.name} ({airport.code})
              </strong>
              <br />
              <span className="airport-location">
                {airport.city}, {airport.flag} {airport.country}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import type { Airport, Routes } from '../main.ts';
import './InfoPageModal.css';

interface CountryStats {
  name: string;
  flag: string;
  airportCount: number;
  airports: Airport[];
}

interface AirportStats extends Airport {
  routeCount: number;
}

interface InfoPageProps {
  airports: Airport[];
  routes: Routes;
  onAirportClick: (airport: Airport) => void;
}

// Countries List Component
const CountriesList: React.FC<{
  airports: Airport[];
  routes: Routes;
  onCountryClick: (country: CountryStats) => void;
}> = ({ airports, routes, onCountryClick }) => {
  const [countries, setCountries] = useState<CountryStats[]>([]);

  useEffect(() => {
    // Group airports by country
    const countriesMap = new Map<string, CountryStats>();

    for (const airport of airports) {
      if (!countriesMap.has(airport.country)) {
        countriesMap.set(airport.country, {
          name: airport.country,
          flag: airport.flag,
          airportCount: 0,
          airports: [],
        });
      }

      const countryStats = countriesMap.get(airport.country);
      if (countryStats) {
        countryStats.airportCount++;
        countryStats.airports.push(airport);
      }
    }

    // Sort countries by airport count (descending)
    const sortedCountries = Array.from(countriesMap.values())
      .sort((a, b) => b.airportCount - a.airportCount);

    setCountries(sortedCountries);
  }, [airports]);

  return (
    <div className="countries-list">
      {countries.map((country) => (
        <div
          key={country.name}
          className="country-item"
          onClick={() => onCountryClick(country)}
          style={{ cursor: 'pointer' }}
        >
          <div className="country-name">
            <span>{country.flag}</span>
            <span>{country.name}</span>
          </div>
          <div className="country-count">{country.airportCount}</div>
        </div>
      ))}
    </div>
  );
};

// Top Airports Component
const TopAirports: React.FC<{
  airports: Airport[];
  routes: Routes;
  onAirportClick: (airport: Airport) => void;
}> = ({ airports, routes, onAirportClick }) => {
  const [topAirports, setTopAirports] = useState<AirportStats[]>([]);

  useEffect(() => {
    // Calculate route counts for each airport
    const airportsWithStats: AirportStats[] = airports.map((airport) => ({
      ...airport,
      routeCount: routes[airport.code]?.length || 0,
    }));

    // Sort by route count (descending) and take top 20
    const sorted = airportsWithStats
      .sort((a, b) => b.routeCount - a.routeCount)
      .slice(0, 20);

    setTopAirports(sorted);
  }, [airports, routes]);

  return (
    <div className="top-airports">
      {topAirports.map((airport, index) => (
        <div
          key={airport.code}
          className="airport-item"
          onClick={() => onAirportClick(airport)}
          style={{ cursor: 'pointer' }}
        >
          <div className="airport-info">
            <div className="airport-name">
              {index + 1}. {airport.flag} {airport.name} ({airport.code})
            </div>
            <div className="airport-details">
              {airport.city}, {airport.country}
            </div>
          </div>
          <div className="airport-routes">{airport.routeCount}</div>
        </div>
      ))}
    </div>
  );
};

// Flight Statistics Component
const FlightStats: React.FC<{
  airports: Airport[];
  routes: Routes;
}> = ({ airports, routes }) => {
  const [stats, setStats] = useState({
    totalAirports: 0,
    totalCountries: 0,
    totalRoutes: 0,
    avgRoutesPerAirport: 0,
  });

  useEffect(() => {
    const totalAirports = airports.length;
    const totalCountries = new Set(airports.map((a) => a.country)).size;
    const totalRoutes = Object.values(routes).reduce((sum, routeList) => sum + routeList.length, 0);
    const avgRoutesPerAirport = Math.round(totalRoutes / totalAirports);

    setStats({
      totalAirports,
      totalCountries,
      totalRoutes,
      avgRoutesPerAirport,
    });
  }, [airports, routes]);

  return (
    <div className="flight-stats">
      <div className="stat-item">
        <div className="stat-number">{stats.totalAirports}</div>
        <div className="stat-label">Total Airports</div>
      </div>
      <div className="stat-item">
        <div className="stat-number">{stats.totalCountries}</div>
        <div className="stat-label">Countries</div>
      </div>
      <div className="stat-item">
        <div className="stat-number">{stats.totalRoutes}</div>
        <div className="stat-label">Total Routes</div>
      </div>
      <div className="stat-item">
        <div className="stat-number">{stats.avgRoutesPerAirport}</div>
        <div className="stat-label">Avg Routes/Airport</div>
      </div>
    </div>
  );
};

// Airport Search Component
const AirportSearch: React.FC<{
  airports: Airport[];
  routes: Routes;
  onAirportClick: (airport: Airport) => void;
}> = ({ airports, routes, onAirportClick }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AirportStats[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    const trimmedQuery = searchQuery.toLowerCase().trim();

    if (trimmedQuery.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const matches = airports
      .filter(
        (airport) =>
          airport.name.toLowerCase().includes(trimmedQuery) ||
          airport.city.toLowerCase().includes(trimmedQuery) ||
          airport.country.toLowerCase().includes(trimmedQuery) ||
          airport.code.toLowerCase().includes(trimmedQuery)
      )
      .slice(0, 10)
      .map((airport) => ({
        ...airport,
        routeCount: routes[airport.code]?.length || 0,
      }));

    setResults(matches);
    setShowResults(true);
  }, [airports, routes]);

  const handleAirportClick = (airport: Airport) => {
    onAirportClick(airport);
    setQuery('');
    setShowResults(false);
  };

  // Hide results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.search-section')) {
        setShowResults(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="search-section">
      <input
        type="text"
        placeholder="Search by airport, city, or country..."
        className="info-search-input"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
      />
      <div className={`info-search-results ${showResults ? 'show' : ''}`}>
        {results.length === 0 && query.length >= 2 ? (
          <div style={{ padding: '16px', color: 'var(--text-gray)', textAlign: 'center' }}>
            No airports found
          </div>
        ) : (
          results.map((airport) => (
            <div
              key={airport.code}
              className="search-result-item"
              onClick={() => handleAirportClick(airport)}
            >
              <div className="search-result-name">
                {airport.flag} {airport.name} ({airport.code})
              </div>
              <div className="search-result-details">
                {airport.city}, {airport.country} • {airport.routeCount} routes
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Country Modal Component
const CountryModal: React.FC<{
  country: CountryStats | null;
  routes: Routes;
  onClose: () => void;
  onAirportClick: (airport: Airport) => void;
}> = ({ country, routes, onClose, onAirportClick }) => {
  if (!country) return null;

  const handleAirportClick = (airport: Airport) => {
    onAirportClick(airport);
    onClose();
  };

  const sortedAirports = country.airports
    .sort((a, b) => (routes[b.code]?.length || 0) - (routes[a.code]?.length || 0));

  return (
    <div className="country-modal">
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{country.flag} {country.name}</h2>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <p><strong>{country.airportCount}</strong> airports served by Ryanair</p>
            <div className="country-airports">
              {sortedAirports.map((airport) => {
                const routeCount = routes[airport.code]?.length || 0;
                return (
                  <div
                    key={airport.code}
                    className="country-airport-item"
                    onClick={() => handleAirportClick(airport)}
                  >
                    <div className="airport-info">
                      <div className="airport-name">{airport.name} ({airport.code})</div>
                      <div className="airport-city">{airport.city}</div>
                    </div>
                    <div className="airport-routes">{routeCount} routes</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Info Page Component
export const InfoPage: React.FC<InfoPageProps> = ({ airports, routes, onAirportClick }) => {
  const [selectedCountry, setSelectedCountry] = useState<CountryStats | null>(null);

  const handleCountryClick = (country: CountryStats) => {
    setSelectedCountry(country);
  };

  const handleCloseModal = () => {
    setSelectedCountry(null);
  };

  return (
    <>
      <div className="info-container">
        <div className="info-header">
          <h1>📊 Ryanair Network Statistics</h1>
          <p>Comprehensive overview of airports, countries, and flight connections</p>
        </div>

        <div className="info-grid">
          <div className="info-card">
            <h2>🌍 Countries</h2>
            <CountriesList
              airports={airports}
              routes={routes}
              onCountryClick={handleCountryClick}
            />
          </div>

          <div className="info-card">
            <h2>✈️ Top Airports</h2>
            <TopAirports
              airports={airports}
              routes={routes}
              onAirportClick={onAirportClick}
            />
          </div>

          <div className="info-card">
            <h2>🛫 Flight Statistics</h2>
            <FlightStats airports={airports} routes={routes} />
          </div>

          <div className="info-card">
            <h2>🔍 Search Airports</h2>
            <AirportSearch
              airports={airports}
              routes={routes}
              onAirportClick={onAirportClick}
            />
          </div>
        </div>
      </div>

      <CountryModal
        country={selectedCountry}
        routes={routes}
        onClose={handleCloseModal}
        onAirportClick={onAirportClick}
      />
    </>
  );
};
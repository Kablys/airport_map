import React, { useState, useEffect } from 'react';
import type { Airport } from '../types.ts';
// Leaflet is provided globally via CDN
declare const L: typeof import('leaflet');

interface LegendProps {
  selectedAirport?: Airport | null;
  routeCount?: string | number;
  isHover?: boolean;
  totalAirports: number;
  totalCountries: number;
  priceRange?: { min: number | null; max: number | null };
  showFlightPrices?: boolean;
}

interface FlightPricesSectionProps {
  priceRange?: { min: number | null; max: number | null };
  sourceAirport?: Airport | null;
  destAirport?: Airport | null;
  flightInfo?: {
    price: number;
    distance: number;
    flightNumber: string;
    duration: { hours: number; minutes: number };
  };
}

const FlightPricesSection: React.FC<FlightPricesSectionProps> = ({
  priceRange,
  sourceAirport,
  destAirport,
  flightInfo
}) => {
  if (sourceAirport && destAirport && flightInfo) {
    // Show specific flight information
    return (
      <div className="flight-prices-section">
        <div className="legend-section-title">
          Flight Information:
        </div>
        <div className="legend-flight-line">
          <strong>{sourceAirport.code} → {destAirport.code}</strong> ({flightInfo.flightNumber})
        </div>
        <div className="legend-flight-subtle">
          {sourceAirport.city} to {destAirport.city}
        </div>
        <div className="legend-flight-subtle">
          €{flightInfo.price} • {flightInfo.distance}km • {flightInfo.duration.hours}h {flightInfo.duration.minutes}m
        </div>
      </div>
    );
  }

  // Show general flight prices section
  return (
    <div className="flight-prices-section">
      <div className="legend-section-title">
        Flight Prices:
      </div>
      <div className="legend-gradient-row">
        <div className="price-gradient"></div>
        <span className="legend-gradient-caption">Dynamic gradient (cheapest → most expensive)</span>
      </div>
      <div className="price-range-info">
        {priceRange && priceRange.min !== null && priceRange.max !== null ? (
          priceRange.min === priceRange.max ? (
            `All routes: €${priceRange.min}`
          ) : (
            `Price range: €${priceRange.min} - €${priceRange.max}`
          )
        ) : (
          'Select an airport to see price range'
        )}
      </div>
    </div>
  );
};

const DefaultLegendItem: React.FC<{ totalAirports: number; totalCountries: number }> = ({
  totalAirports,
  totalCountries
}) => (
  <div className="default-legend-item">
    <div id="airport-count">
      <strong>{totalAirports}</strong> airports across <strong>{totalCountries}</strong> countries
    </div>
    <div className="legend-icon-row">
      <div className="legend-icon">12</div>
      <span>Airport with number of outgoing flights</span>
    </div>
  </div>
);

const SelectedAirportLegend: React.FC<{
  airport: Airport;
  routeCount: string | number;
  isHover: boolean;
}> = ({ airport, routeCount, isHover }) => {
  const hoverClass = isHover ? ' hover-state' : '';
  
  return (
    <div className={`selected-airport-legend${hoverClass}`}>
      <div className="airport-header">
        <span className="airport-flag">{airport.flag}</span>
        <strong className="airport-name">{airport.name}</strong>
        <span className="airport-code">({airport.code})</span>
      </div>
      <div className="airport-location">{airport.city}, {airport.country}</div>
      <div className="airport-coordinates">
        📍 {airport.lat.toFixed(4)}, {airport.lng.toFixed(4)}
      </div>
      <div className="airport-route-info">
        <strong>Routes:</strong> {routeCount || 0} direct destinations
      </div>
    </div>
  );
};

export const Legend: React.FC<LegendProps> = ({
  selectedAirport,
  routeCount,
  isHover = false,
  totalAirports,
  totalCountries,
  priceRange,
  showFlightPrices = false
}) => {
  return (
    <div className="legend ui-panel">
      <div className="legend-item">
        {selectedAirport ? (
          <SelectedAirportLegend
            airport={selectedAirport}
            routeCount={routeCount || 0}
            isHover={isHover}
          />
        ) : (
          <DefaultLegendItem
            totalAirports={totalAirports}
            totalCountries={totalCountries}
          />
        )}
      </div>
      
      {showFlightPrices && (
        <FlightPricesSection priceRange={priceRange} />
      )}
    </div>
  );
};

// Hook for managing legend state
export function useLegendState(totalAirports: number, totalCountries: number) {
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [routeCount, setRouteCount] = useState<string | number>(0);
  const [isHover, setIsHover] = useState(false);
  const [priceRange, setPriceRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });
  const [showFlightPrices, setShowFlightPrices] = useState(false);

  const updateSelectedAirport = (airport: Airport | null, routes?: string | number) => {
    setSelectedAirport(airport);
    setRouteCount(routes || 0);
    setShowFlightPrices(!!airport);
  };

  const updateHoverState = (airport: Airport | null, routes?: string | number, hover: boolean = false) => {
    if (airport) {
      setSelectedAirport(airport);
      setRouteCount(routes || 0);
      setIsHover(hover);
    } else {
      // Restore to selected airport or default
      setIsHover(false);
    }
  };

  const updatePriceRange = (newPriceRange: { min: number | null; max: number | null }) => {
    setPriceRange(newPriceRange);
  };

  return {
    selectedAirport,
    routeCount,
    isHover,
    priceRange,
    showFlightPrices,
    updateSelectedAirport,
    updateHoverState,
    updatePriceRange,
    setShowFlightPrices
  };
}

// Helper function to create Leaflet control with React Legend
export function createReactLegendControl(
  totalAirports: number,
  totalCountries: number,
  legendState: ReturnType<typeof useLegendState>
) {
  const legend = (L as any).control({ position: 'bottomleft' });
  
  legend.onAdd = () => {
    const div = (L as any).DomUtil.create('div', 'legend-container');
    
    // This would need a React root to render properly
    // For now, we'll use the existing DOM manipulation approach
    // but the component is ready for full React integration
    
    return div;
  };
  
  return legend;
}
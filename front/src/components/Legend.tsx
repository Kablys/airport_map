import type { Airport, PriceRange } from '../types.ts';

export interface LegendProps {
  totalAirports: number;
  totalCountries: number;
  airport?: Airport | null;
  routeCount?: number;
  isHover?: boolean;
  /** Present while an airport is selected. */
  priceRange?: PriceRange | null;
}

export function Legend({ totalAirports, totalCountries, airport, routeCount = 0, isHover, priceRange }: LegendProps) {
  return (
    <div className="legend ui-panel">
      <div className="legend-item">
        {airport ? (
          <div className={`selected-airport-legend${isHover ? ' hover-state' : ''}`}>
            <div className="airport-header">
              <span className="airport-flag">{airport.flag}</span>
              <strong className="airport-name">{airport.name}</strong>
              <span className="airport-code">({airport.code})</span>
            </div>
            <div className="airport-location">
              {airport.city}, {airport.country}
            </div>
            <div className="airport-coordinates">
              📍 {airport.lat.toFixed(4)}, {airport.lng.toFixed(4)}
            </div>
            <div className="airport-route-info">
              <strong>Routes:</strong> {routeCount} direct destinations
            </div>
          </div>
        ) : (
          <div className="default-legend-item">
            <div id="airport-count">
              <strong>{totalAirports}</strong> airports across <strong>{totalCountries}</strong> countries
            </div>
            <div className="legend-icon-row">
              <div className="legend-icon">12</div>
              <span>Airport with number of outgoing flights</span>
            </div>
          </div>
        )}
      </div>

      {priceRange && (
        <div className="flight-prices-section">
          <div className="legend-section-title">Estimated prices:</div>
          <div className="legend-gradient-row">
            <div className="price-gradient"></div>
            <span className="legend-gradient-caption">cheapest → most expensive</span>
          </div>
          <div className="price-range-info">
            {priceRange.min === priceRange.max
              ? `All routes: €${priceRange.min}`
              : `€${priceRange.min} – €${priceRange.max}`}
          </div>
          <div className="small-muted">Distance-based estimates, not live fares</div>
        </div>
      )}
    </div>
  );
}

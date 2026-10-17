import type { TileProviderKey } from '../services/map-service.ts';
import type { Airport, PriceRange } from '../types.ts';
import { TileSelector } from './TileSelector.tsx';

export interface LegendProps {
  totalAirports: number;
  totalCountries: number;
  onTileChange: (key: TileProviderKey) => void;
  airport?: Airport | null;
  routeCount?: number;
  isHover?: boolean;
  /** Present while an airport is selected. */
  priceRange?: PriceRange | null;
}

export function Legend({
  totalAirports,
  totalCountries,
  onTileChange,
  airport,
  routeCount = 0,
  isHover,
  priceRange,
}: LegendProps) {
  return (
    <div className="legend panel">
      {/* Both states are two lines tall, so hovering airports doesn't make the panel jump */}
      {airport ? (
        <div className={isHover ? 'legend-airport--hover' : undefined}>
          <div className="legend-title">
            {airport.flag} {airport.name} <span className="muted">{airport.code}</span>
          </div>
          <div className="legend-row">
            {airport.city}, {airport.country} · {routeCount} direct routes
          </div>
        </div>
      ) : (
        <div>
          <div className="legend-title">
            {totalAirports} airports · {totalCountries} countries
          </div>
          <div className="legend-row">
            <span className="legend-icon">12</span> Number of direct routes
          </div>
        </div>
      )}

      {priceRange && (
        <div className="legend-section">
          <div className="legend-row">
            <span className="price-gradient" />
            <span className="price-range-info">
              {priceRange.min === priceRange.max ? `€${priceRange.min}` : `€${priceRange.min} – €${priceRange.max}`}
            </span>
          </div>
          <div className="legend-row">Estimated from distance, not live fares</div>
        </div>
      )}

      <div className="legend-section">
        <TileSelector onTileChange={onTileChange} />
      </div>
    </div>
  );
}

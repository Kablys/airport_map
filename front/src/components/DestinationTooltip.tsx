import React from 'react';
import { createRoot } from 'react-dom/client';
import type { Airport, FlightPriceData } from '../types.ts';
// Leaflet via CDN
declare const L: typeof import('leaflet');

export interface DestinationTooltipProps {
  source: Airport;
  dest: Airport;
  price?: number;
  currency?: string;
  distanceKm?: number;
  flightNumber?: string;
}

export const DestinationTooltip: React.FC<DestinationTooltipProps> = ({
  source,
  dest,
  price,
  currency = 'EUR',
  distanceKm,
  flightNumber,
}) => {
  return (
    <div
      className="destination-tooltip"
      role="dialog"
      aria-label={`Flight info to ${dest.city || dest.name} (${dest.code})`}
    >
      <div className="destination-tooltip__title">
        {source.city || source.name} ({source.code}) → {dest.city || dest.name} ({dest.code})
      </div>

      {typeof price === 'number' && (
        <div className="destination-tooltip__row">
          <span className="destination-tooltip__label">Price</span>
          <span>
            €{price}
            {currency && currency !== 'EUR' ? ` ${currency}` : ''}
          </span>
        </div>
      )}

      {typeof distanceKm === 'number' && (
        <div className="destination-tooltip__row">
          <span className="destination-tooltip__label">Distance</span>
          <span>{Math.round(distanceKm)} km</span>
        </div>
      )}

      {flightNumber && (
        <div className="destination-tooltip__row">
          <span className="destination-tooltip__label">Flight</span>
          <span>{flightNumber}</span>
        </div>
      )}
    </div>
  );
};

export function createDestinationTooltip(
  latlng: [number, number],
  props: DestinationTooltipProps
): L.Tooltip {
  const container = document.createElement('div');
  const root = createRoot(container);
  root.render(React.createElement(DestinationTooltip, props));

  if ((L as any).DomEvent) {
    (L as any).DomEvent.disableClickPropagation(container);
    (L as any).DomEvent.disableScrollPropagation(container);
  }

  const tooltip = (L as any)
    .tooltip({
      direction: 'auto',
      className: 'react-destination-tooltip',
      opacity: 0.95,
      offset: [0, -8],
    })
    .setLatLng(latlng)
    .setContent(container);

  return tooltip as L.Tooltip;
}

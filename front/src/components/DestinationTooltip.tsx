import React from 'react';
import { createRoot } from 'react-dom/client';
import type { Airport, FlightPriceData, ClimateData } from '../types.ts';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const DestinationTooltip: React.FC<DestinationTooltipProps> = ({
  source,
  dest,
  price,
  currency = 'EUR',
  distanceKm,
  flightNumber,
}) => {
  console.log("Rendering DestinationTooltip for", dest.code);
  console.log("Climate data:", dest.climate);

  const chartData = dest.climate?.map(d => ({
    name: monthNames[d.date - 1],
    Temp: d.avg_temp.toFixed(1),
    Precip: d.total_precip.toFixed(1),
  }));

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

      <hr />

      {dest.elevation && (
        <div className="destination-tooltip__row">
          <span className="destination-tooltip__label">Elevation</span>
          <span>{dest.elevation} m</span>
        </div>
      )}

      {dest.timezone && (
        <div className="destination-tooltip__row">
          <span className="destination-tooltip__label">Timezone</span>
          <span>{dest.timezone}</span>
        </div>
      )}

      {chartData && (
        <div className="destination-tooltip__chart">
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 5, left: -20 }}>
              <XAxis dataKey="name" fontSize={10} />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" fontSize={10} />
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" fontSize={10} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <Bar yAxisId="left" dataKey="Temp" fill="#8884d8" name="Avg Temp (°C)" />
              <Bar yAxisId="right" dataKey="Precip" fill="#82ca9d" name="Precip (mm)" />
            </BarChart>
          </ResponsiveContainer>
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

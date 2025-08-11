import React from 'react';
import { createRoot } from 'react-dom/client';
import type { Airport, FlightPriceData } from '../types.ts';
// Since Leaflet is loaded via CDN, declare global L type
declare const L: typeof import('leaflet');

// FlightPriceData shape comes from types.ts

interface PriceLabelProps {
  price: number;
  currency?: string;
  lineColor: string;
  destinationCode: string;
  className?: string;
}

export const PriceLabel: React.FC<PriceLabelProps> = ({ 
  price, 
  currency = 'EUR',
  lineColor,
  destinationCode,
  className = ''
}) => {
  const priceText = `€${price}`;
  const textWidth = priceText.length * 6 + 8;

  // Use CSS variables consumed by .price-label in components.css
  const style = {
    ['--label-bg' as any]: lineColor,
    ['--label-width' as any]: `${Math.max(textWidth, 40)}px`,
  } as React.CSSProperties;

  return (
    <div 
      className={`price-label ${className}`}
      style={style}
      data-dest-code={destinationCode}
    >
      {priceText}
    </div>
  );
};

// Helper function to create Leaflet marker from React component
export function createPriceLabelMarker(
  sourceAirport: Airport,
  destAirport: Airport,
  priceData: Pick<FlightPriceData, 'price'>,
  lineColor: string,
  onPriceClick?: () => void,
  onPriceHover?: (isHovering: boolean) => void
): L.Marker | null {
  // Position price label very close to destination airport (90% of the way)
  const labelLat = sourceAirport.lat + (destAirport.lat - sourceAirport.lat) * 0.9;
  const labelLng = sourceAirport.lng + (destAirport.lng - sourceAirport.lng) * 0.9;

  const priceText = `€${priceData.price}`;
  const textWidth = priceText.length * 6 + 8;
  const textHeight = 18;

  // Create a container and render React PriceLabel into it
  const container = document.createElement('div');
  const root = createRoot(container);
  root.render(
    React.createElement(PriceLabel, {
      price: priceData.price,
      lineColor,
      destinationCode: destAirport.code,
    })
  );

  const priceLabel = (L as any).marker([labelLat, labelLng], {
    icon: (L as any).divIcon({
      className: 'price-label-marker',
      html: container,
      iconSize: [Math.max(textWidth, 40), textHeight],
      iconAnchor: [Math.max(textWidth, 40) / 2, textHeight / 2],
    }),
  });

  // Ensure React root is unmounted when the marker is removed
  priceLabel.on('remove', () => {
    try { root.unmount(); } catch {}
  });

  // Add event handlers
  if (onPriceClick) {
    priceLabel.on('click', onPriceClick);
  }

  if (onPriceHover) {
    priceLabel.on('mouseover', () => onPriceHover(true));
    priceLabel.on('mouseout', () => onPriceHover(false));
  }

  return priceLabel;
}
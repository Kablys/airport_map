import React from 'react';
import type { Airport } from '../types.ts';
// Since Leaflet is loaded via CDN, declare global L type
declare const L: typeof import('leaflet');

interface FlightPriceData {
  price: number;
  currency: string;
  lastUpdated: number;
  estimated: boolean;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  departureDate: string;
  aircraft: string;
  note: string;
}

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

  const style: React.CSSProperties = {
    backgroundColor: lineColor,
    width: `${Math.max(textWidth, 40)}px`,
    minWidth: '40px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '3px',
    color: 'white',
    fontSize: '11px',
    fontWeight: 'bold',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  };

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
  priceData: FlightPriceData,
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

  // Create HTML for the price label
  const priceLabelHTML = `
    <div class="price-label" 
         style="background-color: ${lineColor}; 
                width: ${Math.max(textWidth, 40)}px; 
                height: ${textHeight}px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 3px;
                color: white;
                font-size: 11px;
                font-weight: bold;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
                cursor: pointer;
                user-select: none;
                transition: transform 0.2s ease, box-shadow 0.2s ease;"
         data-dest-code="${destAirport.code}">
      ${priceText}
    </div>
  `;

  const priceLabel = (L as any).marker([labelLat, labelLng], {
    icon: (L as any).divIcon({
      className: 'price-label-marker',
      html: priceLabelHTML,
      iconSize: [Math.max(textWidth, 40), textHeight],
      iconAnchor: [Math.max(textWidth, 40) / 2, textHeight / 2],
    }),
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
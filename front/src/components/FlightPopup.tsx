import React from 'react';
import type { Airport } from '../main.ts';

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

interface FlightPopupProps {
  sourceAirport: Airport;
  destAirport: Airport;
  priceData: FlightPriceData;
  distance: number;
  lineColor: string;
  flightDuration: number;
  onBookClick?: () => void;
  onCopyClick?: () => void;
}

export const FlightPopup: React.FC<FlightPopupProps> = ({
  sourceAirport,
  destAirport,
  priceData,
  distance,
  lineColor,
  flightDuration,
  onBookClick,
  onCopyClick
}) => {
  const formatFlightDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return { hours, minutes: mins };
  };

  const { hours, minutes } = formatFlightDuration(flightDuration);
  const departureTime = priceData?.departureTime || new Date().toISOString();
  const arrivalTime = priceData?.arrivalTime || null;
  const flightNumber = priceData?.flightNumber || `FR${Math.floor(1000 + Math.random() * 8000)}`;

  const handleBookClick = () => {
    if (onBookClick) {
      onBookClick();
    } else {
      const bookingUrl = `https://www.ryanair.com/gb/en/trip/flights/select?adults=1&teens=0&children=0&infants=0&dateOut=${new Date().toISOString().split('T')[0] || ''
        }&originIata=${sourceAirport.code}&destinationIata=${destAirport.code}&isConnectedFlight=false&discount=0`;
      window.open(bookingUrl, '_blank');
    }
  };

  const handleCopyClick = () => {
    if (onCopyClick) {
      onCopyClick();
    } else {
      const copyText = `${sourceAirport.code} to ${destAirport.code} - €${priceData?.price || 'N/A'} - Flight ${flightNumber}`;
      navigator.clipboard?.writeText(copyText);
    }
  };

  return (
    <div className="flight-popup ryanair-colors">
      <div className="flight-popup-header">
        <h4>✈️ {sourceAirport.code} → {destAirport.code}</h4>
        <div className="route-cities">
          {sourceAirport.city} to {destAirport.city}
        </div>
      </div>

      <div className="flight-info-grid">
        <div>
          <strong>Departure</strong><br />
          <span className="departure-name airport-name">
            {sourceAirport.flag} {sourceAirport.name}
          </span><br />
          <span className="departure-country airport-country">
            {sourceAirport.country}
          </span>
        </div>
        <div>
          <strong>Arrival</strong><br />
          <span className="arrival-name airport-name">
            {destAirport.flag} {destAirport.name}
          </span><br />
          <span className="arrival-country airport-country">
            {destAirport.country}
          </span>
        </div>
      </div>

      <div className="flight-details">
        <div>
          <strong className="flight-number">Flight {flightNumber}</strong><br />
          <span className="aircraft">Boeing 737-800</span>
        </div>
        <div className="price">
          <strong className="price-display" style={{ color: lineColor }}>
            {priceData.estimated ? (
              <>
                €{priceData.price}{' '}
                <span
                  style={{ cursor: 'help', color: 'var(--price-medium)' }}
                  title="📊 Estimated Price - Based on route distance. Actual prices may vary by date and availability"
                >
                  ⓘ
                </span>
              </>
            ) : (
              `€${priceData.price}`
            )}
          </strong><br />
          <span className="price-note">per person</span>
        </div>
      </div>

      <div className="flight-stats">
        <div>
          <strong>Distance</strong><br />
          <span className="distance">{distance} km</span>
        </div>
        <div>
          <strong>Duration</strong><br />
          <span className="duration">{hours}h {minutes}m</span>
        </div>
        <div>
          <strong>Aircraft</strong><br />
          <span>737-800</span>
        </div>
      </div>

      {priceData && !priceData.estimated && (
        <div className="live-price-info">
          <div>
            <strong>Live Price</strong> - Updated{' '}
            <span className="update-time">
              {new Date(priceData.lastUpdated).toLocaleTimeString()}
            </span><br />
            <span className="flight-times">
              {arrivalTime
                ? `Departure: ${new Date(departureTime).toLocaleTimeString()} | Arrival: ${new Date(arrivalTime).toLocaleTimeString()}`
                : `Next departure: ${new Date().toISOString().split('T')[0] || ''}`
              }
            </span>
          </div>
        </div>
      )}

      <div className="flight-buttons">
        <button className="book-button btn-book" onClick={handleBookClick}>
          🎫 Book on Ryanair
        </button>
        <button className="copy-button btn-copy" onClick={handleCopyClick}>
          📋 Copy
        </button>
      </div>
    </div>
  );
};


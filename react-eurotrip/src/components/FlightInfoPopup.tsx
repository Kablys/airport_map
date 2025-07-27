import React, { useState } from 'react';
import { RouteLine } from '../types';
import { formatPrice } from '../utils/priceUtils';

interface FlightInfoPopupProps {
  route: RouteLine;
  onClose?: () => void;
}

/**
 * Comprehensive flight information popup component
 * Features detailed flight information, booking links, and copy functionality
 */
const FlightInfoPopup: React.FC<FlightInfoPopupProps> = ({ route, onClose }) => {
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  if (!route.price) return null;

  const price = route.price;
  const estimatedText = price.estimated ? ' (estimated)' : '';
  const lastUpdated = new Date(price.lastUpdated).toLocaleString();

  // Calculate flight duration from departure and arrival times
  const calculateDuration = (): string => {
    if (!price.departureTime || !price.arrivalTime) {
      // Fallback: estimate duration based on distance (rough calculation)
      const estimatedHours = Math.round(route.distance / 800 * 100) / 100;
      return `~${estimatedHours}h`;
    }

    const departure = new Date(price.departureTime);
    const arrival = new Date(price.arrivalTime);
    const durationMs = arrival.getTime() - departure.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  // Format time for display
  const formatTime = (timeString: string): string => {
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'UTC'
      });
    } catch {
      return timeString;
    }
  };

  // Format date for display
  const formatDate = (timeString: string): string => {
    try {
      const date = new Date(timeString);
      return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC'
      });
    } catch {
      return '';
    }
  };

  // Generate aircraft type based on route distance (realistic estimation)
  const getAircraftType = (): string => {
    if (route.distance < 800) {
      return 'Boeing 737-800';
    } else if (route.distance < 1500) {
      return 'Boeing 737 MAX 8';
    } else {
      return 'Boeing 737-800';
    }
  };

  // Handle booking redirect to Ryanair
  const handleBooking = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dateOut = tomorrow.toISOString().split('T')[0];

    const bookingUrl = `https://www.ryanair.com/gb/en/trip/flights/select?adults=1&teens=0&children=0&infants=0&dateOut=${dateOut}&originIata=${route.source.code}&destinationIata=${route.destination.code}&isConnectedFlight=false&discount=0&promoCode=`;
    window.open(bookingUrl, '_blank', 'noopener,noreferrer');
  };

  // Handle copying flight details to clipboard
  const handleCopy = async () => {
    const flightDetails = `
🛫 Flight Details
${route.source.city} (${route.source.code}) → ${route.destination.city} (${route.destination.code})

💰 Price: ${formatPrice(price)}${estimatedText}
📏 Distance: ${Math.round(route.distance)} km
⏱️ Duration: ${calculateDuration()}
✈️ Aircraft: ${getAircraftType()}
${price.flightNumber ? `🔢 Flight: ${price.flightNumber}` : ''}
${price.departureTime ? `🕐 Departure: ${formatDate(price.departureTime)} ${formatTime(price.departureTime)}` : ''}
${price.arrivalTime ? `🕑 Arrival: ${formatDate(price.arrivalTime)} ${formatTime(price.arrivalTime)}` : ''}

📅 Updated: ${lastUpdated}
${price.note ? `📝 Note: ${price.note}` : ''}

Book at: https://www.ryanair.com
    `.trim();

    try {
      await navigator.clipboard.writeText(flightDetails);
      setCopySuccess('Copied to clipboard!');
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setCopySuccess('Copy failed');
      setTimeout(() => setCopySuccess(null), 2000);
    }
  };

  return (
    <div className="flight-info-popup min-w-[320px] max-w-[400px] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-ryanair-blue to-blue-600 text-white p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-bold text-lg leading-tight">
              {route.source.city} → {route.destination.city}
            </h3>
            <p className="text-blue-100 text-sm mt-1">
              {route.source.name} ({route.source.code}) to {route.destination.name} ({route.destination.code})
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-2 text-blue-100 hover:text-white transition-colors p-1"
              aria-label="Close popup"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Flight Details Section */}
      <div className="p-4 space-y-4">
        {/* Price Display */}
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="font-semibold text-gray-700">Flight Price</span>
          <div className="text-right">
            <span 
              className="text-2xl font-bold"
              style={{ color: route.color }}
            >
              {formatPrice(price)}
            </span>
            {price.estimated && (
              <span className="text-sm text-gray-500 block">estimated</span>
            )}
          </div>
        </div>

        {/* Flight Information Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-500 block">Distance</span>
              <span className="text-lg font-semibold text-gray-900">{Math.round(route.distance)} km</span>
            </div>
            
            <div>
              <span className="text-sm font-medium text-gray-500 block">Duration</span>
              <span className="text-lg font-semibold text-gray-900">{calculateDuration()}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-500 block">Aircraft Type</span>
              <span className="text-lg font-semibold text-gray-900">{getAircraftType()}</span>
            </div>

            {price.flightNumber && (
              <div>
                <span className="text-sm font-medium text-gray-500 block">Flight Number</span>
                <span className="text-lg font-semibold text-gray-900">{price.flightNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Schedule Information */}
        {price.departureTime && price.arrivalTime && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="font-semibold text-gray-700 mb-3">Schedule</h4>
            <div className="flex justify-between items-center">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500">Departure</div>
                <div className="text-lg font-bold text-gray-900">{formatTime(price.departureTime)}</div>
                <div className="text-sm text-gray-600">{formatDate(price.departureTime)}</div>
              </div>
              
              <div className="flex-1 mx-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-2 text-gray-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500">Arrival</div>
                <div className="text-lg font-bold text-gray-900">{formatTime(price.arrivalTime)}</div>
                <div className="text-sm text-gray-600">{formatDate(price.arrivalTime)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Additional Information */}
        {price.note && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800">Note</p>
                <p className="text-sm text-yellow-700">{price.note}</p>
              </div>
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="text-xs text-gray-500 text-center border-t border-gray-100 pt-3">
          Last updated: {lastUpdated}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-gray-50 px-4 py-3 flex gap-3">
        <button
          onClick={handleBooking}
          className="flex-1 bg-ryanair-blue text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Book on Ryanair
        </button>
        
        <button
          onClick={handleCopy}
          className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center gap-2 relative"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
          
          {/* Copy Success Indicator */}
          {copySuccess && (
            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              {copySuccess}
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default FlightInfoPopup;
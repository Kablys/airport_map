import React from 'react';
import { Airport } from '../types';

interface AirportInfoProps {
  selectedAirport: Airport | null;
}

/**
 * Component to show selected airport details
 * Displays airport information including name, location, and code
 */
const AirportInfo: React.FC<AirportInfoProps> = ({ selectedAirport }) => {
  if (!selectedAirport) {
    return null;
  }

  return (
    <div className="bg-ryanair-blue/5 rounded-lg p-3 border border-ryanair-blue/20">
      <h3 className="text-sm font-medium text-ryanair-blue mb-3 flex items-center gap-2">
        ✈️ Airport Details
      </h3>
      
      <div className="space-y-2">
        {/* Airport Name and Code */}
        <div>
          <div className="font-semibold text-gray-900 text-sm">
            {selectedAirport.name}
          </div>
          <div className="text-xs text-gray-600">
            Code: <span className="font-mono font-medium">{selectedAirport.code}</span>
          </div>
        </div>

        {/* Location Information */}
        <div className="grid grid-cols-1 gap-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">🏙️ City:</span>
            <span className="font-medium">{selectedAirport.city}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">🌍 Country:</span>
            <span className="font-medium">{selectedAirport.country}</span>
          </div>
        </div>

        {/* Coordinates */}
        <div className="pt-2 border-t border-ryanair-blue/10">
          <div className="text-xs text-gray-600">Coordinates:</div>
          <div className="text-xs font-mono text-gray-700">
            {selectedAirport.lat.toFixed(4)}°, {selectedAirport.lng.toFixed(4)}°
          </div>
        </div>

        {/* Action Hint */}
        <div className="pt-2 border-t border-ryanair-blue/10">
          <div className="text-xs text-gray-500 italic">
            Click the airport again to deselect
          </div>
        </div>
      </div>
    </div>
  );
};

export default AirportInfo;
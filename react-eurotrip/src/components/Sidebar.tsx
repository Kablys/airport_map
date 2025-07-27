import React from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { useMap } from '../hooks/useMap';
import PriceRangeDisplay from './PriceRangeDisplay';
import AirportInfo from './AirportInfo';

/**
 * Sidebar component with airport statistics display and controls
 * Shows statistics, price range, and selected airport information
 */
const Sidebar: React.FC = () => {
  const { state } = useAppContext();
  const { priceRange, routeLines } = useMap();

  // Calculate statistics
  const totalAirports = state.airports.length;
  const totalCountries = new Set(state.airports.map(airport => airport.country)).size;
  const totalRoutes = Object.values(state.routes).reduce((sum, routes) => sum + routes.length, 0);
  const selectedRoutes = state.selectedAirport ? (state.routes[state.selectedAirport.code]?.length || 0) : 0;

  return (
    <div className="absolute top-4 right-4 z-controls bg-white/95 backdrop-blur-sm rounded-lg shadow-lg w-80 max-h-[calc(100vh-2rem)] overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-ryanair-blue flex items-center gap-2">
          📊 Flight Statistics
        </h2>
      </div>

      {/* Statistics Panel */}
      <div className="p-4 space-y-4">
        {/* Overall Statistics */}
        <div className="bg-gray-50 rounded-lg p-3">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Network Overview</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-ryanair-blue">{totalAirports}</div>
              <div className="text-gray-600">Airports</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-ryanair-blue">{totalCountries}</div>
              <div className="text-gray-600">Countries</div>
            </div>
          </div>
          <div className="mt-3 text-center">
            <div className="text-xl font-bold text-ryanair-blue">{totalRoutes}</div>
            <div className="text-gray-600 text-sm">Total Routes</div>
          </div>
        </div>

        {/* Selected Airport Routes */}
        {state.selectedAirport && (
          <div className="bg-ryanair-blue/5 rounded-lg p-3 border border-ryanair-blue/20">
            <h3 className="text-sm font-medium text-ryanair-blue mb-2">Selected Airport</h3>
            <div className="text-center">
              <div className="text-2xl font-bold text-ryanair-blue">{selectedRoutes}</div>
              <div className="text-gray-600 text-sm">Direct Routes</div>
            </div>
          </div>
        )}

        {/* Price Range Display */}
        <PriceRangeDisplay priceRange={priceRange} routeLines={routeLines} />

        {/* Airport Information */}
        <AirportInfo selectedAirport={state.selectedAirport} />

        {/* Instructions */}
        {!state.selectedAirport && (
          <div className="bg-ryanair-yellow/10 rounded-lg p-3 border border-ryanair-yellow/30">
            <p className="text-sm text-gray-700">
              <span className="font-medium">💡 Tip:</span> Click on any airport marker to view direct routes and pricing information.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
import React from 'react';
import { useAllData } from '../hooks/useData';
import { getFlightPrice } from '../services/apiService';

/**
 * Example component demonstrating data loading functionality
 * This shows how to use the useAllData hook with loading states and error handling
 */
export const DataExample: React.FC = () => {
  const { airports, routes, loading, error, refetch } = useAllData();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg text-gray-600">Loading airports and routes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-red-800 font-semibold mb-2">Error loading data:</div>
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!airports || !routes) {
    return (
      <div className="p-8 text-gray-600">
        No data available
      </div>
    );
  }

  // Calculate some statistics
  const totalAirports = airports.length;
  const totalRoutes = Object.values(routes).reduce((sum, destinations) => sum + destinations.length, 0);
  const countriesCount = new Set(airports.map(airport => airport.country)).size;

  // Get sample airports from different countries
  const sampleAirports = airports.slice(0, 5);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-ryanair-blue mb-6">
        🛫 Eurotrip Data Overview
      </h2>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-2xl font-bold text-ryanair-blue">{totalAirports}</div>
          <div className="text-sm text-gray-600">Total Airports</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="text-2xl font-bold text-ryanair-yellow">{totalRoutes}</div>
          <div className="text-sm text-gray-600">Total Routes</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-2xl font-bold text-green-600">{countriesCount}</div>
          <div className="text-sm text-gray-600">Countries</div>
        </div>
      </div>

      {/* Sample Airports */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Sample Airports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sampleAirports.map((airport) => (
            <div key={airport.code} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="font-semibold text-ryanair-blue">{airport.code}</div>
              <div className="text-sm font-medium">{airport.name}</div>
              <div className="text-xs text-gray-600">{airport.city}, {airport.country}</div>
              <div className="text-xs text-gray-500 mt-1">
                Routes: {routes[airport.code]?.length || 0}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={refetch}
          className="px-4 py-2 bg-ryanair-blue text-white rounded hover:bg-blue-700 transition-colors"
        >
          Refresh Data
        </button>
        <button
          onClick={() => console.log('Airports:', airports, 'Routes:', routes)}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        >
          Log Data to Console
        </button>
        <button
          onClick={async () => {
            if (airports.length >= 2) {
              const price = await getFlightPrice(airports[0].code, airports[1].code, airports[0], airports[1]);
              console.log('Flight price test:', price);
            }
          }}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
        >
          Test API Service
        </button>
      </div>
    </div>
  );
};
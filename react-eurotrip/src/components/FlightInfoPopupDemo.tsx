import React, { useState } from 'react';
import FlightInfoPopup from './FlightInfoPopup';
import { RouteLine, FlightPrice } from '../types';

/**
 * Demo component to showcase the FlightInfoPopup functionality
 * This component demonstrates all the features implemented in task 11
 */
const FlightInfoPopupDemo: React.FC = () => {
  const [showPopup, setShowPopup] = useState(false);

  // Sample flight data demonstrating all popup features
  const sampleFlightPrice: FlightPrice = {
    price: 149.99,
    currency: 'EUR',
    lastUpdated: Date.now(),
    estimated: false,
    flightNumber: 'FR8901',
    departureTime: '2024-01-25T09:15:00Z',
    arrivalTime: '2024-01-25T12:45:00Z',
    note: 'Live price from Ryanair API',
  };

  const sampleRoute: RouteLine = {
    id: 'LIS-VIE',
    source: {
      code: 'LIS',
      name: 'Lisbon Portela Airport',
      city: 'Lisbon',
      country: 'Portugal',
      lat: 38.7813,
      lng: -9.1363,
    },
    destination: {
      code: 'VIE',
      name: 'Vienna International Airport',
      city: 'Vienna',
      country: 'Austria',
      lat: 48.1103,
      lng: 16.5697,
    },
    price: sampleFlightPrice,
    distance: 1876,
    color: '#ff8800',
  };

  const estimatedRoute: RouteLine = {
    ...sampleRoute,
    id: 'LIS-VIE-estimated',
    price: {
      ...sampleFlightPrice,
      price: 89.99,
      estimated: true,
      departureTime: undefined,
      arrivalTime: undefined,
      note: 'Estimated price based on route distance',
    },
    color: '#00cc44',
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-ryanair-blue mb-8">
          Flight Information Popup Demo
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Task 11 Implementation Features</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Detailed popup component with comprehensive flight information layout
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Flight details including price, duration, aircraft type, and booking links
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Responsive popup design with proper typography and spacing
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              "Book on Ryanair" and "Copy" functionality buttons
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Integration with PriceLabels and RouteLines components
            </li>
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Live Price Example</h3>
            <p className="text-gray-600 mb-4">
              Demonstrates popup with real-time pricing, flight schedule, and booking functionality.
            </p>
            <button
              onClick={() => setShowPopup(true)}
              className="bg-ryanair-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Show Flight Popup
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Estimated Price Example</h3>
            <p className="text-gray-600 mb-4">
              Shows popup with estimated pricing when live data is unavailable.
            </p>
            <FlightInfoPopup route={estimatedRoute} />
          </div>
        </div>

        {showPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="relative">
              <FlightInfoPopup 
                route={sampleRoute} 
                onClose={() => setShowPopup(false)}
              />
            </div>
          </div>
        )}

        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Technical Implementation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Component Features</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Responsive design with Tailwind CSS</li>
                <li>• Accessibility features (ARIA labels, keyboard navigation)</li>
                <li>• Dynamic aircraft type based on route distance</li>
                <li>• Flight duration calculation from schedule data</li>
                <li>• Price color coding integration</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">User Actions</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Book on Ryanair - Opens booking page in new tab</li>
                <li>• Copy - Copies comprehensive flight details to clipboard</li>
                <li>• Close - Dismisses popup (when onClose provided)</li>
                <li>• Hover effects - Enhanced visual feedback</li>
                <li>• Error handling - Graceful fallbacks for missing data</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlightInfoPopupDemo;
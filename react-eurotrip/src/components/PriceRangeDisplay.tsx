import React from 'react';
import { RouteLine } from '../types';

interface PriceRangeDisplayProps {
  priceRange: { min: number; max: number } | null;
  routeLines: RouteLine[];
}

/**
 * Component to display current route pricing information
 * Shows price range, color coding legend, and route statistics
 */
const PriceRangeDisplay: React.FC<PriceRangeDisplayProps> = ({ priceRange, routeLines }) => {
  // Calculate actual price statistics from route lines
  const routesWithPrices = routeLines.filter(route => route.price && !route.price.estimated);
  const actualPrices = routesWithPrices.map(route => route.price!.price);
  
  const actualMin = actualPrices.length > 0 ? Math.min(...actualPrices) : null;
  const actualMax = actualPrices.length > 0 ? Math.max(...actualPrices) : null;
  const averagePrice = actualPrices.length > 0 ? Math.round(actualPrices.reduce((sum, price) => sum + price, 0) / actualPrices.length) : null;

  // Count routes by price category
  const cheapRoutes = actualPrices.filter(price => price <= 100).length;
  const mediumRoutes = actualPrices.filter(price => price > 100 && price <= 200).length;
  const expensiveRoutes = actualPrices.filter(price => price > 200).length;

  if (!priceRange && routeLines.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Route Pricing</h3>
      
      {routeLines.length > 0 ? (
        <div className="space-y-3">
          {/* Price Statistics */}
          {actualPrices.length > 0 && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-semibold text-price-green">€{actualMin}</div>
                <div className="text-gray-600">Cheapest</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-700">€{averagePrice}</div>
                <div className="text-gray-600">Average</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-price-red">€{actualMax}</div>
                <div className="text-gray-600">Most Expensive</div>
              </div>
            </div>
          )}

          {/* Price Color Legend */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-700">Price Categories:</div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-1 bg-price-green rounded"></div>
                  <span>Budget (≤€100)</span>
                </div>
                <span className="font-medium">{cheapRoutes} routes</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-1 bg-price-orange rounded"></div>
                  <span>Medium (€101-200)</span>
                </div>
                <span className="font-medium">{mediumRoutes} routes</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-1 bg-price-red rounded"></div>
                  <span>Premium (&gt;€200)</span>
                </div>
                <span className="font-medium">{expensiveRoutes} routes</span>
              </div>
            </div>
          </div>

          {/* Loading indicator for routes without prices */}
          {routeLines.length > routesWithPrices.length && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <div className="animate-spin w-3 h-3 border border-gray-300 border-t-ryanair-blue rounded-full"></div>
              Loading prices for {routeLines.length - routesWithPrices.length} routes...
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-gray-500 text-center py-2">
          Select an airport to view route pricing
        </div>
      )}
    </div>
  );
};

export default PriceRangeDisplay;
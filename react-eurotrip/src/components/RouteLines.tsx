import React, { useEffect, useState, useMemo } from 'react';
import { Polyline, Popup } from 'react-leaflet';
import { useAppContext } from '../hooks/useAppContext';
import { useMap } from '../hooks/useMap';
import { getFlightPrice } from '../services/apiService';
import { RouteLine, FlightPrice } from '../types';
import { getPriceColor, getRouteWeight, getRouteOpacity, calculatePriceRange } from '../utils/priceUtils';
import FlightInfoPopup from './FlightInfoPopup';

/**
 * RouteLines component to display flight routes as polylines
 * Features dynamic price-based color gradient and proper styling
 */
const RouteLines: React.FC = () => {
  const { state } = useAppContext();
  const { routeLines } = useMap();
  const [routesWithPrices, setRoutesWithPrices] = useState<RouteLine[]>([]);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);
  const [hoveredRouteId, setHoveredRouteId] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteLine | null>(null);



  /**
   * Fetch prices for all route lines
   */
  useEffect(() => {
    if (!routeLines.length || !state.selectedAirport) {
      setRoutesWithPrices([]);
      setPriceRange(null);
      return;
    }

    const fetchPricesForRoutes = async () => {
      const updatedRoutes: RouteLine[] = [];
      const prices: number[] = [];

      // Fetch prices for all routes
      for (const route of routeLines) {
        try {
          const priceData = await getFlightPrice(
            route.source.code,
            route.destination.code,
            route.source,
            route.destination
          );

          if (priceData) {
            const updatedRoute: RouteLine = {
              ...route,
              price: priceData,
              color: '#00cc44', // Will be updated after price range calculation
            };
            updatedRoutes.push(updatedRoute);
            prices.push(priceData.price);
          } else {
            // Keep route without price data
            updatedRoutes.push(route);
          }
        } catch (error) {
          console.warn(`Failed to fetch price for route ${route.id}:`, error);
          // Keep route without price data
          updatedRoutes.push(route);
        }
      }

      // Calculate price range using utility function
      if (prices.length > 0) {
        const priceObjects = updatedRoutes
          .map(route => route.price)
          .filter(Boolean) as FlightPrice[];
        
        const priceRangeStats = calculatePriceRange(priceObjects);
        if (priceRangeStats) {
          setPriceRange({ min: priceRangeStats.min, max: priceRangeStats.max });

          // Update route colors based on price range
          const routesWithColors = updatedRoutes.map(route => {
            if (route.price) {
              return {
                ...route,
                color: getPriceColor(route.price.price, priceRangeStats.min, priceRangeStats.max),
              };
            }
            return route;
          });

          setRoutesWithPrices(routesWithColors);
        }
      } else {
        setRoutesWithPrices(updatedRoutes);
        setPriceRange(null);
      }
    };

    fetchPricesForRoutes();
  }, [routeLines, state.selectedAirport]);

  /**
   * Listen for price hover events from PriceLabels component
   */
  useEffect(() => {
    const handlePriceHover = (event: CustomEvent) => {
      const { routeId, isEntering } = event.detail;
      setHoveredRouteId(isEntering ? routeId : null);
    };

    window.addEventListener('priceHover', handlePriceHover as EventListener);
    return () => {
      window.removeEventListener('priceHover', handlePriceHover as EventListener);
    };
  }, []);

  /**
   * Memoized route line components for performance
   */
  const routeLineComponents = useMemo(() => {
    if (!routesWithPrices.length || !priceRange) return null;

    return routesWithPrices.map((route) => {
      if (!route.price) return null;

      const positions: [number, number][] = [
        [route.source.lat, route.source.lng],
        [route.destination.lat, route.destination.lng],
      ];

      const weight = getRouteWeight(route.price.price, priceRange.min, priceRange.max);
      const isHovered = hoveredRouteId === route.id;
      const opacity = getRouteOpacity(true, isHovered);
      const displayWeight = isHovered ? weight + 2 : weight;

      return (
        <Polyline
          key={route.id}
          positions={positions}
          color={route.color}
          weight={displayWeight}
          opacity={opacity}
          className="route-line"
          eventHandlers={{
            mouseover: (e) => {
              setHoveredRouteId(route.id);
              const layer = e.target;
              layer.setStyle({
                weight: weight + 2,
                opacity: 0.9,
              });
              // Trigger hover effect on price label
              const event = new CustomEvent('routeHover', {
                detail: { routeId: route.id, isEntering: true }
              });
              window.dispatchEvent(event);
            },
            mouseout: (e) => {
              setHoveredRouteId(null);
              const layer = e.target;
              layer.setStyle({
                weight: weight,
                opacity: getRouteOpacity(true),
              });
              // Remove hover effect from price label
              const event = new CustomEvent('routeHover', {
                detail: { routeId: route.id, isEntering: false }
              });
              window.dispatchEvent(event);
            },
            click: () => {
              // Set selected route for popup display
              setSelectedRoute(route);
              
              // Also trigger click on corresponding price label for consistency
              const event = new CustomEvent('routeClick', {
                detail: { routeId: route.id }
              });
              window.dispatchEvent(event);
            },
          }}
        >
          {selectedRoute?.id === route.id && (
            <Popup
              className="flight-info-popup-container"
              eventHandlers={{
                remove: () => setSelectedRoute(null),
              }}
            >
              <FlightInfoPopup 
                route={route} 
                onClose={() => setSelectedRoute(null)}
              />
            </Popup>
          )}
        </Polyline>
      );
    }).filter(Boolean);
  }, [routesWithPrices, priceRange, hoveredRouteId, selectedRoute]);

  // Don't render anything if no routes or selected airport
  if (!state.selectedAirport || !routeLines.length) {
    return null;
  }

  return (
    <>
      {routeLineComponents}
    </>
  );
};

export default RouteLines;
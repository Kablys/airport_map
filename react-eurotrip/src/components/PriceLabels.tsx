import React, { useMemo, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import { useAppContext } from '../hooks/useAppContext';
import { useMap } from '../hooks/useMap';
import { formatPrice, getPriceColor, getPriceCategory } from '../utils/priceUtils';
import { RouteLine, FlightPrice } from '../types';
import FlightInfoPopup from './FlightInfoPopup';

/**
 * PriceLabels component to display prices on route midpoints
 * Features synchronized hover animations and click handlers for flight details
 */
const PriceLabels: React.FC = () => {
  const { state } = useAppContext();
  const { routeLines } = useMap();
  const [hoveredRouteId, setHoveredRouteId] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteLine | null>(null);

  /**
   * Listen for route hover events from RouteLines component
   */
  React.useEffect(() => {
    const handleRouteHover = (event: CustomEvent) => {
      const { routeId, isEntering } = event.detail;
      setHoveredRouteId(isEntering ? routeId : null);
    };

    const handleRouteClick = (event: CustomEvent) => {
      const { routeId } = event.detail;
      const route = routeLines.find(r => r.id === routeId);
      if (route && route.price) {
        setSelectedRoute(route);
      }
    };

    window.addEventListener('routeHover', handleRouteHover as EventListener);
    window.addEventListener('routeClick', handleRouteClick as EventListener);
    
    return () => {
      window.removeEventListener('routeHover', handleRouteHover as EventListener);
      window.removeEventListener('routeClick', handleRouteClick as EventListener);
    };
  }, [routeLines]);

  /**
   * Calculate midpoint between two coordinates
   */
  const calculateMidpoint = (lat1: number, lng1: number, lat2: number, lng2: number): [number, number] => {
    return [(lat1 + lat2) / 2, (lng1 + lng2) / 2];
  };

  /**
   * Create custom DivIcon for price labels with dynamic styling
   */
  const createPriceIcon = (route: RouteLine, isHovered: boolean): DivIcon => {
    if (!route.price) return new DivIcon({ html: '', className: 'price-label-empty' });

    const priceText = formatPrice(route.price);
    const priceCategory = getPriceCategory(
      route.price.price,
      Math.min(...routeLines.filter(r => r.price).map(r => r.price!.price)),
      Math.max(...routeLines.filter(r => r.price).map(r => r.price!.price))
    );

    // Dynamic sizing based on price category and hover state
    const baseSize = priceCategory === 'cheap' ? 'text-sm' : priceCategory === 'medium' ? 'text-base' : 'text-lg';
    const hoverSize = isHovered ? 'scale-110' : 'scale-100';
    const hoverShadow = isHovered ? 'shadow-lg' : 'shadow-md';

    // Price-based background color with opacity
    const backgroundColor = route.color || '#00cc44';
    const textColor = priceCategory === 'expensive' ? 'text-white' : 'text-gray-800';

    const html = `
      <div class="price-label ${hoverSize} ${hoverShadow} transition-all duration-200 cursor-pointer">
        <div class="px-2 py-1 rounded-full ${baseSize} font-semibold ${textColor} border-2 border-white"
             style="background-color: ${backgroundColor}; opacity: ${isHovered ? '1' : '0.9'}">
          ${priceText}
          ${route.price.estimated ? '*' : ''}
        </div>
      </div>
    `;

    return new DivIcon({
      html,
      className: 'price-label-container',
      iconSize: [60, 30],
      iconAnchor: [30, 15],
    });
  };

  /**
   * Handle price label hover events
   */
  const handlePriceLabelHover = (routeId: string, isEntering: boolean) => {
    setHoveredRouteId(isEntering ? routeId : null);
    
    // Trigger hover effects on corresponding route line and destination marker
    const event = new CustomEvent('priceHover', {
      detail: { routeId, isEntering }
    });
    window.dispatchEvent(event);
  };

  /**
   * Handle price label click events
   */
  const handlePriceLabelClick = (route: RouteLine) => {
    setSelectedRoute(route);
  };

  /**
   * Render flight details popup content using the comprehensive FlightInfoPopup component
   */
  const renderFlightDetails = (route: RouteLine) => {
    if (!route.price) return null;

    return (
      <FlightInfoPopup 
        route={route} 
        onClose={() => setSelectedRoute(null)}
      />
    );
  };

  /**
   * Memoized price label markers for performance
   */
  const priceLabelMarkers = useMemo(() => {
    if (!state.selectedAirport || !routeLines.length) return null;

    return routeLines
      .filter(route => route.price) // Only show labels for routes with price data
      .map((route) => {
        const midpoint = calculateMidpoint(
          route.source.lat,
          route.source.lng,
          route.destination.lat,
          route.destination.lng
        );

        const isHovered = hoveredRouteId === route.id;
        const icon = createPriceIcon(route, isHovered);

        return (
          <Marker
            key={`price-${route.id}`}
            position={midpoint}
            icon={icon}
            eventHandlers={{
              mouseover: () => handlePriceLabelHover(route.id, true),
              mouseout: () => handlePriceLabelHover(route.id, false),
              click: () => handlePriceLabelClick(route),
            }}
          >
            {selectedRoute?.id === route.id && (
              <Popup
                className="flight-details-popup-container"
                eventHandlers={{
                  remove: () => setSelectedRoute(null),
                }}
              >
                {renderFlightDetails(route)}
              </Popup>
            )}
          </Marker>
        );
      });
  }, [routeLines, state.selectedAirport, hoveredRouteId, selectedRoute]);

  // Don't render anything if no selected airport or routes
  if (!state.selectedAirport || !routeLines.length) {
    return null;
  }

  return <>{priceLabelMarkers}</>;
};

export default PriceLabels;
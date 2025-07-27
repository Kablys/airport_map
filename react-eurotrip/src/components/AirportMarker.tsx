import React, { useMemo, useState, useEffect } from 'react';
import { Marker, Tooltip, Popup } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import { Airport } from '../types';

interface AirportMarkerProps {
  airport: Airport;
  isSelected: boolean;
  isConnected: boolean;
  flightCount: number;
  onClick: () => void;
}

/**
 * Individual airport marker component with custom icon and interactive features
 * Displays flight count, handles selection state, and provides hover tooltips
 */
const AirportMarker: React.FC<AirportMarkerProps> = ({
  airport,
  isSelected,
  isConnected,
  flightCount,
  onClick,
}) => {
  const [isHoveredFromRoute, setIsHoveredFromRoute] = useState(false);

  /**
   * Listen for hover events from price labels and route lines
   */
  useEffect(() => {
    const handlePriceHover = (event: CustomEvent) => {
      const { routeId, isEntering } = event.detail;
      // Check if this airport is the destination of the hovered route
      if (routeId.endsWith(`-${airport.code}`)) {
        setIsHoveredFromRoute(isEntering);
      }
    };

    const handleRouteHover = (event: CustomEvent) => {
      const { routeId, isEntering } = event.detail;
      // Check if this airport is the destination of the hovered route
      if (routeId.endsWith(`-${airport.code}`)) {
        setIsHoveredFromRoute(isEntering);
      }
    };

    window.addEventListener('priceHover', handlePriceHover as EventListener);
    window.addEventListener('routeHover', handleRouteHover as EventListener);
    
    return () => {
      window.removeEventListener('priceHover', handlePriceHover as EventListener);
      window.removeEventListener('routeHover', handleRouteHover as EventListener);
    };
  }, [airport.code]);
  // Create custom airport icon with flight count display and enhanced transparency effects
  const airportIcon = useMemo(() => {
    // Enhanced transparency logic for better visual hierarchy
    let opacity = '0.3'; // Default for non-connected airports
    let scale = '1';
    let borderColor = '#ffcc00';
    let borderWidth = '2px';
    let zIndex = '500';
    let boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    let backgroundColor = '#003d82';
    
    if (isSelected) {
      // Selected airport: fully opaque, larger, prominent border, elevated
      opacity = '1';
      scale = '1.3';
      borderWidth = '3px';
      zIndex = '1000';
      boxShadow = '0 4px 12px rgba(255, 204, 0, 0.4), 0 0 0 2px rgba(255, 204, 0, 0.2)';
      backgroundColor = '#003d82';
    } else if (isConnected) {
      // Connected airports: semi-transparent but visible
      opacity = isHoveredFromRoute ? '1' : '0.8';
      scale = isHoveredFromRoute ? '1.2' : '1.05';
      borderWidth = isHoveredFromRoute ? '3px' : '2px';
      zIndex = isHoveredFromRoute ? '800' : '600';
      boxShadow = isHoveredFromRoute 
        ? '0 4px 12px rgba(255, 204, 0, 0.3), 0 0 0 2px rgba(255, 204, 0, 0.1)' 
        : '0 2px 6px rgba(0,0,0,0.3)';
      backgroundColor = isHoveredFromRoute ? '#003d82' : '#0056b3'; // Darker blue when hovered
    }
    
    return new DivIcon({
      className: 'ryanair-marker',
      html: `<div class="airport-marker-icon" style="
        background-color: ${backgroundColor};
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        border: ${borderWidth} solid ${borderColor};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        box-shadow: ${boxShadow};
        cursor: pointer;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        opacity: ${opacity};
        transform: scale(${scale});
        z-index: ${zIndex};
        position: relative;
      " data-selected="${isSelected}" data-connected="${isConnected}">${flightCount}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  }, [isSelected, isConnected, flightCount, isHoveredFromRoute]);

  // Create popup content component for airport information
  const PopupContent = useMemo(() => {
    return (
      <div className="airport-popup" style={{ fontSize: '12px', maxWidth: '250px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #003d82, #0056b3)',
          color: 'white',
          padding: '8px',
          margin: '-8px -8px 8px -8px',
          borderRadius: '4px 4px 0 0'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>
            🛫 {airport.name} ({airport.code})
          </h3>
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <p style={{ margin: '4px 0' }}>
            <strong style={{ color: '#003d82' }}>City:</strong> {airport.city}
          </p>
          <p style={{ margin: '4px 0' }}>
            <strong style={{ color: '#003d82' }}>Country:</strong> {airport.country}
          </p>
          <p style={{ margin: '4px 0' }}>
            <strong style={{ color: '#003d82' }}>Direct Routes:</strong> {flightCount} destinations
          </p>
          <p style={{ margin: '4px 0' }}>
            <strong style={{ color: '#003d82' }}>Coordinates:</strong> {airport.lat.toFixed(4)}, {airport.lng.toFixed(4)}
          </p>
        </div>
        
        <div style={{
          background: '#f8f9fa',
          padding: '6px',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#666'
        }}>
          {isSelected ? 
            'Routes are currently displayed. Click again to clear.' : 
            'Click this airport to view direct routes and pricing.'
          }
        </div>
      </div>
    );
  }, [airport, flightCount, isSelected]);

  return (
    <Marker
      position={[airport.lat, airport.lng]}
      icon={airportIcon}
      eventHandlers={{
        click: (e) => {
          // Prevent popup from opening immediately on click
          e.target.closePopup();
          onClick();
          
          // Open popup after a short delay to show updated route info
          setTimeout(() => {
            e.target.openPopup();
          }, 100);
        },
      }}
    >
      <Tooltip
        direction="top"
        offset={[0, -10]}
        opacity={0.9}
        className="airport-tooltip"
      >
        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
          {airport.name}, {airport.country}
        </div>
      </Tooltip>
      
      <Popup closeOnClick={false} autoClose={false}>
        {PopupContent}
      </Popup>
    </Marker>
  );
};

export default AirportMarker;
import React from 'react';
import AirportMarker from './AirportMarker';
import { useAppContext } from '../hooks/useAppContext';
import { useMap } from '../hooks/useMap';
import { Airport } from '../types';

/**
 * Container component for all airport markers
 * Manages marker state and handles airport selection interactions with enhanced transparency effects
 */
const AirportMarkers: React.FC = () => {
  const { state } = useAppContext();
  const { connectedAirports, handleAirportClick } = useMap();

  // Don't render markers if airports data is not loaded
  if (!state.airports || state.airports.length === 0) {
    return null;
  }

  /**
   * Determine the connection state for an airport with enhanced logic
   */
  const getAirportConnectionState = (airport: Airport) => {
    const isSelected = state.selectedAirport?.code === airport.code;
    const isConnected = connectedAirports.has(airport.code);
    
    // Enhanced connection logic:
    // - Selected airport is always considered connected
    // - Connected airports are those with direct routes from selected airport
    // - All other airports are non-connected (transparent)
    return {
      isSelected,
      isConnected: isConnected || isSelected,
    };
  };

  return (
    <>
      {state.airports.map((airport) => {
        // Calculate flight count for this airport
        const flightCount = state.routes[airport.code]?.length || 0;
        
        // Determine marker state with enhanced connection logic
        const { isSelected, isConnected } = getAirportConnectionState(airport);

        return (
          <AirportMarker
            key={airport.code}
            airport={airport}
            isSelected={isSelected}
            isConnected={isConnected}
            flightCount={flightCount}
            onClick={() => handleAirportClick(airport)}
          />
        );
      })}
    </>
  );
};

export default AirportMarkers;
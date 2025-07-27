import { useState, useEffect, useRef, useCallback } from 'react';
import { Map as LeafletMap } from 'leaflet';
import { useAppContext } from './useAppContext';
import { Airport, RouteLine } from '../types';

/**
 * Custom hook for map-specific state and methods
 * Manages map instance, route visualization, and map-related interactions
 */
export const useMap = () => {
  const { state, selectAirport, setLoading, addError } = useAppContext();
  const [isMapReady, setIsMapReady] = useState(false);
  const [connectedAirports, setConnectedAirports] = useState<Set<string>>(new Set());
  const [routeLines, setRouteLines] = useState<RouteLine[]>([]);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);
  
  const mapRef = useRef<LeafletMap | null>(null);

  /**
   * Initialize map when component mounts
   */
  useEffect(() => {
    // Simulate map initialization delay
    const timer = setTimeout(() => {
      setIsMapReady(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  /**
   * Calculate distance between two points using Haversine formula
   */
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  /**
   * Convert degrees to radians
   */
  const toRadians = (degrees: number): number => {
    return degrees * (Math.PI / 180);
  };

  /**
   * Clear all routes and reset map state with smooth transitions
   */
  const clearRoutes = useCallback(() => {
    // Clear connected airports first to trigger transparency animation
    setConnectedAirports(new Set());
    
    // Clear route lines and price range
    setRouteLines([]);
    setPriceRange(null);
  }, []);

  /**
   * Show routes from a specific airport with smooth visual transitions
   */
  const showRoutes = useCallback(async (airportCode: string) => {
    const routes = state.routes[airportCode];
    if (!routes || routes.length === 0) {
      setConnectedAirports(new Set());
      setRouteLines([]);
      setPriceRange(null);
      return;
    }

    // Find connected airports and update state for transparency effects
    const connected = new Set(routes);
    
    // Animate the transparency change by updating connected airports first
    setConnectedAirports(connected);

    // Create route lines (prices will be fetched later by other components)
    const sourceAirport = state.airports.find(a => a.code === airportCode);
    if (!sourceAirport) return;

    const lines: RouteLine[] = routes.map(destinationCode => {
      const destinationAirport = state.airports.find(a => a.code === destinationCode);
      if (!destinationAirport) return null;

      // Calculate distance using Haversine formula
      const distance = calculateDistance(
        sourceAirport.lat,
        sourceAirport.lng,
        destinationAirport.lat,
        destinationAirport.lng
      );

      return {
        id: `${airportCode}-${destinationCode}`,
        source: sourceAirport,
        destination: destinationAirport,
        price: null, // Will be populated by API calls later
        distance,
        color: '#666666', // Default color, will be updated based on price
      };
    }).filter(Boolean) as RouteLine[];

    setRouteLines(lines);
    
    // Calculate initial price range (will be updated when real prices are loaded)
    setPriceRange({ min: 20, max: 200 });
  }, [state.routes, state.airports]);

  /**
   * Handle airport selection and route visualization with smooth transitions
   */
  const handleAirportClick = useCallback(async (airport: Airport) => {
    try {
      setLoading(true);
      
      // If clicking the same airport, deselect it with smooth transition
      if (state.selectedAirport?.code === airport.code) {
        // Clear routes first to trigger transparency changes
        clearRoutes();
        // Small delay to allow transparency animation to start
        setTimeout(() => {
          selectAirport(null);
        }, 100);
        return;
      }

      // If there's a previously selected airport, clear its routes first
      if (state.selectedAirport) {
        clearRoutes();
        // Small delay for smooth transition between selections
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Select the new airport
      selectAirport(airport);
      
      // Show routes for the selected airport with a slight delay for smooth animation
      setTimeout(async () => {
        await showRoutes(airport.code);
      }, 100);
      
    } catch (error) {
      addError({
        id: `airport-select-${Date.now()}`,
        type: 'map',
        message: `Failed to load routes for ${airport.name}`,
        timestamp: Date.now(),
        retryable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [state.selectedAirport, selectAirport, setLoading, addError, clearRoutes, showRoutes]);

  /**
   * Update route line color based on price
   */
  const updateRouteColor = useCallback((routeId: string, price: number) => {
    setRouteLines(prevLines => 
      prevLines.map(line => {
        if (line.id === routeId) {
          // Color coding: green (cheap) to orange (medium) to red (expensive)
          let color = '#00cc44'; // green
          if (price > 100) color = '#ff8800'; // orange
          if (price > 200) color = '#ff0066'; // red
          
          return {
            ...line,
            color,
            price: {
              price,
              currency: 'EUR',
              lastUpdated: Date.now(),
              estimated: false,
            }
          };
        }
        return line;
      })
    );
  }, []);

  /**
   * Get map bounds for all airports
   */
  const getAirportsBounds = useCallback(() => {
    if (state.airports.length === 0) return null;
    
    const lats = state.airports.map(a => a.lat);
    const lngs = state.airports.map(a => a.lng);
    
    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
    };
  }, [state.airports]);

  return {
    // Map state
    mapRef,
    isMapReady,
    connectedAirports,
    routeLines,
    priceRange,
    
    // Map methods
    handleAirportClick,
    showRoutes,
    clearRoutes,
    updateRouteColor,
    getAirportsBounds,
    calculateDistance,
  };
};
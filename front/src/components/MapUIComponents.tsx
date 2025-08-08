import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import type { Airport } from '../main.ts';
import { SearchControlReact } from './SearchControl.tsx';
import { TileSelector } from './TileSelector.tsx';
import { ItineraryPanel } from './ItineraryPanel.tsx';

// Types from map.ts
interface FlightPriceData {
  price: number;
  currency: string;
  lastUpdated: number;
  estimated: boolean;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  departureDate: string;
  aircraft: string;
  note: string;
}

interface ItinerarySegment {
  type: 'flight';
  from: Airport;
  to: Airport;
  priceData: FlightPriceData | null;
  distance: number;
  line: L.Polyline;
}

interface ItineraryGap {
  type: 'gap';
  lastAirport: Airport;
  nextAirport: Airport;
}

type ItineraryItem = ItinerarySegment | ItineraryGap;

interface LeafletMap {
  flyTo(center: [number, number], zoom: number): void;
  setView(center: [number, number], zoom: number): LeafletMap;
  invalidateSize(): void;
  removeLayer(layer: unknown): void;
}

interface MapUIComponentsProps {
  airports: Airport[];
  map: LeafletMap;
  itinerary: ItineraryItem[];
  onTileChange: (providerKey: string) => void;
  onClearItinerary: () => void;
  onSegmentHover: (segmentIndex: number, highlight: boolean) => void;
  onSegmentClick: (segment: ItinerarySegment) => void;
}

// Main container component that manages all UI components
export const MapUIComponents: React.FC<MapUIComponentsProps> = ({
  airports,
  map,
  itinerary,
  onTileChange,
  onClearItinerary,
  onSegmentHover,
  onSegmentClick
}) => {
  return (
    <>
      <SearchControlReact airports={airports} map={map} />
      <TileSelector onTileChange={onTileChange} />
      <ItineraryPanel
        itinerary={itinerary}
        onClearItinerary={onClearItinerary}
        onSegmentHover={onSegmentHover}
        onSegmentClick={onSegmentClick}
      />
    </>
  );
};

// Integration functions to mount React components in Leaflet controls
export function createReactSearchControl(airports: Airport[], map: LeafletMap) {
  const searchControl = (L as any).control({ position: 'topright' });
  
  searchControl.onAdd = () => {
    const div = (L as any).DomUtil.create('div', 'search-control-container');
    
    const root = createRoot(div);
    root.render(React.createElement(SearchControlReact, { airports, map }));

    (L as any).DomEvent.disableClickPropagation(div);
    (L as any).DomEvent.disableScrollPropagation(div);

    return div;
  };
  
  return searchControl;
}

export function createReactTileSelector(onTileChange: (providerKey: string) => void, defaultProvider?: string) {
  const tileControl = (L as any).control({ position: 'topleft' });
  
  tileControl.onAdd = () => {
    const div = (L as any).DomUtil.create('div', 'tile-selector-container');
    
    const root = createRoot(div);
    root.render(React.createElement(TileSelector, { onTileChange, defaultProvider }));

    (L as any).DomEvent.disableClickPropagation(div);
    (L as any).DomEvent.disableScrollPropagation(div);

    return div;
  };
  
  return tileControl;
}

// Hook for managing itinerary state in React
export function useItinerary() {
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);

  const addSegment = useCallback((segment: ItinerarySegment) => {
    setItinerary(prev => [...prev, segment]);
  }, []);

  const addGap = useCallback((gap: ItineraryGap) => {
    setItinerary(prev => [...prev, gap]);
  }, []);

  const clearItinerary = useCallback(() => {
    setItinerary([]);
  }, []);

  const removeSegment = useCallback((index: number) => {
    setItinerary(prev => prev.filter((_, i) => i !== index));
  }, []);

  return {
    itinerary,
    addSegment,
    addGap,
    clearItinerary,
    removeSegment
  };
}

// Example of how to integrate with existing map.ts functions
export function integrateReactComponents(
  airports: Airport[], 
  map: LeafletMap,
  onTileChange: (providerKey: string) => void
) {
  // Create and add search control
  const searchControl = createReactSearchControl(airports, map);
  searchControl.addTo(map);

  // Create and add tile selector
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const defaultProvider = prefersDark ? 'dark' : 'light';
  const tileControl = createReactTileSelector(onTileChange, defaultProvider);
  tileControl.addTo(map);

  return {
    searchControl,
    tileControl
  };
}
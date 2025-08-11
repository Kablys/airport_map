import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import type { Airport, ItineraryItem, ItinerarySegment, LeafletMap } from '../types.ts';

// Since we're using Leaflet from CDN, declare it as global for types
declare const L: typeof import('leaflet');

// Import all our React components
import { SearchControlReact } from './SearchControl.tsx';
import { TileSelector } from './TileSelector.tsx';
import { Legend, useLegendState } from './Legend.tsx';
import { useAppState } from '../state/AppContext.tsx';

interface CompleteMapUIProps {
  airports: Airport[];
  map: LeafletMap;
  onTileChange?: (providerKey: string) => void;
}

// Complete UI integration component
export const CompleteMapUI: React.FC<CompleteMapUIProps> = ({
  airports,
  map,
  onTileChange,
}) => {
  // Prefer centralized state when available
  const appState = useAppState();
  const totalCountries = new Set(airports.map((a: Airport) => a.country)).size;
  const legendState = useLegendState(airports.length, totalCountries);

  return (
    <div className="map-ui-container">
      {/* Search Control - Top Right */}
      <div className="search-control-wrapper">
        <SearchControlReact airports={airports} map={map} />
      </div>

      {/* Tile Selector - Top Left */}
      <div className="tile-selector-wrapper">
        <TileSelector onTileChange={onTileChange ?? (() => {})} />
      </div>

      {/* Legend - Bottom Left */}
      <div className="legend-wrapper">
        <Legend
          selectedAirport={legendState.selectedAirport}
          routeCount={legendState.routeCount}
          isHover={legendState.isHover}
          totalAirports={airports.length}
          totalCountries={totalCountries}
          priceRange={legendState.priceRange}
          showFlightPrices={legendState.showFlightPrices}
        />
      </div>

      {/* Itinerary Panel is rendered by legacy map.ts for now to avoid duplication */}
    </div>
  );
};

// Integration utilities for Leaflet controls
export class ReactMapUIManager {
  private map: LeafletMap;
  private airports: Airport[];
  private controls: { [key: string]: any } = {};
  private roots: { [key: string]: any } = {};

  constructor(map: LeafletMap, airports: Airport[]) {
    this.map = map;
    this.airports = airports;
  }

  // Add search control
  addSearchControl() {
    const control = (L as any).control({ position: 'topright' });
    
    control.onAdd = () => {
      const div = (L as any).DomUtil.create('div', 'react-search-control');
      
      const root = createRoot(div);
      root.render(React.createElement(SearchControlReact, { 
        airports: this.airports, 
        map: this.map 
      }));

      (L as any).DomEvent.disableClickPropagation(div);
      (L as any).DomEvent.disableScrollPropagation(div);

      this.roots.search = root;
      return div;
    };
    
    control.addTo(this.map);
    this.controls.search = control;
    return control;
  }

  // Add tile selector
  addTileSelector(onTileChange: (providerKey: string) => void, defaultProvider?: string) {
    const control = (L as any).control({ position: 'topleft' });
    
    control.onAdd = () => {
      const div = (L as any).DomUtil.create('div', 'react-tile-selector');
      
      const root = createRoot(div);
      root.render(React.createElement(TileSelector, { 
        onTileChange, 
        defaultProvider 
      }));

      (L as any).DomEvent.disableClickPropagation(div);
      (L as any).DomEvent.disableScrollPropagation(div);

      this.roots.tileSelector = root;
      return div;
    };
    
    control.addTo(this.map);
    this.controls.tileSelector = control;
    return control;
  }

  // Add legend
  addLegend() {
    const control = (L as any).control({ position: 'bottomleft' });
    const totalCountries = new Set(this.airports.map(a => a.country)).size;
    
    control.onAdd = () => {
      const div = (L as any).DomUtil.create('div', 'react-legend');
      
      const root = createRoot(div);
      root.render(React.createElement(Legend, { 
        totalAirports: this.airports.length,
        totalCountries: totalCountries,
        showFlightPrices: false
      }));

      this.roots.legend = root;
      return div;
    };
    
    control.addTo(this.map);
    this.controls.legend = control;
    return control;
  }

  // Update legend state
  updateLegend(selectedAirport: Airport | null, routeCount?: number, isHover?: boolean) {
    if (this.roots.legend) {
      const totalCountries = new Set(this.airports.map(a => a.country)).size;
      
      this.roots.legend.render(React.createElement(Legend, {
        selectedAirport,
        routeCount,
        isHover,
        totalAirports: this.airports.length,
        totalCountries: totalCountries,
        showFlightPrices: !!selectedAirport
      }));
    }
  }

  // Clean up all controls and React roots
  cleanup() {
    Object.values(this.controls).forEach(control => {
      if (control && this.map.removeControl) {
        this.map.removeControl(control);
      }
    });

    Object.values(this.roots).forEach(root => {
      if (root && root.unmount) {
        root.unmount();
      }
    });

    this.controls = {};
    this.roots = {};
  }
}

// Hook for managing complete map UI state
export function useMapUIState(airports: Airport[], map: LeafletMap) {
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const totalCountries = new Set(airports.map(a => a.country)).size;
  const legendState = useLegendState(airports.length, totalCountries);

  const addToItinerary = useCallback((segment: ItinerarySegment) => {
    setItinerary(prev => [...prev, segment]);
  }, []);

  const clearItinerary = useCallback(() => {
    setItinerary([]);
  }, []);

  const handleTileChange = useCallback((providerKey: string) => {
    // This would be handled by the parent component
    console.log('Tile changed to:', providerKey);
  }, []);

  const handleSegmentHover = useCallback((segmentIndex: number, highlight: boolean) => {
    // This would be handled by the parent component
    console.log('Segment hover:', segmentIndex, highlight);
  }, []);

  const handleSegmentClick = useCallback((segment: ItinerarySegment) => {
    // This would be handled by the parent component
    console.log('Segment clicked:', segment);
  }, []);

  return {
    itinerary,
    selectedAirport,
    legendState,
    addToItinerary,
    clearItinerary,
    setSelectedAirport,
    handleTileChange,
    handleSegmentHover,
    handleSegmentClick
  };
}

// Example usage function
export function initializeReactMapUI(map: LeafletMap, airports: Airport[]) {
  const uiManager = new ReactMapUIManager(map, airports);
  
  // Add all controls
  uiManager.addSearchControl();
  
  const handleTileChange = (providerKey: string) => {
    console.log('Changing tile to:', providerKey);
    // Implement tile change logic here
  };
  
  uiManager.addTileSelector(handleTileChange);
  uiManager.addLegend();

  return uiManager;
}
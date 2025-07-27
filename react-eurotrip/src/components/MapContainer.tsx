import React, { useRef } from 'react';
import { MapContainer as LeafletMapContainer, TileLayer } from 'react-leaflet';
import { Map as LeafletMap } from 'leaflet';
import { useMap } from '../hooks/useMap';
import AirportMarkers from './AirportMarkers';
import RouteLines from './RouteLines';
import PriceLabels from './PriceLabels';
import LoadingSpinner from './LoadingSpinner';
import 'leaflet/dist/leaflet.css';

/**
 * MapContainer component with Leaflet map initialization
 * Provides the main interactive map interface with OpenStreetMap tiles
 */
const MapContainer: React.FC = () => {
  const mapRef = useRef<LeafletMap | null>(null);
  const { isMapReady } = useMap();

  // Map configuration
  const mapCenter: [number, number] = [50.0, 10.0]; // Center of Europe
  const mapZoom = 4;

  return (
    <div className="h-screen w-full relative">
      <LeafletMapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="h-full w-full z-map"
        ref={mapRef}
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={18}
          minZoom={3}
        />
        
        {/* Airport markers with interactive features */}
        <AirportMarkers />
        
        {/* Route lines with price-based coloring */}
        <RouteLines />
        
        {/* Price labels with hover effects and flight details */}
        <PriceLabels />
      </LeafletMapContainer>
      
      {!isMapReady && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-controls">
          <div className="text-center">
            <LoadingSpinner size="xl" className="mx-auto mb-4" />
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapContainer;
import React, { useState, useEffect, useCallback } from 'react';

interface TileProvider {
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
}

interface TileSelectorProps {
  onTileChange: (providerKey: string) => void;
  defaultProvider?: string;
}

const tileProviders: Record<string, TileProvider> = {
  openstreetmap: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
  },
  terrain: {
    name: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap contributors',
    maxZoom: 17,
  },
  dark: {
    name: 'Dark Mode',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© CARTO, © OpenStreetMap contributors',
    maxZoom: 19,
  },
  light: {
    name: 'Light Mode',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© CARTO, © OpenStreetMap contributors',
    maxZoom: 19,
  },
};

export const TileSelector: React.FC<TileSelectorProps> = ({ 
  onTileChange, 
  defaultProvider 
}) => {
  // Detect user's color scheme preference
  const getDefaultProvider = useCallback(() => {
    if (defaultProvider) return defaultProvider;
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }, [defaultProvider]);

  const [selectedProvider, setSelectedProvider] = useState(getDefaultProvider());

  // Handle tile provider change
  const handleProviderChange = useCallback((providerKey: string) => {
    setSelectedProvider(providerKey);
    onTileChange(providerKey);
  }, [onTileChange]);

  // Listen for system color scheme changes
  useEffect(() => {
    if (!window.matchMedia) return;

    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleColorSchemeChange = (e: MediaQueryListEvent) => {
      const newDefault = e.matches ? 'dark' : 'light';
      // Only auto-switch if user hasn't manually selected a different tile
      if (selectedProvider === 'dark' || selectedProvider === 'light') {
        handleProviderChange(newDefault);
      }
    };

    darkModeQuery.addEventListener('change', handleColorSchemeChange);
    
    return () => {
      darkModeQuery.removeEventListener('change', handleColorSchemeChange);
    };
  }, [selectedProvider, handleProviderChange]);

  return (
    <div className="ui-panel tile-selector-panel">
      <label htmlFor="tile-selector">Map Style:</label>
      <select 
        id="tile-selector" 
        className="tile-selector"
        value={selectedProvider}
        onChange={(e) => handleProviderChange(e.target.value)}
      >
        {Object.entries(tileProviders).map(([key, provider]) => (
          <option key={key} value={key}>
            {provider.name}
          </option>
        ))}
      </select>
    </div>
  );
};
import React, { useState, useEffect, useCallback } from 'react';
import { tileProviders } from '../services/map-service.ts';

interface TileSelectorProps {
  onTileChange: (providerKey: string) => void;
  defaultProvider?: string;
}

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
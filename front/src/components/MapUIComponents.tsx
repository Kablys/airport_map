import React from 'react';
import { createRoot } from 'react-dom/client';
import { TileSelector } from './TileSelector.tsx';

// Leaflet is provided globally via CDN
declare const L: typeof import('leaflet');

/**
 * Wraps the React TileSelector into a Leaflet control.
 * Returns a Leaflet control instance so callers can call addTo(map).
 */
export function createReactTileSelector(
  onTileChange: (providerKey: string) => void,
  defaultProvider?: string
): L.Control {
  const control = new (L.Control as unknown as {
    new (options?: { position?: string }): L.Control;
  })({ position: 'topright' });

  // Render React component when Leaflet requests the DOM element
  (control as any).onAdd = () => {
    const div = L.DomUtil.create('div', 'tile-selector-container');
    const root = createRoot(div);
    root.render(
      React.createElement(TileSelector, {
        onTileChange,
        defaultProvider,
      })
    );

    // Prevent map interactions through the UI panel
    if (L.DomEvent) {
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);
    }

    return div;
  };

  return control;
}

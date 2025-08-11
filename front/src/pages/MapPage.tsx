import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
// Defer importing map initializer to avoid circular import timing issues
import { AppProvider } from '../state/AppContext.tsx';
import { CompleteMapUI } from '../components/CompleteMapUI.tsx';
import { ryanairAirports, ryanairRoutes } from '../data.ts';

// Since we're using Leaflet from CDN, declare it as global
declare const L: typeof import('leaflet');

type Props = {
  onMapReady?: (map: L.Map) => void;
};

export const MapPage: React.FC<Props> = ({ onMapReady }) => {
  const [map, setMap] = useState<L.Map | null>(null);
  const initializedRef = useRef(false);
  const mapRef = useRef<L.Map | null>(null);
  const [initError, setInitError] = useState<Error | null>(null);

  useLayoutEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    (async () => {
      try {
        const { initializeMap } = await import('../map.ts');
        console.debug('initializeMap typeof =', typeof initializeMap);
        const m = initializeMap(ryanairAirports, ryanairRoutes);
        mapRef.current = m;
        setMap(m);
        // expose globally until fully migrated
        (window as any).map = m;
        onMapReady?.(m);
      } catch (err: any) {
        setInitError(err);
        console.error('Failed to initialize map:', err?.stack || err);
      }
    })();

    return () => {
      // In React 18 StrictMode (dev), effects run twice (mount -> cleanup -> mount).
      // Removing the map here would blank the screen after the first pass.
      // We intentionally skip tearing down the map; it will be GC'ed when the
      // element is removed or on full page unload/navigation.
      mapRef.current = mapRef.current || null;
    };
  }, [onMapReady]);

  return (
    <div id="map-page" className="page active">
      {initError ? (
        <div style={{ padding: 16, color: 'red' }}>
          Map failed to initialize. Check console for details.
        </div>
      ) : (
        <div id="map"></div>
      )}
      <div id="react-ui-container">
        {map && (
          <AppProvider>
            <CompleteMapUI airports={ryanairAirports} map={map} onTileChange={() => {}} />
          </AppProvider>
        )}
      </div>
    </div>
  );
};

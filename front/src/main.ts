/// <reference lib="dom" />
/// <reference types="leaflet" />

// Since we're using Leaflet from CDN, declare it as global
declare const L: typeof import('leaflet');

import React, { useEffect, useState } from 'react';
import './styles/components.css';
import { createRoot } from 'react-dom/client';
import { ryanairAirports } from './data.ts';
import { MapPage } from './pages/MapPage.tsx';

// Log data loading for debugging
console.log(`Loaded ${ryanairAirports.length} airports from JSON`);

declare global {
  interface Window {
    map: L.Map;
  }
}

const AppShell: React.FC = () => {
  const [mapReady, setMapReady] = useState<L.Map | null>(null);

  // URL param handling: fly to location once the map exists
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const lat = urlParams.get('lat');
    const lng = urlParams.get('lng');
    const airportCode = urlParams.get('airport');
    if (!lat && !lng && !airportCode) return;

    const doFly = () => {
      if (mapReady) {
        if (lat && lng) {
          mapReady.flyTo([parseFloat(lat), parseFloat(lng)], 10);
        }
        // Clear URL params
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('lat');
        newUrl.searchParams.delete('lng');
        newUrl.searchParams.delete('airport');
        window.history.replaceState({}, '', newUrl.toString());
      }
    };
    // If map not yet ready, this will rerun when mapReady changes
    doFly();
  }, [mapReady]);

  return React.createElement(MapPage as unknown as React.FC<{ onMapReady: (m: L.Map) => void }>, {
    onMapReady: (m: L.Map) => setMapReady(m),
  });
};

const rootEl = document.getElementById('root');
if (rootEl) {
  // Better error visibility during migration
  window.addEventListener('error', (e) => {
    const err = (e as any).error;
    const details = {
      message: e.message,
      filename: (e as any).filename,
      lineno: (e as any).lineno,
      colno: (e as any).colno,
      stack: err?.stack,
    };
    const fname = String(details.filename || '');
    const isExtension = fname.startsWith('chrome-extension://');
    const isOpaqueScriptError = details.message === 'Script error.' && !fname;
    if (isExtension || isOpaqueScriptError) {
      // Ignore noisy extension/CORS script errors that lack actionable info
      return;
    }
    console.error('GlobalError:', details);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason: any = (e as any).reason;
    const details = {
      message: reason?.message || String(reason),
      stack: reason?.stack,
      filename: reason?.filename || '',
    } as any;
    const fname = String(details.filename || '');
    const isExtension = fname.startsWith('chrome-extension://');
    const isOpaqueScriptError = details.message === 'Script error.' && !fname;
    if (isExtension || isOpaqueScriptError) {
      return;
    }
    console.error('UnhandledRejection:', details);
  });

  const root = createRoot(rootEl);
  root.render(React.createElement(AppShell));
}

import React from 'react';

export type Page = 'map' | 'info';

interface AppProps {
  current: Page;
  onSwitch: (page: Page) => void;
}

export const App: React.FC<AppProps> = ({ current, onSwitch }) => {
  return (
    <nav className="main-nav" id="main-nav">
      <button
        className={`nav-button ${current === 'map' ? 'active' : ''}`}
        onClick={() => onSwitch('map')}
        id="nav-map"
      >
        🗺️ Map
      </button>
      <button
        className={`nav-button ${current === 'info' ? 'active' : ''}`}
        onClick={() => onSwitch('info')}
        id="nav-info"
      >
        📊 Info
      </button>
    </nav>
  );
};

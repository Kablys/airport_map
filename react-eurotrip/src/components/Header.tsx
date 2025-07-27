import React from 'react';
import SearchBar from './SearchBar';

/**
 * Header component with title, description, and search functionality
 * Positioned absolutely in the top-left corner with Ryanair branding
 */
const Header: React.FC = () => {
  return (
    <div className="absolute top-2.5 left-2.5 z-controls bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg max-w-sm">
      <h1 className="text-2xl font-bold text-ryanair-blue mb-1 flex items-center gap-2">
        <span className="text-2xl" role="img" aria-label="airplane">🛫</span>
        Ryanair European Airports
      </h1>
      <p className="text-sm text-gray-600 mb-3 leading-relaxed">
        Interactive map of airports served by Ryanair across Europe
      </p>
      <SearchBar />
    </div>
  );
};

export default Header;
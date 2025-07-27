import React from 'react';

/**
 * SearchBar component placeholder for airport search functionality
 * Will be enhanced with autocomplete functionality in a later task
 */
const SearchBar: React.FC = () => {
  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          placeholder="Search airports..."
          className="w-full px-3 py-2 pl-9 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ryanair-blue focus:border-transparent transition-colors"
          disabled
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Search functionality coming soon
      </p>
    </div>
  );
};

export default SearchBar;

import ErrorBoundary from './components/ErrorBoundary';
import { AppProvider } from './contexts/AppContext';
import { DataExample } from './components/DataExample';
import Header from './components/Header';
import MapContainer from './components/MapContainer';
import Sidebar from './components/Sidebar';
import LoadingOverlay from './components/LoadingOverlay';
import ErrorNotification from './components/ErrorNotification';
import { useAppContext } from './hooks/useAppContext';

/**
 * Main App component with basic layout structure
 * Provides global state management and error handling for the entire application
 */
function AppContent() {
  const { state, removeError } = useAppContext();

  const handleRetryError = (error: any) => {
    // For now, just remove the error - specific retry logic can be added per error type
    removeError(error.id);
    // TODO: Add specific retry logic based on error type
  };

  return (
    <div className="h-screen w-full relative bg-gray-100" role="main">
      <Header />
      <MapContainer />
      <Sidebar />
      
      {/* Loading overlay for global loading states */}
      <LoadingOverlay 
        isVisible={state.isLoading} 
        message="Loading application data..."
      />
      
      {/* Error notifications */}
      <ErrorNotification
        errors={state.errors}
        onRetry={handleRetryError}
        onDismiss={removeError}
        maxVisible={3}
        autoHideDuration={8000}
      />
      
      {/* Temporary: Keep DataExample for debugging - will be removed later */}
      <div className="absolute bottom-4 right-4 z-controls bg-white/90 p-4 rounded-lg shadow-lg max-w-sm">
        <DataExample />
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
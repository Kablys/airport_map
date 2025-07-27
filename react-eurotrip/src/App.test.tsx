import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import App from './App'

// Mock the data service to avoid fetch errors in tests
jest.mock('./services/dataService', () => ({
  dataService: {
    getAirports: jest.fn().mockResolvedValue([]),
    getRoutes: jest.fn().mockResolvedValue({}),
    getAllData: jest.fn().mockResolvedValue({ airports: [], routes: {} }),
    clearCache: jest.fn(),
    getCachedAirports: jest.fn().mockReturnValue(null),
    getCachedRoutes: jest.fn().mockReturnValue(null),
  },
}));

test('renders App component with ErrorBoundary and AppProvider', () => {
  render(<App />)
  
  // The app should render without crashing
  const appContainer = screen.getByRole('main') || document.querySelector('.h-screen')
  expect(appContainer).toBeTruthy()
})

test('renders loading state initially', async () => {
  render(<App />)
  
  // Should show loading state from DataExample component
  await waitFor(() => {
    expect(screen.getByText(/Loading airports and routes/i)).toBeInTheDocument()
  })
})

test('provides context to child components', () => {
  // This test verifies that the AppProvider is working
  render(<App />)
  
  // The DataExample component should be rendered, which uses the context
  expect(screen.getByText(/Loading airports and routes/i)).toBeInTheDocument()
})
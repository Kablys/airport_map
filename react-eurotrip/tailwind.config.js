/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ryanair-blue': '#003d82',
        'ryanair-yellow': '#ffcc00',
        'price-green': '#00cc44',
        'price-orange': '#ff8800',
        'price-red': '#ff0066',
      },
      animation: {
        'marker-pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'route-draw': 'draw 0.5s ease-in-out',
      },
      zIndex: {
        'map': '400',
        'markers': '500',
        'routes': '450',
        'popups': '600',
        'controls': '1000',
      }
    },
  },
  plugins: [],
}
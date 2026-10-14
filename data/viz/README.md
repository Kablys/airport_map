# Flight Data Visualization

A Streamlit dashboard to visualize Ryanair airports and routes data.

## Features

- 📊 Overview metrics (total airports, routes, countries)
- 🗺️ Interactive map showing airport locations
- 🏆 Top countries by airport count
- 🛫 Route analysis from selected countries
- 📋 Detailed data tables for airports and routes

## Running the App

From the `data` directory:

```bash
streamlit run viz/app.py
```

## Data

The app visualizes data from:
- `data/prod/airports.json` - Airport information with coordinates
- `data/prod/routes.json` - Route connections between airports
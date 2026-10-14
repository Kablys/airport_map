import streamlit as st
import polars as pl
import json
from pathlib import Path

# Set page config
st.set_page_config(
    page_title="Flight Data Visualization",
    page_icon="✈️",
    layout="wide"
)

# Load data
@st.cache_data
def load_data():
    """Load airports and routes data"""
    data_dir = Path(__file__).parent.parent / "prod"
    
    # Load airports
    with open(data_dir / "airports.json", "r") as f:
        airports_data = json.load(f)
    airports_df = pl.DataFrame(airports_data)
    
    # Load routes
    with open(data_dir / "routes.json", "r") as f:
        routes_data = json.load(f)
    
    # Convert routes to DataFrame
    routes_list = []
    for origin, destinations in routes_data.items():
        for dest in destinations:
            routes_list.append({"origin": origin, "destination": dest})
    routes_df = pl.DataFrame(routes_list)
    
    return airports_df, routes_df

def main():
    st.title("✈️ Flight Data Dashboard")
    st.markdown("Explore Ryanair airports and routes data")
    
    # Load data
    airports_df, routes_df = load_data()
    
    # Sidebar filters
    st.sidebar.header("Filters")
    
    # Country filter
    countries = sorted(airports_df["country"].unique().to_list())
    selected_countries = st.sidebar.multiselect(
        "Select Countries",
        countries,
        default=countries[:5]  # Show first 5 countries by default
    )
    
    # Filter airports by selected countries
    filtered_airports = airports_df.filter(
        pl.col("country").is_in(selected_countries)
    ) if selected_countries else airports_df
    
    # Main content
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("📊 Overview")
        
        # Key metrics
        total_airports = len(airports_df)
        total_routes = len(routes_df)
        total_countries = len(airports_df["country"].unique())
        
        metric_col1, metric_col2, metric_col3 = st.columns(3)
        with metric_col1:
            st.metric("Total Airports", total_airports)
        with metric_col2:
            st.metric("Total Routes", total_routes)
        with metric_col3:
            st.metric("Countries", total_countries)
        
        # Top countries by airport count
        st.subheader("🏆 Top Countries by Airport Count")
        country_counts = (
            airports_df
            .group_by("country")
            .agg(pl.count("code").alias("airport_count"))
            .sort("airport_count", descending=True)
            .head(10)
        )
        st.bar_chart(
            country_counts.to_pandas().set_index("country")["airport_count"]
        )
    
    with col2:
        st.subheader("🗺️ Airport Distribution")
        
        # Show map if we have coordinates
        if not filtered_airports.is_empty():
            map_data = filtered_airports.select(["lat", "lng", "name", "city", "country"]).to_pandas()
            map_data = map_data.rename(columns={"lat": "latitude", "lng": "longitude"})
            st.map(map_data)
        
        # Routes from selected airports
        if selected_countries:
            st.subheader("🛫 Routes from Selected Countries")
            selected_codes = filtered_airports["code"].to_list()
            country_routes = routes_df.filter(
                pl.col("origin").is_in(selected_codes)
            )
            
            if not country_routes.is_empty():
                # Top destinations
                top_destinations = (
                    country_routes
                    .group_by("destination")
                    .agg(pl.count("origin").alias("route_count"))
                    .sort("route_count", descending=True)
                    .head(10)
                )
                
                # Join with airport names
                dest_with_names = top_destinations.join(
                    airports_df.select(["code", "city", "country"]),
                    left_on="destination",
                    right_on="code",
                    how="left"
                )
                
                st.dataframe(
                    dest_with_names.select([
                        "destination", "city", "country", "route_count"
                    ]).to_pandas(),
                    use_container_width=True
                )
    
    # Detailed data tables
    st.subheader("📋 Detailed Data")
    
    tab1, tab2 = st.tabs(["Airports", "Routes"])
    
    with tab1:
        st.dataframe(
            filtered_airports.to_pandas(),
            use_container_width=True
        )
    
    with tab2:
        # Show routes with airport names
        routes_with_names = (
            routes_df
            .join(
                airports_df.select(["code", "city", "country"]),
                left_on="origin",
                right_on="code",
                how="left"
            )
            .rename({"city": "origin_city", "country": "origin_country"})
            .join(
                airports_df.select(["code", "city", "country"]),
                left_on="destination",
                right_on="code",
                how="left"
            )
            .rename({"city": "destination_city", "country": "destination_country"})
            .select([
                "origin", "origin_city", "origin_country",
                "destination", "destination_city", "destination_country"
            ])
        )
        
        st.dataframe(
            routes_with_names.to_pandas(),
            use_container_width=True
        )

if __name__ == "__main__":
    main()
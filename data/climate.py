import httpx
import polars as pl
import json

def get_airport_climate_data(latitude: float, longitude: float):
    """
    Fetches climate and geographical data for a given location.
    """
    # 1. Get elevation and timezone from the Forecast API
    forecast_url = "https://api.open-meteo.com/v1/forecast"
    forecast_params = {
        "latitude": latitude,
        "longitude": longitude,
        "current_weather": "true", # A bit of a hack to get elevation and timezone
    }

    elevation = None
    timezone = None

    try:
        with httpx.Client() as client:
            response = client.get(forecast_url, params=forecast_params)
            response.raise_for_status()
            data = response.json()
            elevation = data.get("elevation")
            timezone = data.get("timezone")
    except httpx.HTTPStatusError as e:
        print(f"Error fetching forecast data for {latitude},{longitude}: {e}")
    except Exception as e:
        print(f"An error occurred: {e}")


    # 2. Get historical climate data from the Climate API
    climate_url = "https://climate-api.open-meteo.com/v1/climate"
    climate_params = {
        "latitude": latitude,
        "longitude": longitude,
        "start_date": "1991-01-01",
        "end_date": "2020-12-31",
        "models": "MRI_AGCM3_2_S",
        "daily": "temperature_2m_mean,precipitation_sum",
    }

    monthly_avg = None

    try:
        with httpx.Client() as client:
            response = client.get(climate_url, params=climate_params)
            response.raise_for_status()
            data = response.json()

            df = pl.DataFrame({
                "date": data["daily"]["time"],
                "temperature": data["daily"]["temperature_2m_mean"],
                "precipitation": data["daily"]["precipitation_sum"],
            })

            df = df.with_columns(pl.col("date").str.to_date("%Y-%m-%d"))

            monthly_avg = df.group_by(df['date'].dt.month()).agg([
                pl.mean('temperature').alias('avg_temp'),
                pl.sum('precipitation').alias('total_precip') / 30, # Approximate monthly total
            ]).sort("date")

    except httpx.HTTPStatusError as e:
        print(f"Error fetching climate data for {latitude},{longitude}: {e}")
    except Exception as e:
        print(f"An error occurred: {e}")

    return {
        "elevation": elevation,
        "timezone": timezone,
        "climate": monthly_avg.to_dicts() if monthly_avg is not None else None,
    }


if __name__ == "__main__":
    # Load production airports data
    with open("prod/airports.json", "r") as f:
        prod_airports = json.load(f)

    # Load development airports data to see what's already processed
    try:
        with open("dev/airports.json", "r") as f:
            dev_airports = json.load(f)
    except FileNotFoundError:
        dev_airports = []

    processed_codes = {airport['code'] for airport in dev_airports}

    unprocessed_airports = [
        airport for airport in prod_airports if airport['code'] not in processed_codes
    ]

    print(f"Found {len(prod_airports)} total airports.")
    print(f"Found {len(dev_airports)} already processed airports.")
    print(f"Processing {len(unprocessed_airports)} new airports.")

    if not unprocessed_airports:
        print("All airports are already processed.")
    else:
        # Process in batches of 10 to avoid timeouts
        batch_size = 10
        for i in range(0, len(unprocessed_airports), batch_size):
            batch = unprocessed_airports[i:i+batch_size]

            for airport in batch:
                print(f"Fetching data for {airport['name']} ({airport['code']})...")
                climate_data = get_airport_climate_data(airport["lat"], airport["lng"])
                airport.update(climate_data)
                dev_airports.append(airport)

            # Save progress after each batch
            with open("dev/airports.json", "w") as f:
                json.dump(dev_airports, f, indent=2)

            print(f"\nProcessed batch {i//batch_size + 1}. Saved progress to dev/airports.json")

    print("\nSuccessfully updated airports.json with new climate data.")

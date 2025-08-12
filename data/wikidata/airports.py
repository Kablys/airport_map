import marimo

__generated_with = "0.14.17"
app = marimo.App(width="medium")


@app.cell
def _():
    import httpx
    import json
    return (httpx,)


@app.cell
def _(httpx):
    def wikidata_airports():
        """Quick test to fetch some major airports."""

        # Simple query for top 10 busiest airports
        query = """
        SELECT ?airport ?airportLabel ?iata ?coord WHERE {
          ?airport wdt:P31/wdt:P279* wd:Q1248784 .  # instance of airport
          ?airport wdt:P238 ?iata .                  # has IATA code
          ?airport wdt:P625 ?coord .                 # has coordinates
      
          # Filter for some well-known airports
          FILTER(?iata IN ("LAX", "JFK", "LHR", "CDG", "DXB", "NRT", "SIN", "AMS", "FRA", "MAD"))
      
          SERVICE wikibase:label { 
            bd:serviceParam wikibase:language "en" . 
          }
        }
        """

        headers = {"User-Agent": "Airport Test/1.0", "Accept": "application/sparql-results+json"}

        params = {"query": query, "format": "json"}

        response = httpx.get("https://query.wikidata.org/sparql", params=params, headers=headers, timeout=30.0)

        if response.status_code == 200:
            data = response.json()
            airports = []

            for binding in data["results"]["bindings"]:
                coord_str = binding["coord"]["value"]
                # Parse "Point(longitude latitude)"
                coords = coord_str.replace("Point(", "").replace(")", "").split()

                airport = {
                    "name": binding["airportLabel"]["value"],
                    "iata": binding["iata"]["value"],
                    "latitude": float(coords[1]),
                    "longitude": float(coords[0]),
                }
                airports.append(airport)

            print(f"Found {len(airports)} airports:")
            for airport in sorted(airports, key=lambda x: x["iata"]):
                print(f"  {airport['iata']}: {airport['name']} ({airport['latitude']:.2f}, {airport['longitude']:.2f})")

            return airports
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
            return []
    wikidata_airports()
    return


if __name__ == "__main__":
    app.run()

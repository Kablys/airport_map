import marimo

__generated_with = "0.14.16"
app = marimo.App(width="medium")


@app.cell
def _():
    import json
    import time
    from pathlib import Path

    import httpx
    import marimo as mo
    import polars as pl

    client = httpx.Client(base_url="https://www.ryanair.com/api/", timeout=30)
    out_dir = Path(__file__).parent / "prod"
    # Only `python ryanair.py` writes prod/; opening the notebook must not refetch ~235 routes or overwrite data
    write_enabled = mo.app_meta().mode == "script"
    return client, json, mo, out_dir, pl, time, write_enabled


@app.cell
def _(mo):
    mo.md(r"""# Ryanair""")
    return


@app.cell
def _(mo):
    mo.md(
        r"""
    todos:

    - [ ] farfnd/v4/oneWayFares
    - [ ] pagination nextPage, size
    - [ ] Look more into https://github.com/cohaolain/ryanair-py/blob/develop/ryanair/ryanair.py
    """
    )
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""## Reproduce data""")
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
    ### Airpots
    ```json
    {
        "name": "Dublin",
        "code": "DUB",
        "country": "Ireland",
        "lat": 53.4213,
        "lng": -6.2701,
        "city": "Dublin",
        "flag": "🇮🇪"
    }
    ```
    """
    )
    return


@app.cell
def _(client):
    all_airport_info = client.get("views/locate/5/airports/en/active").raise_for_status().json()
    return (all_airport_info,)


@app.cell
def _():
    def get_flag_emoji(country_code: str | None) -> str | None:
        """Converts a 2-letter country code to its flag emoji."""
        if country_code and len(country_code) == 2:
            return "".join(chr(0x1F1E6 + ord(c) - ord("A")) for c in country_code.upper())
        return None

    get_flag_emoji("lt")
    return (get_flag_emoji,)


@app.cell
def _(all_airport_info, get_flag_emoji, pl):
    transformed_airport_list = pl.json_normalize(all_airport_info).select(
        pl.col("name"),
        pl.col("code"),
        pl.col("city.name").alias("city"),
        pl.col("country.name").alias("country"),
        pl.col("coordinates.latitude").alias("lat"),
        pl.col("coordinates.longitude").alias("lng"),
        pl.col("country.code").map_elements(get_flag_emoji, return_dtype=pl.String).alias("flag"),
    )
    transformed_airport_list
    return (transformed_airport_list,)


@app.cell
def _(mo, out_dir, transformed_airport_list, write_enabled):
    mo.stop(not write_enabled, mo.md("Run `uv run python ryanair.py` to write `prod/`."))
    transformed_airport_list.write_json(out_dir / "airports.json")
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
    ### Routes
    ```json
    "VNO": ["STN", "AMS", "CRL", "PRG", "ATH", "BER", "ARN", "CPH", "DUB", "BCN", "FCO", "BVA", "KUN", "RIX"],
    ```
    """
    )
    return


@app.cell
def _(client, mo, time, transformed_airport_list, write_enabled):
    mo.stop(not write_enabled, mo.md("Route fetching only runs via `uv run python ryanair.py`."))
    routes = {}
    for code in mo.status.progress_bar(transformed_airport_list["code"].to_list()):
        airport_dest = client.get(f"views/locate/searchWidget/routes/lt/airport/{code}").raise_for_status().json()
        routes[code] = [airport["arrivalAirport"]["code"] for airport in airport_dest]
        time.sleep(1)
    return (routes,)


@app.cell
def _(json, out_dir, routes):
    (out_dir / "routes.json").write_text(json.dumps(routes))
    return


if __name__ == "__main__":
    app.run()

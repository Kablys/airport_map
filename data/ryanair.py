import marimo

__generated_with = "0.14.16"
app = marimo.App(width="medium")


@app.cell
def _():
    import httpx
    import marimo as mo
    import polars as pl
    import datetime as dt

    base_url = "https://www.ryanair.com/api/"
    return base_url, dt, httpx, mo, pl


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


@app.cell
def _(base_url, httpx):
    airport_info = httpx.get(base_url + "views/locate/5/airports/lt/VNO")
    airport_info.json()
    return


@app.cell
def _(base_url, httpx):
    # Something like this
    # London Stansted
    # Sept 2 - 9
    # 1 hr 30 min
    # From €34 Return
    _base_url = base_url + "farfnd/v4/roundTripFares"
    _params = {
        "market": "en-gb",
        "adultPaxCount": "1",
        "departureAirportIataCode": "KIR",
        # Sets when and for how long to visit
        "outboundDepartureDateFrom": "2025-09-01",
        "outboundDepartureDateTo": "2025-09-28",
        "inboundDepartureDateFrom": "2025-09-03",
        "inboundDepartureDateTo": "2025-09-30",
        "durationFrom": "2",
        "durationTo": "7",
        "outboundDepartureDaysOfWeek": "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY,SUNDAY",
        "outboundDepartureTimeFrom": "00:00",
        "outboundDepartureTimeTo": "23:59",
        "inboundDepartureTimeFrom": "00:00",
        "inboundDepartureTimeTo": "23:59",
        # 'priceValueTo': '200'
        # 'currency': 'EUR'
        # 'arrivalAirportCategoryCodes': 'CTY,FAM,GLF,NIT,OUT,SEA' # these are all, now would be same as skipping this param.
    }
    airport_destinations_offers = httpx.get(_base_url, params=_params)
    airport_destinations_offers.json()
    return


@app.cell
def _(base_url, httpx):
    time_table = httpx.get(base_url + "timtbl/3/schedules/VNO/ARN/years/2025/months/8")
    time_table.json()
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
        "flag": "\ud83c\uddee\ud83c\uddea"
    }
    ```
    """
    )
    return


@app.cell
def _(base_url, httpx):
    all_airport_info = httpx.get(base_url + "views/locate/5/airports/en/active").json()
    return (all_airport_info,)


@app.cell
def _(all_airport_info, pl):
    pl.json_normalize(all_airport_info)
    return


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
        # pl.col("city.code").apply(_get_flag_emoji, return_dtype=pl.String).alias("flag"),
        pl.col("country.code").alias("flag")#.apply(_get_flag_emoji, return_dtype=pl.String).alias("flag")

    ).with_columns(
        pl.col("flag").map_elements(lambda x: get_flag_emoji(x), return_dtype=pl.String)
    ); transformed_airport_list
    return (transformed_airport_list,)


@app.cell(disabled=True)
def _(transformed_airport_list):
    transformed_airport_list.write_json("airports.json")
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
def _(base_url, httpx):
    airport_destinations = httpx.get(base_url + "views/locate/searchWidget/routes/lt/airport/VNO")
    airport_destinations.json()
    return (airport_destinations,)


@app.cell
def _(airport_destinations):
    [airport["arrivalAirport"]["code"] for airport in airport_destinations.json()]
    return


@app.cell(disabled=True)
def _(base_url, httpx, mo, transformed_airport_list):
    import time
    routes = {}
    for code in mo.status.progress_bar(transformed_airport_list["code"].to_list()):
        # print(code);continue
        airport_dest = httpx.get(base_url + f"views/locate/searchWidget/routes/lt/airport/{code}").json()
        routes[code] = [airport["arrivalAirport"]["code"] for airport in airport_dest]
        time.sleep(1)
    routes
    return (routes,)


@app.cell
def _(routes):
    import json
    with open("routes.json", "w") as file:
        json.dump(routes, file)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""# WizzAir""")
    return


@app.cell
def _(httpx):
    wiz_deals = httpx.post(
        "https://be.wizzair.com/27.22.0/Api/search/SmartSearchCheapFlights",
        headers={
            "accept": "application/json, text/plain, */*",
            "content-type": "application/json",
        },
        json={
            "arrivalStations": None,
            "departureStations": ["VNO"],
            "tripDuration": "1 week",
            "isReturnFlight": True,
            "stdPlan": None,
            "pax": 1,
            "dateFilterType": "Flexible",
            "departureDate": None,
            "returnDate": None,
        },
    )

    wiz_deals.json()
    return


@app.cell
def _(httpx):
    wiz_map = httpx.get("https://be.wizzair.com/27.22.0/Api/asset/map?languageCode=en-gb")
    wiz_map.json()
    return (wiz_map,)


@app.cell
def _(dt, pl):
    df = pl.DataFrame(
        {
            "name": ["Alice Archer", "Ben Brown", "Chloe Cooper", "Daniel Donovan"],
            "birthdate": [
                dt.date(1997, 1, 10),
                dt.date(1985, 2, 15),
                dt.date(1983, 3, 22),
                dt.date(1981, 4, 30),
            ],
            "weight": [57.9, 72.5, 53.6, 83.1],  # (kg)
            "height": [1.56, 1.77, 1.65, 1.75],  # (m)
        }
    )

    print(df)
    return


@app.cell
def _(pl, wiz_map):
    pl.DataFrame(wiz_map.json()["cities"])
    return


if __name__ == "__main__":
    app.run()

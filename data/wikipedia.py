"""Airline routes from English Wikipedia's "Airlines and destinations" tables, for airlines whose own sites block scripts.

Every airport article lists, per airline, the destinations flown from it (`{{Airport destination list}}`), with
'''Seasonal:''' and '''Charter:''' groups and "(begins …)" / "(ends …)" notes. The tables are crowd-edited but must
cite sources; they have no days of the week. Airport links are mapped to IATA codes through OurAirports'
`wikipedia_link` column. Text is CC BY-SA 4.0.
"""

import json
import re
from datetime import date, datetime
from pathlib import Path
from urllib.parse import unquote

import httpx
import mwparserfromhell
import polars as pl
from mwparserfromhell.nodes import Tag, Template, Text, Wikilink

from airlines import AirlineNetwork, AirportInfo, progress

API = "https://en.wikipedia.org/w/api.php"
CACHE_DIR = Path(__file__).parent / ".cache"
BATCH = 50  # MediaWiki's limit of titles per query
TEMPLATES = {"airport destination list", "airport-dest-list"}
# Countries whose airports we read; the destinations they list reach further (Morocco, Egypt, …)
EUROPE_EXTRA = {"TR", "CY"}  # OurAirports puts Turkey and Cyprus in Asia

ENDS = re.compile(r"\(ends ([^)]+)\)", re.IGNORECASE)


def _title(link: str) -> str:
    """Article title from a Wikipedia URL or link target, the way MediaWiki normalizes it."""
    title = unquote(link.rsplit("/wiki/", 1)[-1]).replace("_", " ").split("#")[0].strip()
    return title[:1].upper() + title[1:]


def _ended(note: str, today: date) -> bool:
    match = ENDS.search(note)
    if not match:
        return False
    for fmt in ("%d %B %Y", "%B %d, %Y", "%B %Y"):
        try:
            return datetime.strptime(match.group(1).strip(), fmt).date() < today
        except ValueError:
            continue
    return False  # unparsable date: keep the route rather than guess


def destinations(cell: mwparserfromhell.wikicode.Wikicode, today: date) -> list[str]:
    """Linked destinations in one table cell, without charter-only ones and ones that have ended."""
    found: list[str] = []
    charter = False
    nodes = list(cell.nodes)  # mwparserfromhell's own list type breaks on slices
    for i, node in enumerate(nodes):
        # Group labels like '''Seasonal:''', '''Charter:''', '''Seasonal charter:''' switch the group
        label = str(node.contents) if isinstance(node, Tag) and node.wiki_markup else str(node)
        if isinstance(node, (Tag, Text)) and label.strip().endswith(":"):
            charter = "charter" in label.lower()
        elif isinstance(node, Wikilink) and not charter:
            after = "".join(str(n) for n in nodes[i + 1 : i + 3] if isinstance(n, Text))
            if not _ended(after, today):
                found.append(_title(str(node.title)))
    return found


def parse_article(wikitext: str, today: date) -> dict[str, list[str]]:
    """Airline article title -> destination article titles, from an airport article's passenger tables."""
    code = mwparserfromhell.parse(wikitext)
    routes: dict[str, list[str]] = {}
    for section in code.get_sections(flat=True, include_lead=True):
        headings = section.filter_headings(recursive=False)
        if headings and "cargo" in str(headings[0].title).lower():
            continue
        for template in section.filter_templates(recursive=False):
            name = str(template.name.strip_code()).strip().lower()  # names can carry <!-- comments -->
            if not isinstance(template, Template) or name not in TEMPLATES:
                continue
            width = 3 if template.has("3rdcoltitle") else 2
            cells = [p.value for p in template.params if not p.showkey]
            for row in range(0, len(cells) - 1, width):
                airline_links = cells[row].filter_wikilinks()
                if airline_links:
                    airline = _title(str(airline_links[0].title))
                    routes.setdefault(airline, []).extend(destinations(cells[row + 1], today))
    return routes


def _query(client: httpx.Client, titles: list[str], **params: str) -> list[dict]:
    """Pages for up to BATCH titles, following redirects and continuation."""
    pages: list[dict] = []
    extra: dict[str, str] = {}
    while True:
        query = {
            "action": "query",
            "format": "json",
            "formatversion": "2",
            "redirects": "1",
            "titles": "|".join(titles),
        }
        response = client.get(API, params={**query, **params, **extra}).raise_for_status().json()
        pages += response.get("query", {}).get("pages", [])
        redirects = response.get("query", {}).get("redirects", [])
        for r in redirects:  # remember where redirect sources went, for mapping links
            pages.append({"redirect_from": r["from"], "title": r["to"]})
        if "continue" not in response:
            return pages
        extra = response["continue"]


def canonical_titles(client: httpx.Client, titles: set[str]) -> dict[str, str]:
    """Each title -> the article it lands on after redirects."""
    resolved = {t: t for t in titles}
    ordered = sorted(titles)
    for i in progress(list(range(0, len(ordered), BATCH)), "Wikipedia titles"):
        for page in _query(client, ordered[i : i + BATCH]):
            if "redirect_from" in page:
                resolved[page["redirect_from"]] = page["title"]
    return resolved


def airport_articles(reference: pl.DataFrame) -> dict[str, str]:
    """Article title -> IATA for airports with scheduled service, from OurAirports."""
    rows = reference.filter(
        (pl.col("iata_code").str.len_chars() == 3)
        & (pl.col("scheduled_service") == "yes")
        & pl.col("wikipedia_link").str.contains("en.wikipedia.org")
    )
    return {_title(row["wikipedia_link"]): row["iata_code"] for row in rows.iter_rows(named=True)}


def fetch_wikitext(client: httpx.Client, titles: list[str]) -> dict[str, str]:
    """Article wikitext by title, cached for the day in .cache/ so a re-run doesn't refetch."""
    cache_file = CACHE_DIR / f"wikipedia-{date.today()}.json"
    cached: dict[str, str] = json.loads(cache_file.read_text()) if cache_file.exists() else {}
    missing = [t for t in titles if t not in cached]
    for i in progress(list(range(0, len(missing), BATCH)), "Wikipedia airport articles"):
        for page in _query(client, missing[i : i + BATCH], prop="revisions", rvprop="content", rvslots="main"):
            if "revisions" in page:
                cached[page["title"]] = page["revisions"][0]["slots"]["main"]["content"]
        CACHE_DIR.mkdir(exist_ok=True)
        cache_file.write_text(json.dumps(cached))
    return cached


def wikipedia(client: httpx.Client, ourairports: pl.DataFrame, airlines: dict[str, str]) -> list[AirlineNetwork]:
    """Networks of `airlines` (Wikipedia article title -> IATA code; several titles may share a code)."""
    europe = ourairports.filter((pl.col("continent") == "EU") | pl.col("iso_country").is_in(EUROPE_EXTRA))
    articles = airport_articles(europe)
    everywhere = airport_articles(ourairports)
    wikitext = fetch_wikitext(client, sorted(articles))
    tables = {title: parse_article(text, date.today()) for title, text in wikitext.items()}
    links = {d for table in tables.values() for dests in table.values() for d in dests}
    airline_links = {a for table in tables.values() for a in table}
    resolved = canonical_titles(client, links | airline_links | set(everywhere))
    iata = {resolved[title]: code for title, code in everywhere.items()}
    origin_iata = {resolved.get(title, title): code for title, code in articles.items()}

    routes: dict[str, dict[str, set[str]]] = {code: {} for code in set(airlines.values())}
    unmapped: set[str] = set()
    for title, table in tables.items():
        origin = origin_iata.get(title)
        for airline, dests in table.items():
            code = airlines.get(resolved.get(airline, airline))
            if not origin or not code:
                continue
            for dest in dests:
                target = iata.get(resolved.get(dest, dest))
                if target and target != origin:
                    # Tables list both ends only when both airports are in Europe; flights go both ways
                    routes[code].setdefault(origin, set()).add(target)
                    routes[code].setdefault(target, set()).add(origin)
                elif not target:
                    unmapped.add(dest)
    if unmapped:
        print(f"Wikipedia: {len(unmapped)} destination links not mapped to an airport, e.g. {sorted(unmapped)[:8]}")
    names = {
        row["iata_code"]: AirportInfo(name=row["name"], city=row["municipality"] or row["name"])
        for row in ourairports.filter(pl.col("iata_code").str.len_chars() == 3).iter_rows(named=True)
    }
    return [
        AirlineNetwork(
            code=code,
            airports={c: names[c] for c in set(r) | {d for ds in r.values() for d in ds} if c in names},
            routes=r,
        )
        for code, r in sorted(routes.items())
    ]

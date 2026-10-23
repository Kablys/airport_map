from datetime import date

from wikipedia import parse_article

ARTICLE = """
==Airlines and destinations==
===Passenger===
{{Airport-dest-list
<!-- -->
| [[easyJet]] | [[Gatwick Airport|London–Gatwick]], [[Milan Malpensa Airport|Milan–Malpensa]] (ends 1 March 2026) <br />
'''Seasonal:''' [[Palma de Mallorca Airport|Palma de Mallorca]] (begins 2 May 2027)
| [[Jet2.com]] | '''Seasonal charter:''' [[Antalya Airport|Antalya]]
| [[Ryanair]] | [[Orio al Serio International Airport|Bergamo]]<ref>{{cite web|url=x}}</ref> <br />
'''Charter:''' [[Tivat Airport|Tivat]] <br />
'''Seasonal:''' [[Tenerife South Airport|Tenerife–South]]
}}
===Cargo===
{{Airport-dest-list
| [[DHL Aviation]] | [[Leipzig/Halle Airport|Leipzig/Halle]]
}}
"""


def test_reads_passenger_routes_without_charters_cargo_or_ended_ones():
    assert parse_article(ARTICLE, date(2026, 10, 20)) == {
        "EasyJet": ["Gatwick Airport", "Palma de Mallorca Airport"],
        "Jet2.com": [],
        "Ryanair": ["Orio al Serio International Airport", "Tenerife South Airport"],
    }


def test_reads_three_column_tables():
    article = """{{Airport destination list
| 3rdcoltitle = Refs
| [[Wizz Air]] | [[Luton Airport|London–Luton]] | <ref>x</ref>
| [[Ryanair]] | [[Dublin Airport|Dublin]] | <ref>y</ref>
}}"""
    assert parse_article(article, date(2026, 10, 20)) == {
        "Wizz Air": ["Luton Airport"],
        "Ryanair": ["Dublin Airport"],
    }

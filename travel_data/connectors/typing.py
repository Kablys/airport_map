from __future__ import annotations
from pydantic import BaseModel


class CityQuery(BaseModel):
    city: str
    country: str

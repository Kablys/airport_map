from __future__ import annotations
from typing import Any
from ..utils.http import get_json

BASE = 'https://api.exchangerate.host/latest'


def latest(base: str = 'USD') -> dict[str, Any]:
	return get_json(BASE, params={'base': base})
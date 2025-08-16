from __future__ import annotations
import json
import os
from datetime import datetime
from typing import Any


def save_json(data: dict[str, Any], out_dir: str, city: str, country: str) -> str:
	os.makedirs(out_dir, exist_ok=True)
	fname = f"{city.replace(' ','_')}-{country.replace(' ','_')}-{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}.json"
	path = os.path.join(out_dir, fname)
	with open(path, 'w', encoding='utf-8') as f:
		json.dump(data, f, ensure_ascii=False, indent=2)
	return path
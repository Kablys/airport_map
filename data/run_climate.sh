#!/bin/bash
set -e

# Setup virtual environment
uv venv --seed
source .venv/bin/activate
uv sync

# Run the python script
python3 climate.py

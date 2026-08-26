import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent.parent.parent / "data" / "sample"

def load_vessels():
    with open(DATA_DIR / "vessels.json") as f:
        return json.load(f)

def load_icebergs():
    with open(DATA_DIR / "icebergs.json") as f:
        return json.load(f)

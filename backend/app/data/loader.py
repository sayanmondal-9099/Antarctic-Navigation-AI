import json
from pathlib import Path

def _resolve_data_dir() -> Path:
    p = Path(__file__).resolve().parent.parent.parent.parent / "data" / "sample"
    if p.exists():
        return p
    p = Path(__file__).resolve().parent.parent.parent / "data" / "sample"
    if p.exists():
        return p
    if Path("/app/data/sample").exists():
        return Path("/app/data/sample")
    return p

DATA_DIR = _resolve_data_dir()

def load_vessels():
    with open(DATA_DIR / "vessels.json") as f:
        return json.load(f)

def load_icebergs():
    with open(DATA_DIR / "icebergs.json") as f:
        return json.load(f)

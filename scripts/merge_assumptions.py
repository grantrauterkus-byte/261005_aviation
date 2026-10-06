"""One-time script: merge the researched CSV parts into data/assumptions.csv and
data/price_points.csv, then check them.

Run from the repo root:  python3 -I scripts/merge_assumptions.py <parts_dir>
<parts_dir> holds g*.csv (assumption rows) and g*.prices.csv (price points).
"""
import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COLS = ["id", "item", "jet", "applies_to", "value", "low", "high", "unit", "type",
        "source_name", "source_url", "source_date", "confidence", "notes"]
PRICE_COLS = ["jet", "build_year", "price", "kind", "source_name", "source_url", "source_date", "notes"]
JETS = {
    "Citation XLS": "Midsize", "Citation Latitude": "Midsize", "Citation Sovereign": "Midsize",
    "Hawker 800XP": "Midsize", "Learjet 60": "Midsize", "Challenger 300": "Super-midsize",
    "Challenger 350": "Super-midsize", "Gulfstream G280": "Super-midsize",
    "Embraer Praetor 600": "Super-midsize", "Citation X": "Super-midsize",
}
PLANE_KEYS = ["range_4_pax", "cruise_speed", "seats", "cabin_height", "cabin_width", "cabin_length",
              "stand_up_cabin", "flat_floor", "enclosed_lavatory", "bag_space", "takeoff_distance",
              "fuel_burn", "maintenance_per_hour", "engine_reserve_per_hour", "purchase_price",
              "yearly_value_loss", "charter_rate"]
# Sensible ranges per class: (midsize, super-midsize)
RANGES = {
    "range_4_pax": ((1500, 3000), (2800, 4300)),
    "cruise_speed": ((400, 480), (430, 530)),
    "seats": ((6, 10), (8, 12)),
    "cabin_height": ((56, 74), (68, 76)),
    "cabin_width": ((58, 80), (68, 86)),
    "cabin_length": ((200, 330), (230, 340)),
    "bag_space": ((40, 140), (70, 160)),
    "takeoff_distance": ((3500, 6000), (4000, 6000)),
    "fuel_burn": ((180, 340), (200, 400)),
    "maintenance_per_hour": ((500, 2000), (600, 2500)),
    "engine_reserve_per_hour": ((300, 1200), (400, 1500)),
    "purchase_price": ((1_000_000, 20_000_000), (2_000_000, 30_000_000)),
    "yearly_value_loss": ((3, 15), (3, 15)),
    "charter_rate": ((4000, 12000), (5000, 14000)),
}
VALID = {"applies_to": {"Plane-specific", "Class-wide", "Same for all"},
         "type": {"Measured", "Published", "Our assumption"},
         "confidence": {"High", "Medium", "Low"}}


def num(s):
    try:
        return float(str(s).replace(",", "").replace("$", "").replace("%", ""))
    except ValueError:
        return None


def main(parts):
    parts = Path(parts)
    rows, prices = [], []
    for f in sorted(parts.glob("g*.csv")):
        target = prices if f.name.endswith(".prices.csv") else rows
        with open(f, newline="", encoding="utf-8") as fh:
            for r in csv.DictReader(fh):
                target.append({k: (r.get(k) or "").strip() for k in (PRICE_COLS if target is prices else COLS)})

    problems = []
    seen = {}
    for r in rows:
        if r["id"] in seen:
            problems.append(f"Duplicate id {r['id']}")
        seen[r["id"]] = r
        for col, ok in VALID.items():
            if r[col] not in ok:
                problems.append(f"{r['id']}: {col} '{r[col]}' not allowed")
        if not r["source_url"] and r["type"] != "Our assumption":
            problems.append(f"{r['id']}: no source link and not marked Our assumption")
        if r["value"] == "":
            problems.append(f"{r['id']}: empty value")
        key = r["id"].split(".", 1)[1] if "." in r["id"] else ""
        if r["jet"] in JETS and key in RANGES and r["value"] != "Not found":
            lo, hi = RANGES[key][0 if JETS[r["jet"]] == "Midsize" else 1]
            for col in ("value", "low", "high"):
                v = num(r[col])
                if r[col] and (v is None or not lo <= v <= hi):
                    problems.append(f"{r['id']}: {col} {r[col]} outside {lo}-{hi}")
    for jet in JETS:
        slug = jet.lower().replace(" ", "-")
        for k in PLANE_KEYS:
            if f"{slug}.{k}" not in seen:
                problems.append(f"Missing {slug}.{k}")

    with open(ROOT / "data" / "assumptions.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=COLS)
        w.writeheader()
        w.writerows(rows)
    with open(ROOT / "data" / "price_points.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=PRICE_COLS)
        w.writeheader()
        w.writerows(sorted(prices, key=lambda p: (p["jet"], p["build_year"], p["kind"])))

    print(f"{len(rows)} assumption rows, {len(prices)} price points")
    print("\n".join(problems) if problems else "No problems found")


if __name__ == "__main__":
    main(sys.argv[1])

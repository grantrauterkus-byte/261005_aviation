"""One-time script: build data/model_map.csv, data/fleet_summary.csv and
data/fleet_by_build_year.csv from the FAA aircraft registry download.

Inputs (git-ignored): data/raw/faa/{ACFTREF,MASTER,DEREG,DOCINDEX}.txt
from https://registry.faa.gov/database/ReleasableAircraft.zip

Run from the repo root:  python3 -I scripts/build_fleet_summary.py
"""
import csv
import collections
import datetime
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "faa"
OUT = ROOT / "data"

# Sales window: the last 5 full years before the registry snapshot (2 Oct 2026).
WINDOW_START = "20211001"
WINDOW_END = "20260930"

WIKI_SOVEREIGN = "https://en.wikipedia.org/wiki/Cessna_Citation_Sovereign"
WIKI_EXCEL = "https://en.wikipedia.org/wiki/Cessna_Citation_Excel"
WIKI_X = "https://en.wikipedia.org/wiki/Cessna_Citation_X"
WIKI_CL300 = "https://en.wikipedia.org/wiki/Bombardier_Challenger_300"
FI_CL300 = "https://www.flugzeuginfo.net/acdata_php/acdata_challenger300_dt.php"
WIKI_EMB = "https://en.wikipedia.org/wiki/Embraer_Legacy_450/500_and_Praetor_500/600"
REGISTRY = "https://registry.faa.gov/database/ReleasableAircraft.zip"

# Each jet: FAA model codes, an optional serial-number range (numeric part of
# the serial, last 4-5 digits), an optional build-year range, and where the
# split comes from.
JETS = [
    dict(jet="Citation XLS", role="Main list",
         codes="2076702 2076704 2076710 2076703 2076745", ser=(5501, 5999),
         rule="Model 560XL serials 560-5501 to 560-5830. Excel is 560-5001 to 560-5373, XLS+ starts at 560-6001.",
         src=WIKI_EXCEL,
         note="FAA files Excel, XLS and XLS+ under one model (560XL). Split by the serial-number gaps visible in the registry (5373 to 5501, 5830 to 6001), which match the production counts on Wikipedia (308 Excel, 330 XLS)."),
    dict(jet="Citation Latitude", role="Main list", codes="2076813 2076814 2076816 2076817",
         rule="All Model 680A aircraft.", src=REGISTRY, note="One FAA model, one jet."),
    dict(jet="Citation Sovereign", role="Main list", codes="2076811 2076815 2076821", ser=(1, 500),
         rule="Model 680 serials 680-0001 to 680-0500. Sovereign+ starts at 680-0501.", src=WIKI_SOVEREIGN,
         note="Sovereign+ (newer, more expensive) excluded so prices match one model."),
    dict(jet="Hawker 800XP", role="Main list", codes="4220000 7150012 7450006",
         rule="FAA model names HAWKER 800XP (all three manufacturer codes).", src=REGISTRY,
         note="Hawker 850XP and 900XP have their own FAA model names and are excluded."),
    dict(jet="Learjet 60", role="Main list", codes="5170707 5170710",
         rule="Model 60 and 60 XR.", src=REGISTRY,
         note="60XR is an avionics and interior update of the same airframe. FAA files most XRs as model 60, so they are counted together."),
    dict(jet="Challenger 300", role="Main list", codes="1390044 1390050", ser=(20001, 20500),
         rule="Model BD-100-1A10 serials 20003 to 20500.", src=FI_CL300,
         note="Challenger 300, 350 and 3500 share one FAA model. Serials up to 20500 are Challenger 300."),
    dict(jet="Challenger 350", role="Main list", codes="1390044 1390050", ser=(20501, 20900),
         rule="Model BD-100-1A10 serials 20501 to 20900.", src=FI_CL300,
         note="Starts at 20501 (published). End at 20900 is our split: the registry shows a jump from 20897 (2021) to 20901 (2022), when Challenger 3500 deliveries began. Challenger 3500 (20901 and up) excluded."),
    dict(jet="Gulfstream G280", role="Main list", codes="3980218 4500314",
         rule="FAA model name GULFSTREAM G280.", src=REGISTRY, note="One jet."),
    dict(jet="Embraer Praetor 600", role="Main list", codes="3260425 3260426 3260450", ser=(55020001, 55029999),
         rule="Model EMB-550 serials 55020001 and up.", src=REGISTRY,
         note="Legacy 500 and Praetor 600 share model EMB-550. Registry shows Legacy 500 serials 55000xxx (2012-2020) and a new series 55020xxx from 2019, when Praetor 600 deliveries began (Wikipedia). Split is our reading of the registry."),
    dict(jet="Citation X", role="Main list", codes="2076809 2076810 2076820", ser=(1, 499),
         rule="Model 750 serials 750-0001 to 750-0499. Citation X+ starts at 750-0501.", src=WIKI_X,
         note="Citation X+ (29 built, much higher price) excluded. Split by the serial gap visible in the registry, which matches Wikipedia's 310 X / 29 X+ count."),
    # Alternates
    dict(jet="Gulfstream G200", role="Alternate",
         codes="4500105 4500311 3980401 4500307 3980304 3980202 3980211 4500107 4500308 4500400",
         rule="FAA model names G200, GULFSTREAM 200, GALAXY.", src=REGISTRY,
         note="Galaxy is the original name of the G200; counted together."),
    dict(jet="Embraer Legacy 500", role="Alternate", codes="3260425 3260426 3260450", ser=(55000001, 55009999),
         rule="Model EMB-550 serials 55000001 to 55009999.", src=REGISTRY, note="See Praetor 600."),
    dict(jet="Embraer Legacy 450", role="Alternate", codes="3260400 3260418 3260421", yrs=(2015, 2019),
         rule="Model EMB-545 built 2015 to 2019.", src=WIKI_EMB,
         note="Praetor 500 (EMB-545 from late 2019) excluded by build year; this split is approximate."),
    dict(jet="Citation Longitude", role="Alternate", codes="2076819",
         rule="Model 700.", src=REGISTRY, note="One jet."),
]


def num(serial):
    digits = re.sub(r"\D", "", serial)
    return int(digits) if digits else -1


def read(name):
    with open(RAW / name, encoding="utf-8-sig", errors="replace", newline="") as f:
        r = csv.reader(f)
        header = [h.strip() for h in next(r)]
        for row in r:
            yield dict(zip(header, (x.strip() for x in row)))


def matches(j, code, serial, year):
    if code not in j["codes"].split():
        return False
    if "ser" in j:
        n = num(serial)
        if j["ser"][0] >= 55000000:
            pass  # Embraer serials are 8 digits, compare whole number
        else:
            n = n % 100000 if j["ser"][1] > 9999 else n % 10000
        if not j["ser"][0] <= n <= j["ser"][1]:
            return False
    if "yrs" in j:
        if not year.isdigit() or not j["yrs"][0] <= int(year) <= j["yrs"][1]:
            return False
    return True


def jet_for(code, serial, year):
    for j in JETS:
        if matches(j, code, serial, year):
            return j["jet"]
    return None


def first_registration(cert_date, airworthy_date, year):
    """True when the certificate looks like the first US registration of a new
    aircraft (issued within 18 months of the airworthiness date or build year)."""
    if len(cert_date) != 8:
        return True
    c = datetime.date(int(cert_date[:4]), int(cert_date[4:6]), int(cert_date[6:]))
    if len(airworthy_date) == 8:
        a = datetime.date(int(airworthy_date[:4]), int(airworthy_date[4:6]), int(airworthy_date[6:]))
        return (c - a).days < 548
    return year.isdigit() and int(cert_date[:4]) <= int(year) + 1


def main():
    ref = {r["CODE"]: r for r in read("ACFTREF.txt")}
    fleet = collections.Counter()
    by_year_fleet = collections.Counter()
    sales = collections.Counter()
    by_year_sales = collections.Counter()
    nnum_jet = {}

    for r in read("MASTER.txt"):
        jet = jet_for(r["MFR MDL CODE"], r["SERIAL NUMBER"], r["YEAR MFR"])
        if not jet:
            continue
        year = r["YEAR MFR"]
        nnum_jet[r["N-NUMBER"]] = jet
        if r["STATUS CODE"] in ("V", "M"):
            fleet[jet] += 1
            by_year_fleet[(jet, year)] += 1
        cert = r["CERT ISSUE DATE"]
        if WINDOW_START <= cert <= WINDOW_END and not first_registration(cert, r["AIR WORTH DATE"], year):
            sales[jet] += 1
            by_year_sales[(jet, year)] += 1

    exports = collections.Counter()
    for r in read("DEREG.txt"):
        jet = jet_for(r["MFR-MDL-CODE"], r["SERIAL-NUMBER"], r["YEAR-MFR"])
        if not jet:
            continue
        if WINDOW_START <= r["CANCEL-DATE"] <= WINDOW_END and r["EXP-COUNTRY"]:
            sales[jet] += 1
            exports[jet] += 1
            by_year_sales[(jet, r["YEAR-MFR"])] += 1

    # Cross-check: bills of sale recorded 23 Mar 2026 to 1 Oct 2026 (all the
    # document index file contains), one per aircraft per document.
    bos = collections.Counter()
    seen = set()
    for r in read("DOCINDEX.txt"):
        if r["TYPE-COLLATERAL"] == "1" and r["DOC-TYPE"] == "BOS":
            n = r["COLLATERAL"].upper().removeprefix("N")
            key = (n, r["DOC-ID"])
            if n in nnum_jet and key not in seen:
                seen.add(key)
                bos[nnum_jet[n]] += 1

    with open(OUT / "model_map.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["jet", "list", "faa_model_code", "faa_manufacturer", "faa_model_name",
                    "serial_or_year_rule", "split_source", "notes"])
        for j in JETS:
            for c in j["codes"].split():
                w.writerow([j["jet"], j["role"], c, ref[c]["MFR"], ref[c]["MODEL"],
                            j["rule"], j["src"], j["note"]])

    window_days = 192  # 23 Mar 2026 to 1 Oct 2026
    with open(OUT / "fleet_summary.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["jet", "active_us_fleet", "sales_last_5_years", "sales_per_year_avg",
                    "most_sold_build_years", "list", "of_which_exported",
                    "bills_of_sale_23mar_1oct_2026", "bills_of_sale_per_year_2026_pace"])
        for j in JETS:
            jet = j["jet"]
            years = sorted({int(y) for (jj, y) in by_year_sales if jj == jet and y.isdigit()})
            best, best_n = None, -1
            if years:
                for start in range(years[0], years[-1] - 3):
                    n = sum(by_year_sales[(jet, str(y))] for y in range(start, start + 5))
                    if n > best_n:
                        best, best_n = start, n
                if best is None:
                    best = years[0]
            window = f"{best}-{best + 4}" if best else ""
            w.writerow([jet, fleet[jet], sales[jet], round(sales[jet] / 5, 1), window, j["role"],
                        exports[jet], bos[jet], round(bos[jet] * 365 / window_days, 1)])

    with open(OUT / "fleet_by_build_year.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["jet", "build_year", "active_us_fleet", "sales_last_5_years"])
        keys = sorted(set(by_year_fleet) | set(by_year_sales))
        for jet, year in keys:
            w.writerow([jet, year, by_year_fleet[(jet, year)], by_year_sales[(jet, year)]])

    print(open(OUT / "fleet_summary.csv").read())


if __name__ == "__main__":
    sys.exit(main())

# Data plan

## Jets

| Jet | Class | Main cost and spec page (confirmed to load and to show fixed and hourly cost estimates) |
|---|---|---|
| Citation XLS | Midsize | https://www.flycraft.com/ownership-cost/cessna-citation-xls-ownership-operating-costs |
| Citation Latitude | Midsize | https://www.flycraft.com/ownership-cost/cessna-citation-latitude-ownership-operating-costs |
| Citation Sovereign | Midsize | https://www.flycraft.com/ownership-cost/cessna-citation-sovereign-ownership-operating-costs |
| Hawker 800XP | Midsize | https://www.flycraft.com/ownership-cost/hawker-800xp-ownership-operating-costs |
| Learjet 60 | Midsize | https://www.flycraft.com/ownership-cost/bombardier-learjet-60-ownership-operating-costs |
| Challenger 300 | Super-midsize | https://www.flycraft.com/ownership-cost/bombardier-challenger-300-ownership-operating-costs |
| Challenger 350 | Super-midsize | https://flycraft.com/ownership-cost/bombardier-challenger-350-ownership-operating-costs/ |
| Gulfstream G280 | Super-midsize | https://www.flycraft.com/ownership-cost/gulfstream-g280-ownership-operating-costs |
| Embraer Praetor 600 | Super-midsize | https://www.flycraft.com/ownership-cost/embraer-praetor-600-ownership-operating-costs |
| Citation X | Super-midsize | https://www.flycraft.com/ownership-cost/cessna-citation-x-ownership-operating-costs |

**Alternates,** used only if a jet above turns out too thin (also on Flycraft): Gulfstream G200, Embraer Legacy 500, Embraer Legacy 450, Citation Longitude.

**Known issue:** Flycraft's totals use different assumptions on different pages. Use their individual pieces (fuel burn, maintenance per hour, engine reserve per hour, the fixed-cost pieces), not their totals. Fuel price, pilot pay and other prices that don't depend on the plane are set once in the Library and applied the same way to every jet.

## Output file: `data/assumptions.csv`
One row per value. Columns:
`id, item, jet, applies_to, value, low, high, unit, type, source_name, source_url, source_date, confidence, notes`

- `jet`: the jet name, or "All jets", "Midsize" or "Super-midsize".
- `applies_to`: Plane-specific, Class-wide or Same for all.
- `type`: Measured, Published or Our assumption.
- `confidence`:
  - **High:** manufacturer, government or measured data.
  - **Medium:** a published source, with a second source agreeing within about 15%.
  - **Low:** a single source, an estimate, or our assumption.
- When sources disagree, put the spread in low and high, and the most credible value in value. Explain in notes.

## Items to collect

Each item lists its sources in order of preference. Use at most 3 sources per value. Record "Not found" honestly.

### Plane-specific (one row per jet)

| Item | Unit | Sources |
|---|---|---|
| Range with 4 passengers | nautical miles | Manufacturer spec sheet; Flycraft page |
| Cruise speed | knots | Manufacturer; Flycraft |
| Seats (typical) | passengers | Manufacturer; Flycraft |
| Cabin height, width, length | feet and inches | Manufacturer spec sheet |
| Stand-up cabin (6 ft or more), flat floor, enclosed lavatory | yes / no | Manufacturer spec sheet |
| Bag space | cubic feet | Manufacturer; Flycraft |
| Takeoff distance (max weight, sea level, standard day) | feet | Manufacturer spec sheet |
| Fuel burn | gallons per hour | Flycraft; manufacturer (cross-check) |
| Maintenance (labor and parts) | $ per hour | Flycraft breakdown |
| Engine reserve | $ per hour | Flycraft breakdown |
| Purchase price, typical / low / high, for the most commonly sold build years (from the FAA summary below) | $ | Published price references and articles (for example Flycraft where shown, aviation press used-aircraft reviews, broker market reports); individual listings only on sites whose terms allow it. Record each price point found with its year, then summarize |
| Yearly value loss | % per year | Price differences between build years of the same model from the price points above; else a published class rate |
| Charter rate | $ per hour | Charter broker or operator pages that list a rate for the model (for example skycost.com, jetvice.net); else class average |
| Measured yearly charter hours (25th, median, 75th percentile) | hours | From the charter summary below |

### Class-wide (one row for Midsize, one for Super-midsize)

| Item | Unit | Sources |
|---|---|---|
| Captain and first officer yearly salary (use the average) | $ | Flycraft fixed-cost breakdowns (median across the class); published pilot salary surveys |
| Benefits share of salary | % | Published surveys; our assumption |
| Pilot training per pilot | $ per year | Flycraft breakdowns; training-provider published prices |
| Hangar | $ per year | Flycraft breakdowns |
| Insurance hull rate and liability | % of value, $ per year | Flycraft breakdowns; insurance-market reports |
| Management fee | $ per year | Flycraft breakdowns; published management pricing |
| Other fixed costs (subscriptions, miscellaneous) | $ per year | Flycraft breakdowns |
| Charter-certificate extra costs | $ per year | Published management or charter articles; our assumption |
| Extra value loss per 1,000 hours above typical use | % | Published appraisal guidance; our assumption |
| Base maintenance days out of service | days per year | Published maintenance and reliability articles; our assumption |
| Extra days out of service per 100 hours | days | Same |

### Same for all (one row each)

| Item | Unit | Sources |
|---|---|---|
| Fuel price | $ per gallon | One published US average airport fuel price (state the date) |
| Taxi, climb and descent allowance | hours per leg | Our assumption, 0.3 |
| Fuel stop time | hours | Published guidance; our assumption, 0.75 |
| Fuel stop fee | $ per stop | Our assumption with a published reference |
| Landing and handling fee | $ per landing | Published FBO and airport fee examples; our assumption |
| Parking per night | $ | Same |
| Pilots' hotel and meals per pilot per night | $ | Published government travel rates for major cities; our assumption |
| Owner's share of charter revenue | % | Published management articles |
| Average charter hours per available day | hours | Our assumption |
| Pilot count threshold (hours per year above which a 3rd pilot is needed) | hours | Published flight-department guidance; our assumption |
| Buying costs | % of price | Published broker and inspection guidance |
| Selling costs | % of price | Same |
| Sales tax on purchase | % | Default 0; note that it varies by state |
| Bag size | cubic feet per suitcase | Our assumption, 2.5 |

## Downloads and summaries

All downloads go to `data/raw/` (git-ignored). Only the summaries are committed.

### 1. FAA aircraft registry
- **Source:** https://registry.faa.gov/database/ReleasableAircraft.zip
- **File layouts:** https://registry.faa.gov/database/ardata.pdf
- **Model map:** using the aircraft reference file, map FAA model names and codes to the 10 jets and the alternates. Record the mapping in `data/model_map.csv`. Where one FAA model covers two jets (for example Challenger 300 and 350 share one type), split them by serial-number range and record the source for that range.
- **Fleet summary:** for each jet, count active US-registered aircraft by build year. Using the document index file, count bills of sale per year for the last 5 years.
- **Most commonly sold build years:** the 5-year window of build years with the most bills of sale in the last 5 years.
- **Output:** `data/fleet_summary.csv` with columns `jet, active_us_fleet, sales_last_5_years, sales_per_year_avg, most_sold_build_years`.

### 2. FAA charter operator list
- **Source:** https://www.faa.gov/about/officeorg/headquartersoffices/avs/faa-certificated-aircraft-operators-legal-part-135-holders.xlsx
- **Match** tail numbers to the registry to find which aircraft of each jet are on charter certificates. Get each one's transponder code (Mode S hex) from the registry master file.
- **Output:** `data/charter_fleet.csv` with columns `jet, tail_number, operator, mode_s_hex`. The list is known to contain errors; note mismatches.

### 3. OpenSky flight history
Only if OpenSky credentials are set as environment variables.
- **Pull:** for up to 30 charter aircraft per jet, pull flights for the last 12 months using `/flights/aircraft` (2-day windows), staying within the account's daily request limit.
- **Hours per aircraft:** sum of (landing time − takeoff time). Aircraft with fewer than 10 recorded flights are excluded.
- **Output:** `data/charter_hours.csv` with columns `jet, aircraft_count, hours_25th, hours_median, hours_75th`.
- **No credentials:** write "No data" for every jet and continue.

### 4. Airports
- **Source:** OurAirports `airports.csv` and `runways.csv` from https://davidmegginson.github.io/ourairports-data/
- **Use:** the app needs coordinates, codes, names and the longest runway per airport. Session 2 loads these into Supabase; nothing large is committed.

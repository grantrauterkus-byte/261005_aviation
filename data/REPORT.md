# Session 1 report: the data

Prepared 6 October 2026. Please read this, then correct any values in `data/assumptions.csv` you know better before Session 2.

## What is in `data/`

| File | What it holds |
|---|---|
| `assumptions.csv` | 212 values: 17 for each of the 10 jets, 13 for each class, 16 that are the same for all jets. Each has a source, date, type and confidence. |
| `price_points.csv` | 170 individual prices found (value-model estimates, reported sales, asking ranges, article estimates), each with its build year and source. The purchase prices in `assumptions.csv` summarize these. |
| `fleet_summary.csv` | For each jet: US fleet, sales in the last 5 years, sales per year, most commonly sold build years. |
| `fleet_by_build_year.csv` | The same counts split by build year. |
| `model_map.csv` | Which FAA model codes and serial-number ranges count as which jet, and where each split comes from. |

Raw FAA downloads and saved web pages are in `data/raw/` (not committed). The scripts in `scripts/` rebuild the fleet files and merge the researched rows.

Confidence across all 212 values: 31 High, 92 Medium, 89 Low. 24 values are our assumptions; the rest are published figures.

## Key values by jet

Each cell shows the typical value and its confidence. Build years in brackets are the most commonly sold years, which the purchase price is based on.

| Jet | Purchase price | Yearly value loss | Fuel burn | Maintenance | Engine reserve (both engines) | Charter rate | Range, 4 passengers | Cabin height × width |
|---|---|---|---|---|---|---|---|---|
| Citation XLS (2004-2008) | $5.65M (Low) | 8.3% (Low) | 239 gal/hr (Medium) | $1,050/hr (Low) | $700/hr (Low) | $4,207/hr (Low) | 1,796 nm (Medium) | 68 × 66 in (Medium) |
| Citation Latitude (2016-2020) | $16.30M (Low) | 3.3% (Low) | 315 gal/hr (Low) | $1,050/hr (Low) | $700/hr (Low) | $10,000/hr (Low) | 2,700 nm (High) | 72 × 77 in (High) |
| Citation Sovereign (2005-2009) | $6.00M (Low) | 6.0% (Low) | 281 gal/hr (Medium) | $1,050/hr (Low) | $700/hr (Low) | $5,000/hr (Low) | 2,829 nm (Medium) | 68 × 66 in (Medium) |
| Hawker 800XP (2001-2005) | $2.65M (Low) | 6% (Low) | 291 gal/hr (Medium) | $1,339/hr (Low) | $862/hr (Low) | $5,000/hr (Low) | 2,540 nm (Medium) | 69 × 72 in (Medium) |
| Learjet 60 (1997-2001) | $2.00M (Medium) | 6.9% (Low) | 219 gal/hr (Medium) | $1,204/hr (Low) | $1,000/hr (Medium) | $5,200/hr (Low) | 2,330 nm (Medium) | 68 × 71 in (Medium) |
| Challenger 300 (2004-2008) | $8.20M (Low) | 9.0% (Low) | 295 gal/hr (Medium) | $1,300/hr (Low) | $825/hr (Low) | $7,738/hr (Low) | 3,220 nm (Medium) | 73 × 86 in (Medium) |
| Challenger 350 (2015-2019) | $16.50M (Medium) | 8.8% (Low) | 297 gal/hr (Low) | $1,300/hr (Low) | $825/hr (Low) | $5,963/hr (Low) | 3,250 nm (Medium) | 72 × 86 in (High) |
| Gulfstream G280 (2014-2018) | $15.00M (Medium) | 5.5% (Medium) | 286 gal/hr (Medium) | $1,357/hr (Low) | $957/hr (Low) | $7,500/hr (Medium) | 3,600 nm (High) | 73 × 83 in (Medium) |
| Embraer Praetor 600 (2019-2023) | $21.00M (Medium) | 4.9% (Low) | 256 gal/hr (Medium) | $949/hr (Low) | $967/hr (Low) | $7,500/hr (Low) | 4,018 nm (High) | 72 × 82 in (High) |
| Citation X (1997-2001) | $3.00M (Medium) | 6.0% (Low) | 386 gal/hr (Low) | $1,300/hr (Low) | $825/hr (Low) | $10,000/hr (Low) | 3,125 nm (Medium) | 68 × 66 in (Medium) |

Maintenance and engine reserve: Flycraft's figures are the same for every jet in a class (midsize $1,050 and $700 an hour; super-midsize $1,300 and $825). Where no figure for the specific model was found, the row uses the class figure and is tagged "Class-wide". Model-specific figures from Guardian Jet or Aviation Week were found for the Hawker 800XP, Learjet 60, G280 and Praetor 600.

## Final jet list

**No swaps. The list in DATA.md stands.** Every jet averages well over 3 sales a year:

| Jet | US fleet | Sales, last 5 years | Per year | Most commonly sold build years |
|---|---|---|---|---|
| Citation XLS | 208 | 109 | 21.8 | 2004-2008 |
| Citation Latitude | 399 | 226 | 45.2 | 2016-2020 |
| Citation Sovereign | 219 | 132 | 26.4 | 2005-2009 |
| Hawker 800XP | 276 | 204 | 40.8 | 2001-2005 |
| Learjet 60 | 239 | 155 | 31.0 | 1997-2001 |
| Challenger 300 | 379 | 198 | 39.6 | 2004-2008 |
| Challenger 350 | 309 | 210 | 42.0 | 2015-2019 |
| Gulfstream G280 | 289 | 127 | 25.4 | 2014-2018 |
| Embraer Praetor 600 | 110 | 42 | 8.4 | 2019-2023 |
| Citation X | 252 | 169 | 33.8 | 1997-2001 |

The alternates were also counted (G200 25.4, Legacy 500 4.0, Legacy 450 7.0, Longitude 14.6 a year) but none was needed.

**How sales were counted, and why it is an estimate.** DATA.md asked for bills of sale from the FAA document index over 5 years. The index in the current FAA download only covers 23 March to 1 October 2026, so a 5-year count from it is impossible. Instead, a sale is counted when:
- a jet's current registration certificate was issued between October 2021 and September 2026 and is not the first registration of a new aircraft, or
- a jet was removed from the US register in that period because it was exported.

This misses jets sold more than once in the 5 years, and it counts some re-registrations that are not sales (for example, a change of registration number). As a check, `fleet_summary.csv` also shows the bills of sale actually recorded from 23 March to 1 October 2026, scaled to a year. The two measures differ widely for some jets: the Hawker 800XP is 40.8 a year by certificates but 9.5 by bills of sale. For the two jets still being built, the Latitude and Praetor 600, the bills of sale include factory-new sales. Either measure keeps every jet above 3 sales a year.

**Which aircraft count as which jet.** Several jets share an FAA model, so they were split by serial number (details and sources in `model_map.csv`):
- Citation XLS only, without the Excel and XLS+
- Sovereign without the Sovereign+
- Citation X without the X+
- Challenger 300 is serials up to 20500, and Challenger 350 is 20501 to 20900

The 350/3500 boundary is our own reading of a jump in serial numbers in the registry. The Praetor 600 / Legacy 500 split is also our reading of the serial-number pattern.

## Not found or blocked

**Blocked (not retried):**
- web.archive.org, which held the old manufacturer spec sheets for the out-of-production jets
- aircraftcostcalculator.com (refused access; also owned by the same company as Controller.com, whose terms forbid automated access)
- skyservice.com, skyaccess.com, bizjetjobs.com, globalair.com articles, federalpay.org

Listing sites (Controller.com, GlobalAir listings and others) were not opened, as the rules require. Some engine program rates and asking prices appeared only in their search snippets and were not used.

**Not found:**
- **Manufacturer spec sheets for the six out-of-production jets** (XLS, Sovereign, Hawker 800XP, Learjet 60, Challenger 300, Citation X). Their specs come from press reviews (Aviation Week, Business Jet Traveler, AOPA), Jetcraft overviews and Radar, so they are mostly Medium confidence.
- **Gulfstream's G280 page.** It now redirects to its successor, the G300, so G280 figures come from sources quoting Gulfstream.
- **Model-specific maintenance cost** for the XLS, Sovereign, Latitude, Citation X, Challenger 300 and Challenger 350. The Flycraft class figure is used.
- **Published engine program rates** (Pratt & Whitney, Honeywell, Rolls-Royce) on any site we are allowed to read.
- **Range with exactly 4 passengers from the manufacturer** for the Challengers. Bombardier quotes the 350 with 8 passengers.
- **Lavatory details:** whether some lavatories have a solid door or are serviced from outside (Hawker 800XP, Challenger 300 and 350, G280, Praetor 600, Citation X). All are recorded as enclosed, with that noted.
- **Original Citation X details:** a takeoff distance for 1997-2001 build years (the 5,250 ft figure is for later, heavier aircraft) and a manufacturer spec sheet.
- **Build-year prices for the original XLS**, only for the XLS+.
- **Published figures for:**
  - the extra yearly cost of putting a jet on a charter certificate
  - the extra value loss per 1,000 hours
  - the hours above which a third pilot is needed
  - charter hours per available day

  These are our assumptions, explained in the notes column.
- **The new government travel rates** for the year that started 1 October 2026. The 2026 rates are used.

## Things Session 2 should know

- **Charter rates are inconsistent and need your decision.** Per-model broker pages give $4,200 to $7,700 an hour, except Ace Jet's Latitude and Citation X pages, which show the same $10,000 for both and look like a template. Class figures are much higher: Flycraft $9,500 to $10,500 for midsize, Bolt Flight $9,525 and Flycraft about $12,000 for super-midsize. They may be all-in or jet-card prices. The rows follow DATA.md's order (model page first) and record the spread in low and high. Two oddities: the Challenger 350's page rate is below the older Challenger 300's, and the Latitude/Citation X rates are about double their peers'. Using one class rate per class would treat all jets the same.
- **Don't count landing, handling and crew travel twice.** Flycraft's per-hour "crew, landing and handling" figure ($525 / $650) covers the same costs as our separate landing and handling, parking and crew hotel rows. Only the separate rows are in `assumptions.csv`; do not add the Flycraft per-hour figure on top.
- **The Sovereign is Midsize in this app** (DATA.md) but super-midsize on Flycraft. Its maintenance and engine rows use the midsize class figures, with Flycraft's super-midsize figures as the high end.
- **Two values differ from Flycraft.** Flycraft's pilot pay is 23-46% above the one corporate pilot survey we could read (Pro Pilot 2023). The survey figures are the low ends. Our fuel price ($8.49, Aviation Week survey, September 2026) is 11% above Flycraft's ($7.66).
- **Some values sit outside the sanity ranges** used in the check. All are genuine and were kept:
  - the Citation X's narrow 66-inch cabin
  - the Sovereign's 12-seat maximum, used as a high end
  - Challenger 300 cabin length high end of 343 inches
  - low ends of yearly value loss below 3%
  - low ends of charter rates below $4,000

## The 5 values we are least sure of

1. **Charter rates, all jets.** Sources differ about 3 to 1 and several pages look out of date, as described above. This value drives charter income directly.
2. **Citation Latitude purchase price ($16.3M) and yearly value loss (3.3%).**
   - Only one price point falls inside the 2016-2020 build years.
   - The value loss rests on five noisy estimates; one 2022 aircraft is valued the same as a 2018.
   - 3.3% is at the bottom of the sensible range. A typical class rate of 5-7% may be better.
3. **Hawker 800XP purchase price ($2.65M).** It comes from Radar's estimates for 2001-2005 build years. Every other source is lower (Business Jet Traveler average sale $1.4M, Aviation Week $1.7M, Evo Jets $1.8-2.2M), but none gives prices by build year. The low end is set to $1.4M.
4. **Citation XLS purchase price ($5.65M) and value loss (8.3%).**
   - The price sources mix the XLS with the later, dearer XLS+, so the true price for 2004-2008 XLS aircraft may be lower.
   - The value loss is borrowed from the XLS+ price curve. The only original-XLS data suggests about 3%.
5. **Praetor 600 yearly value loss (4.9%, range 0-8.2%).** The jet is young, its prices have been rising, and no value-by-build-year source covers it yet.

Close behind:
- Citation X fuel burn: 386 gal/hr from Flycraft vs 293 from Liberty Jet.
- Praetor 600 cabin length: 27 ft 6 in in the press vs 24 ft 1 in on Embraer's drawing.
- The class-wide assumptions for charter-certificate costs and extra value loss for high hours.

## Session summary

**Done:**
- Checked access: FAA works, but only with a browser-style request; Flycraft works.
- Downloaded the FAA registry and built the model map and fleet summary. The jet list was confirmed, with no swaps.
- Read all 10 Flycraft cost pages and researched every DATA.md item, one page at a time, within each site's rules.
- Wrote `assumptions.csv` and `price_points.csv`, and checked that every row has a source link or is marked "Our assumption" and that there are no duplicates. Values outside the sensible ranges were reviewed and kept, as listed above.

**Unresolved:**
- the charter-rate basis
- prices and value loss for the XLS, Latitude and Hawker
- 5-year sales are an estimate, because the FAA document index only covers 2026
- the manufacturer spec sheets on web.archive.org could not be reached

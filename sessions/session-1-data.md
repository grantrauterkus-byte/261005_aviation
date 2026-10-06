# Session 1: Collect the data

Goal: produce every data file in DATA.md and a report the owner can review. Don't build the app in this session.

## Steps
1. Read CLAUDE.md, SPEC.md and DATA.md.
2. Check internet access by requesting the FAA registry zip and one Flycraft page. If either is blocked, stop and tell the owner exactly which domains must be allowed in the Claude Code environment's network settings.
3. Create `data/` and `data/raw/`, and add `data/raw/` to `.gitignore`.
4. **FAA registry:** download it, build `data/model_map.csv` and `data/fleet_summary.csv` as described in DATA.md.
5. **Check the jet list:** if any of the 10 jets has fewer than 3 sales per year on average while an alternate has clearly more, swap in the alternate and record why in the report. Otherwise keep the list.
6. **FAA charter list:** build `data/charter_fleet.csv`.
7. **OpenSky:** if credentials exist, build `data/charter_hours.csv`. If not, mark "No data".
8. **Research** every item in DATA.md "Items to collect" and write `data/assumptions.csv`. Work jet by jet. Read pages one at a time and follow the source order. Don't crawl.
9. **Check your work:**
   - Every row has a source link or is marked "Our assumption"
   - Values fall in sensible ranges for their class (for example, super-midsize fuel burn between 200 and 400 gallons per hour)
   - No duplicate items
10. **Write `data/REPORT.md`:**
    - A table with the 10 jets down the side and the key items across the top (purchase price, yearly value loss, fuel burn, maintenance, engine reserve, charter rate, range, cabin, measured charter hours). Each cell shows the value and its confidence.
    - The final jet list, with any swaps explained.
    - Anything not found or blocked.
    - The 5 values you are least sure of, and why.
11. Commit the `data/` files (not `data/raw/`) and `.gitignore`, then push.
12. Tell the owner: "Data is ready. Please read data/REPORT.md and correct any values in data/assumptions.csv you know better, then start Session 2."

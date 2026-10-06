# Session 2 report: build and deploy the app

## What was built

- **App:** Vite + React + TypeScript, with `netlify.toml` (build `npm run build`, publish `dist`, all paths served by the app so scenario links work).
- **Database** (`supabase/migrations/20261006024412_initial_schema.sql`, applied to the "jet-ownership-finder" project):
  - `jets`, `assumptions`, `airports`, `scenarios`, `scenario_changes`.
  - Everyone can read jets, assumptions and airports. No one can write them except the load script (service role).
  - Scenarios cannot be listed or written directly. Three database functions (`get_scenario`, `create_scenario`, `update_scenario`) read and write one scenario and its changes, and each needs the scenario's id. Supabase's security advisor flags these functions as callable without signing in. That is intended: it is how "saved by link, no login" works.
- **Load script** (`npm run load`, `scripts/load.ts`): loaded 10 jets, 213 assumptions and 21,467 airports. The airports are US airports (small, medium and large) plus any other airport with a paved runway of 4,000 ft or more. The OurAirports files are in `data/raw/` (git-ignored).
- **Cost engine** (`src/engine/`): follows SPEC.md "How costs are calculated" step by step. No network calls.
- **Worked example** (`docs/worked-example.md`): the Challenger 300 in the default scenario, every step by hand. A unit test checks the engine matches it to the dollar. It comes to $10,167,803 over 5 years (range $9,003,715 to $11,700,289).
- **Tests:** 31 unit tests, all passing (`npm test`). They cover:
  - the worked example
  - trips into legs: wait or fly home empty, same-day, one-way, trips not starting at home base, landings
  - fuel stops and the fuel-stop limit
  - the availability cap on charter hours
  - pilot count
  - fit checks, changed values, and value loss for high hours
- **Screens:**
  - **Find my jet:** inputs (home base search, trips, requirements, charter hours) and ranked cards with the 11 scorecard rows aligned across cards. Also: a sort menu, the "what drives this cost" bar, the line naming the biggest driver, purchase price editable on each card, and greyed-out jets with reasons.
  - **Assumptions Library:** flat table with every column in SPEC.md, plus search, filters (jet, applies to, type, confidence, only items I changed), edit, revert and reset all.
  - Clicking a number on a card opens its Library row. Calculated numbers (the three costs and data confidence) open the list of every value used for that jet.
- **Scenarios:** the app opens with the demo scenario. The first change saves it to the database and moves to its own link (`/s/<id>`). Later changes save automatically. "Copy link", "Copy scenario" and "New scenario" are in the scenario bar.

## Checks done

- Opened the built app in a headless browser:
  - The default scenario shows "10 of 10 jets fit how you fly." with ranked cards, and the scorecard rows line up across cards.
  - Ticking "Stand-up cabin" greys out 5 jets, each with its reason, for example "No stand-up cabin (cabin height 68 inches)". It also saved the scenario under its own link.
  - Clicking the Challenger 300's purchase price opened its Library row. Entering $7,000,000 changed the card's 5-year total from $10.17 million to $9.67 million and marked the row as changed. The change survived a page reload. "Revert" brought the total back to $10.17 million.
  - At phone width (390 px) neither screen scrolls sideways. The Library table scrolls inside its own box.
  - No errors in the browser console.
- Checked the database as an anonymous visitor:
  - jets can be read
  - scenarios cannot be listed
  - reference tables cannot be changed
  - the internal function cannot be called
  - an unknown scenario id returns nothing
- The service role key is not in the built app. Only the URL and the anon key are.

## Decisions made where SPEC.md left a gap

Each one is in the code comments and, where it is a value, in the Library.

1. **Typical owner's hours (new Library row, `all.typical_yearly_hours`, 400 a year, Our assumption, Low).** The extra value loss for high hours needs a starting point that Session 1 did not record. The source already cited for that row says business jets rarely fly more than 400 hours a year.
2. **Extra value loss for high hours** is a percentage of the resale value, before that loss is taken off.
3. **Wait or fly home empty:** the app compares the direct cost of each option:
   - Waiting costs hotel and meals for 2 pilots plus parking, for each night.
   - Flying home empty costs two empty legs at fuel, maintenance and engine reserve per hour, plus landing fees and any fuel-stop fees.

   It does not count knock-on effects (more hours bringing a third pilot nearer, for example). In the default scenario every jet waits.
4. **Nights away** = days at destination. Days the owner is using the jet are counted even when the jet flies home empty in between, as SPEC.md's formula says.
5. **Most charter hours possible:** days out of service depend on total hours, which include charter hours. The app solves both together and rounds down to whole hours.
6. **Ranges:** for each range assumption, the favorable end is whichever of its low and high gives the lower 5-year total. Insurance stays on the typical purchase price, as SPEC.md says. An assumption that makes no difference (charter rate with no charter hours) is skipped.
7. **A changed value replaces its low and high too.** If you type your own purchase price, the range no longer spreads around the researched one. The Library says this.
8. **Fuel stops:** a fuel stop costs the stop fee but no separate landing fee. "Fuel stops per year" on the card counts stops on all flights, including empty ones. "Most trips allowed to need a fuel stop" counts trips per year, the same way as "Trips flown nonstop".
9. **Runway check** uses the published takeoff distance (maximum weight, sea level, standard day), as recorded in Session 1. It does not allow for high airports like Aspen.

## Unresolved

- **Netlify deploy is not finished.** The site "jet-ownership-finder" was created and `SUPABASE_URL` is set. Two things need the owner:
  1. Add `SUPABASE_ANON_KEY` (the publishable key from Supabase → Project Settings → API) under Netlify → jet-ownership-finder → Project configuration → Environment variables. Claude could not read the key in this session.
  2. The new site was created with "team login required" for visitors (Netlify's default for this team). Turn it off under Project configuration → Access & security → Visitor access, or ask Claude to do it, so the site is public like the owner's other two sites.
- **No jet is greyed out in the default demo scenario.** With 6 seats, 20 cubic feet of bags and sea-level runway figures, all 10 jets fit. The greyed-out cards were checked with a must-have ticked instead. The demo scenario was left exactly as SPEC.md defines it.
- **Palm Beach shows as "DJT".** OurAirports now lists KPBI with the code DJT (the airport was renamed). Searching "PBI", "KPBI" or "Palm Beach" finds it.
- **One test scenario was saved** in the database during the browser check (id d723deb0-6774-495f-9f8f-eabb2b509fe1). It was left in place. Delete it only if the owner wants.
- The app's JavaScript bundle is about 518 KB (151 KB compressed). Vite warns above 500 KB. It works, and it could be split later.

## Session summary

Built the whole app per the Session 2 plan:

- database
- load script
- cost engine, worked example and 31 passing tests
- both screens
- saving scenarios by link

All were checked locally in a browser. The deploy stopped at the last step: Netlify needs the Supabase anon key added by the owner, and the site's visitor login turned off. After that, one deploy command finishes it.

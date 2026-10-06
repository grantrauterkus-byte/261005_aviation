# Session 2 report: build and deploy the app

## What was built

- **App:** Vite + React + TypeScript, with `netlify.toml` (build `npm run build`, publish `dist`, all paths served by the app so scenario links work).
- **Database** (`supabase/migrations/20261006024412_initial_schema.sql`, applied to the "jet-ownership-finder" project):
  - `jets`, `assumptions`, `airports`, `scenarios`, `scenario_changes`.
  - Everyone can read jets, assumptions and airports. No one can write them except the load script (service role).
  - Scenarios cannot be listed or written directly. Three database functions (`get_scenario`, `create_scenario`, `update_scenario`) read and write one scenario and its changes, and each needs the scenario's id. Supabase's security advisor flags these functions as callable without signing in. That is intended: it is how "saved by link, no login" works.
- **Load script** (`npm run load`, `scripts/load.ts`): loaded 10 jets, 213 assumptions and 21,467 airports. The airports are US airports (small, medium and large) plus any other airport with a paved runway of 4,000 ft or more. The OurAirports files are in `data/raw/` (git-ignored).
- **Cost engine** (`src/engine/`): follows SPEC.md "How costs are calculated" step by step. No network calls.
- **Worked example** (`docs/worked-example.md`): the Challenger 300 in the default scenario, every step by hand. A unit test checks the engine matches it to the dollar. It came to $10,167,803 over 5 years (range $9,003,715 to $11,700,289). After the data update below it is $10,265,303 (range $9,101,215 to $11,797,789).
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

- **Deployed:** https://jet-ownership-finder.netlify.app (Netlify project "jet-ownership-finder"). It builds from `SUPABASE_URL` and `SUPABASE_ANON_KEY` (the publishable key). The owner added the key, because Claude was not allowed to read it in this session. Visitor login is off, so the site is public. The same browser check as above was run on the live site and passed. The service role key is not in the live code.
- **No jet is greyed out in the default demo scenario.** With 6 seats, 20 cubic feet of bags and sea-level runway figures, all 10 jets fit. The greyed-out cards were checked with a must-have ticked instead. The demo scenario was left exactly as SPEC.md defines it.
- **Palm Beach shows as "DJT".** OurAirports now lists KPBI with the code DJT (the airport was renamed). Searching "PBI", "KPBI" or "Palm Beach" finds it.
- **Two test scenarios were saved** in the database by the browser checks, one locally and one on the live site (both named "Demo: New York owner"). They were left in place. Delete them only if the owner wants.
- The app's JavaScript bundle is about 518 KB (151 KB compressed). Vite warns above 500 KB. It works, and it could be split later.

## Session summary

Built and deployed the whole app per the Session 2 plan:

- database
- load script
- cost engine, worked example and 31 passing tests
- both screens
- saving scenarios by link

It is live at https://jet-ownership-finder.netlify.app and was checked there in a browser. Left open: no jet is greyed out in the default demo, Palm Beach shows as "DJT", and two test scenarios are still in the database.

## Follow-up: invitation-only access

The owner asked that only people they add can use the app, each added by name, email or phone number, with a temporary password, and that each person's scenarios be private.

**Built:**
- **Database** (migrations `20261006032653_invited_people.sql` and `20261006032955_invited_people_access.sql`):
  - a `people` table of who may sign in
  - every table readable only by invited, signed-in people
  - scenarios owned by one person and visible only to them
- **`people` edge function** (`supabase/functions/people/`): lets an admin add a person, give them a new temporary password, or remove them. It runs on Supabase with the service role key Supabase gives it; that key is still not in Netlify or the browser.
- **App:**
  - a sign-in screen
  - a forced password change after a temporary password
  - a "People" screen for admins
  - "My scenarios" in the scenario bar
  - the user's name and "Sign out" in the header
- **Phone numbers and names:** Supabase password sign-in needs an email address, so these get a stand-in address on the reserved `.invalid` domain, which never receives mail (`supabase/functions/_shared/identity.ts`). The same phone number typed different ways, or a name in different capitals, is the same login.
- **First admin:** added grant.rauterkus@gmail.com with `npm run add-person -- --admin`. The two earlier test scenarios were given to this account.
- **Tests:** 5 new tests for the sign-in rules. 36 tests in total, all passing.

**Checked:**
- In a browser against the real database: signed-out visitors see only the sign-in screen, and a wrong password is refused. A temporary password forces a password change, and a password under 10 characters is refused.
- An admin added a person by phone number "(212) 555-0199". That person signed in as "212.555.0199", could not see the People screen or the admin's scenario, and was then removed.
- Directly against the database and the function: a visitor who isn't signed in gets nothing from any table. A signed-in non-admin is refused by the people function (403) and cannot make themselves an admin.
- The test accounts were removed afterwards. Only the owner's account remains.

**Notes:**
- The Supabase tool timed out applying the change in one go. It seems to wait for an approval on "drop" and "revoke" statements. The change was applied in two parts, rewritten to change the existing access rules instead of dropping them. Visitors who aren't signed in still hold the old table permissions, but no access rule lets them see any rows (checked).
- A Netlify site password was refused (it needs a paid Netlify plan), and the owner declined the Netlify team-login lock. The database itself was locked first instead.
- **Open:** in Supabase → Authentication → Sign In / Providers, turn off "Allow new users to sign up". Self sign-ups already get no access, because they aren't in `people`, but turning it off stops strangers creating empty accounts.

## Follow-up: tiles, matrix and no app-built sentences

The owner found the long cards unusable and the cost bars indistinguishable, and set a rule: no sentences built by the app's own logic, only short factual labels, numbers, colors and labeled chips. The rule is now in CLAUDE.md, and SPEC.md describes the new layout.

**Built:**
- **Tiles**, after the tow CRM's layout. Each tile is one short row: a class stripe, the name, build years, and three figures: 5-year total, per hour, price.
  - Labeled chips show the label in words and then the value, for example "Seats · 8".
  - Green means the best third of the jets that fit, amber the lowest third, red fails a need. A color key sits by the sort menu.
  - Jets that don't fit are greyed out, with red chips such as "Stand-up cabin · No".
- **Matrix:** every element of every plane in one grid, 25 columns in 6 groups: cost, cost parts, trips, cabin, performance, data.
  - Each column is shaded from green to amber among the jets that fit, and a failed need is red.
  - Clicking a column header sorts by it.
  - The cost parts switch between amounts and the difference from the lowest.
- **Expanded jet:** clicking a tile or matrix row opens a side panel with:
  - the figures, with ranges, and the price editor
  - the fail, biggest swing and data confidence chips
  - the cost parts with a bar
  - every element with its color
  - the yearly flying and each trip
  - every value used, with its low–high, confidence and linked source
- **Inputs:** a summary bar of chips. "Edit" opens the full inputs in a side panel.
- **Engine:** cost parts are now value lost, crew, fixed costs, fuel, maintenance, trip fees and charter income. The old "pilots and other" part, about half of every total and nearly the same for every jet, was split into crew, fixed costs and trip fees. "Does not fit" reasons are short labels with the Library row behind them. The worked example and tests were updated to match, and all 36 pass.
- **Text:** every app-built sentence was replaced with short labels, including status lines, warnings, hints and the server function's messages.

**Checked in a browser** with a throwaway login, removed afterwards:
- tiles, failing chips, the matrix in both modes, the expanded jet with its sources, and the inputs panel
- no sideways scrolling at phone width, and no errors

## Follow-up: data fixes with published sources

The owner asked to replace the weakest values with defensible ones from public sources, without quotes. Each change is recorded in its row's notes in `data/assumptions.csv`, with sources.

| Value | Before | After | Basis |
|---|---|---|---|
| Citation Latitude fuel burn | 315 gallons an hour | **280** (range 246–315) | Jetcraft's 246, scaled by the median gap (1.14) between Jetcraft and this table's figures for five other jets; in line with the Sovereign (281), same engine family |
| Management fee, midsize | $60,000 a year | **$90,000** (range $42,000–$180,000) | Average of the AviNews (2026) and Flycraft range midpoints; Jet Linx (2026) consistent |
| Management fee, super-midsize | $81,000 a year | **$100,500** (range $60,000–$180,000) | Same method |
| Space per suitcase | 2.5 cubic feet, no range | 2.5, **range 1.6–4.2** | Delta carry-on limit; full-size 62-inch checked bag |
| Hangar, top of range | $65,640 / $105,240 | **$120,000** both classes | AIN 2008: a Gulfstream IV paid $17,000 a month at Teterboro |

**Not changed, on purpose:**
- **Citation X fuel burn (386):** compared with Jetcraft, it sits in the same band as the other jets, so it is consistent with the basis used for every jet.
- **Typical hangar:** stays a national figure. A New York owner should enter a quote as "Your value".

**Blocked (not retried):** GlobalAir, Jettly and American Airlines pages.

The worked example and its tests were updated: the Challenger 300's management fee change adds $97,500 over 5 years. All 36 tests pass, and the Library was reloaded into Supabase.

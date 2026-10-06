# Session 2: Build and deploy the app

Goal: a working app on Netlify that matches SPEC.md exactly, using the data from Session 1.

## Before you start
- Read CLAUDE.md, SPEC.md, DATA.md and `data/REPORT.md`.
- Check these environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. If any are missing, tell the owner exactly where to find each one in the Supabase dashboard (Project Settings → API) and where to add them (the Claude Code environment's secrets), then wait.
- Check that `data/assumptions.csv` exists. If not, stop and tell the owner to run Session 1.

## Steps
1. **Scaffold** a Vite + React + TypeScript app. Add `netlify.toml` (build command `npm run build`, publish directory `dist`).
2. **Database** (migrations in `supabase/migrations/`), with these tables:
   - `jets`: name, class, most commonly sold build years, fleet and sales counts
   - `assumptions`: one row per row of `data/assumptions.csv`
   - `charter_hours`: from `data/charter_hours.csv`
   - `airports`: code, name, latitude, longitude, longest runway in feet. US airports plus any airport with a 4,000 ft or longer paved runway
   - `scenarios`: id, name, inputs as JSON, created and updated times
   - `scenario_changes`: scenario id, assumption id, the user's value

   Access rules: everyone can read `jets`, `assumptions`, `charter_hours` and `airports`. Anyone holding a scenario's id can read and update that scenario and its changes. No other writes.
3. **Load script** (`scripts/load.ts`): load the committed CSVs and the OurAirports files into Supabase using the service role key. Run it.
4. **Cost engine** (`src/engine/`): implement SPEC.md "How costs are calculated" exactly. It takes the scenario inputs and the assumptions (with the user's changes applied) and returns, for each jet: whether it fits and why not, the scorecard values, the three numbers with low and high, the cost breakdown, and the assumption that moves the total most.
5. **Worked example test:** by hand, write `docs/worked-example.md` for the Challenger 300 using the default scenario and the loaded values. Show every step in plain English with the numbers. Then write a unit test that checks the engine matches it to the dollar. Add tests for:
   - trip-to-legs rules (wait vs. fly home empty, one-way, fuel stops)
   - the availability cap
   - pilot count
   - the charter check labels
6. **Screens** (SPEC.md):
   - Find my jet: inputs, ranked cards with aligned scorecard rows, "what drives this cost," greyed-out jets with reasons, sort menu, editable purchase price on each card
   - Assumptions Library: flat table, search, filters, edit, revert, reset all, "applies to" tags and sources always visible
   - Clicking any card number opens its Library row
   - Scenarios: saved by link, new, copy, default demo scenario
   - Plain-English labels only. Clean, simple design. Works on a laptop and a phone.
7. **Check:** run all tests. Open the app locally and confirm the default scenario shows ranked cards, at least one greyed-out jet with a reason, and that changing a value in the Library changes the cards and can be reverted.
8. **Deploy:** set the Netlify environment variables (Supabase URL and anon key only, never the service role key). Deploy, and confirm the live site works.
9. Commit and push everything. Give the owner the live link, plus a 5-line summary of what was built and anything unresolved.

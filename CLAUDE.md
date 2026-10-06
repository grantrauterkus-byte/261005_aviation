# Project: Jet Ownership Finder

A web app that helps someone decide which midsize or super-midsize jet to buy and own, based on how they actually fly, and shows what owning it would cost over 5 years. Read SPEC.md (what to build) and DATA.md (what data, from where) before doing anything.

## Stack
- Frontend: Vite + React + TypeScript, deployed on Netlify.
- Backend: Supabase (Postgres). Schema changes only through migration files in `supabase/migrations/`.
- The cost engine is plain TypeScript in `src/engine/`, with no network calls, and covered by unit tests.

## Writing rules (app, labels, data, docs)
- Plain English everywhere. No variables, abbreviations or code-like names in anything a user sees. Write "Hours you fly per year", not "H" or "owner_hrs".
- Descriptive and factual. No marketing language and no filler.
- Every number shown in the app must be traceable to a row in the Assumptions Library.

## Data rules
- Every value stored has: source name, source link, source date, applies-to tag (Plane-specific, Class-wide or Same for all), type (Measured, Published or Our assumption), confidence (High, Medium or Low).
- Never invent a value. If it isn't found, record "Not found" and use a clearly labeled class-wide fallback or our assumption.
- Respect every website's terms and robots.txt. Read individual pages only. Never bulk-scrape. Never use listing sites whose terms forbid automated access. Don't retry blocked sites; record them as "Blocked".
- Raw downloads (FAA files, airport files) go in `data/raw/`, which is git-ignored. Commit only small summary files and the researched CSVs.

## GitHub rules
- Never create GitHub Actions or any workflow that downloads outside data or runs on a schedule. All downloads run in the Claude Code session or in one-time scripts run by Claude.
- Never commit secrets. Supabase keys and any other credentials come from environment variables.

## Working rules
- Ask before deleting data or dropping tables.
- When finished with a session, write a short summary of what was done and anything unresolved at the end of the session's report file.

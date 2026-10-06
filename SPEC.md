# Product spec: Jet Ownership Finder

## Purpose
The user describes how they fly in a typical year. The app shows which of 10 midsize and super-midsize jets fit, ranks them, and shows the cost of buying and owning each for 5 years, with every assumption visible, sourced and editable.

Scope: owning one jet, operated by a management company, optionally chartered out to others when the owner isn't using it. All amounts are in today's dollars, flat across the 5 years.

## Screen 1: Find my jet (the main screen)

### Inputs (top or left panel)
1. **Home base airport** (search by name or code).
2. **Trips.** A list. "Add a trip" asks for:
   - From airport (defaults to home base) and to airport
   - Passengers
   - Bags (number of suitcases)
   - Round trip or one-way
   - Days at destination (round trips only; 0 means same-day return)
   - Times per year
3. **Requirements.** Defaults are filled in from the trips; the user can change them:
   - Seats needed (default: the most passengers on any trip)
   - Bag space needed (default: the most bags on any trip)
   - Runway check on or off (on: the jet must be able to take off from every airport in the trips)
   - Range safety margin, in % (default 10%). Any trip longer than the jet's range minus this margin needs a fuel stop.
   - Most trips allowed to need a fuel stop (default: no limit). The app always shows how many trips would need one.
   - Must-haves (checkboxes): stand-up cabin, flat floor, enclosed lavatory
4. **Hours you would charter the jet out per year** (0 to 400, default 0).

### Results
Redesigned October 2026 after the tow CRM's layout. No sentences built by the app: only short labels, numbers, colors and labeled chips.
- **Summary bar:** the inputs shown as labeled chips (Home, Trips, Seats, Bags, Runway check, Range margin, Charter, any must-haves), with "Edit" opening the full inputs in a side panel.
- A header label: "X of 10 fit".
- **Two views, one sort:** Tiles or Matrix. The sort menu (and clicking a matrix column) sorts by any element.
- **Tiles:** one short row per jet. A colored stripe for the class, the name, build years, and three figures: 5-year total, cost per hour you fly, purchase price. Below them, labeled chips: each chip shows its label in words and its value (for example "Seats · 8"). Green means the best third of the jets that fit, amber the lowest third, red fails a need. Jets that don't fit are greyed out, with a red chip for each need they fail (for example "Seats · 7 · need 8", "Runway ASE · 4,000 ft · needs 5,450 ft").
- **Matrix:** one row per jet, one column per element: the three costs and purchase price; the cost parts over 5 years (value lost, crew, fixed costs, fuel, maintenance, trip fees, charter income); trips (nonstop trips, fuel stops a year, range); cabin (seats, height, width, length, bag space, stand-up cabin, flat floor, enclosed lavatory); performance (cruise speed, takeoff distance); data confidence. Units are in the column headers. Each column is shaded from green (best) to amber (lowest) among the jets that fit; a value that fails a need is red. The cost parts can show amounts or the difference from the lowest.
- **Data confidence is shown on the numbers, not as a feature of the plane:**
  - Every tile has a bar under its figures showing the 5-year total from low to high, with a tick at the typical value, all on one dollar scale labeled once above the list. Overlapping bars mean the order between those jets is not reliable.
  - Every value backed by a Library row carries three dots: three filled for High, two for Medium, one for Low.
  - In the matrix, cells whose value rests on a Low-confidence row get a light diagonal hatch over their color, and the data confidence column is a stacked High, Medium and Low bar with the percentages.
- **Expanded jet:** clicking a tile or matrix row opens a side panel with the four figures (with low–high ranges), the purchase price editor, chips (fails, biggest swing, charter capped, data confidence), the cost parts with a bar, every element with its color, the yearly flying, each trip, and every value used with its low–high, confidence and linked source.
- The scorecard elements below are all shown in the matrix and the expanded jet:
  1. 5-year total cost (typical, with low–high range)
  2. Yearly out-of-pocket cost
  3. Cost per hour you fly
  4. Purchase price (for the build years shown)
  5. Trips flown nonstop (for example, "34 of 38")
  6. Fuel stops per year
  7. Seats
  8. Cabin height and width
  9. Bag space
  10. Cruise speed
  11. Data confidence (share of this jet's numbers rated High, Medium or Low)
- **Cost parts:** value lost, crew (pilots, training, pilots' travel), fixed costs (hangar, insurance, management fee, other fixed costs, charter certificate costs), fuel, maintenance (maintenance and engine reserve), trip fees (landing and handling, fuel stop fees, parking), and charter income as a reduction.
- **Biggest swing:** a chip naming the assumption that moves the jet's 5-year total the most between its low and high values, with the amount.
- **Any value in the expanded jet is clickable** and opens its row in the Assumptions Library.

## Screen 2: Assumptions Library
One long flat table with every value the app uses: researched values, measured values and our assumptions.

Columns: Item, Jet (or "All jets" / "Midsize" / "Super-midsize"), Applies to (Plane-specific / Class-wide / Same for all), Value, Low, High, Unit, Type (Measured / Published / Our assumption), Source (linked), Source date, Confidence, Notes (how it was derived), Your value.

- Search box and filters: jet, applies to, type, confidence, "only items I changed."
- **Edit:** the user types a value in "Your value." The app uses it everywhere immediately, and the row is visibly marked as changed.
- **Revert:** each changed row has a "Revert" control. A "Reset all" button reverts everything.
- The original value and source are always shown, even when changed.
- The purchase price for every jet is editable here and also directly on its card.

## Access (invitation only)
Added October 2026 at the owner's request.
- Only people an admin has added can sign in. Nothing in the app or the database can be read without signing in.
- An admin adds a person on the **People** screen by email, phone number or name. The app gives a temporary password, shown once, which the admin passes on. The person must choose their own password (at least 10 characters) the first time they sign in.
- Admins can also give someone a new temporary password, or remove them, which deletes their saved scenarios.
- No emails or texts are sent. Phone numbers and names are only used as what the person types to sign in.
- The first admin is the owner (grant.rauterkus@gmail.com).

## Scenarios (saving)
- Everything the user enters (trips, requirements, charter hours, changed values) is a scenario.
- A scenario is saved in the database under the signed-in person and is private to them. "My scenarios" lists them. Each scenario has its own link, which opens it on any device where that person is signed in.
- "New scenario" starts from the default. "Copy scenario" duplicates the current one.
- The app opens with a default demo scenario:
  - Home base: Teterboro (TEB)
  - Trips:
    - TEB–Palm Beach (PBI): 4 passengers, 4 bags, round trip, 5 days, 8 times a year
    - TEB–Aspen (ASE): 6 passengers, 8 bags, round trip, 4 days, 4 times a year
    - TEB–Los Angeles (VNY): 4 passengers, 4 bags, round trip, 3 days, 4 times a year
    - TEB–Boston (BED): 3 passengers, 2 bags, round trip, same day, 10 times a year
  - Charter out: 0 hours

## How costs are calculated (plain English)

### 1. Turning trips into flying
For each jet and each trip:
- **Distance:** the great-circle distance between the two airports.
- **Fuel stop needed:** if the distance is more than the jet's range minus the safety margin. Number of stops = how many times the distance exceeds that usable range, rounded up, minus one.
- **Flight time for one leg:** distance ÷ cruise speed, plus a taxi, climb and descent allowance per leg, plus the fuel-stop time for each stop.
- **Legs flown:**
  - Round trip with days at destination: the jet either waits at the destination (pilots' hotel and meals for each night, plus parking) or flies home empty and comes back to pick up. The app picks whichever costs less.
  - Same-day round trip: two legs with passengers.
  - One-way: one leg with passengers, plus one empty leg back to home base.
  - Trip that doesn't start at home base: add an empty leg from home base to the start, and back at the end.
- **Yearly totals:** hours with you onboard, empty hours, and charter hours (the user's input). Their sum is the jet's total yearly hours.

### 2. Can the jet actually fly that much?
- **Days out of service per year** = a base number of maintenance days + extra days for every 100 hours flown.
- **Days the owner is using the jet** = for each trip, (days at destination + 1) × times per year.
- **Most charter hours possible** = (365 − days out of service − days the owner is using it) × average charter hours per available day.
- If the user's charter hours exceed this, the app uses the maximum and shows: "Limited to X charter hours by availability."
- **Number of pilots:** 2. If total yearly hours exceed the threshold in the Library, 3.

### 3. Yearly costs
- **Fuel:** total yearly hours × the jet's fuel burn per hour × fuel price per gallon.
- **Maintenance:** total yearly hours × the jet's maintenance cost per hour (labor and parts).
- **Engine reserve:** total yearly hours × the jet's engine reserve per hour.
- **Trip fees:** for every landing with you onboard or empty, a landing and handling fee, plus a fee for each fuel stop.
- **Pilots' travel:** nights away × number of pilots on the trip (2) × the per-night hotel and meals amount.
- **Pilots:** number of pilots × yearly salary × (1 + benefits share).
- **Pilot training:** number of pilots × yearly training cost.
- **Hangar, insurance, management fee, other fixed costs:** yearly amounts from the Library. Insurance = a hull rate × typical purchase price + a liability amount.
- **Charter certificate costs:** a yearly amount, only if charter hours > 0.
- **Charter income:** charter hours × the jet's charter rate per hour × the owner's share of charter revenue. Fuel, maintenance and engine reserve for charter hours are already counted in the costs above.

### 4. Buying and selling
- **Purchase price:** the typical price for the jet's most commonly sold build years (editable).
- **Buying costs:** purchase price × buying-costs share (inspection, broker, legal), plus purchase price × sales tax share (default 0%, varies by state).
- **Resale value after 5 years:** purchase price × (1 − yearly value loss) multiplied five times, minus extra value loss for hours flown above a typical owner's (applies mostly when chartering).
- **Selling costs:** resale value × selling-costs share.
- **Value lost:** purchase price + buying costs − (resale value − selling costs).

### 5. The three numbers on every card
- **5-year total cost** = value lost + 5 × (all yearly costs − charter income).
- **Yearly out-of-pocket cost** = all yearly costs − charter income. It doesn't include buying or selling.
- **Cost per hour you fly** = 5-year total cost ÷ (5 × hours with you onboard). Empty hours and charter hours aren't counted as your hours.

### 6. Ranges
- **Low** uses the favorable end of these assumptions together: purchase price, yearly value loss, fuel price, charter rate, owner's share of charter revenue. **High** uses the unfavorable end. Typical uses each typical value.
- "The assumption that moves this jet's total the most" = re-run the 5-year total with each of those assumptions at its low and high while the rest stay typical, and name the one with the largest difference.

## Out of scope
Financing, inflation, paint and interior refurbishment, avionics upgrades, taxes beyond sales tax, self sign-up.

Checking the user's charter hours against measured flight hours of charter jets was considered and dropped (October 2026). OpenSky's daily request limit allows about 130 requests, the full pull needed about 55,000, and the result would only have produced a label, not changed any cost.

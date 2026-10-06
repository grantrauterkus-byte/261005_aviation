# Worked example: Challenger 300, default scenario

This works through the cost of owning a Challenger 300 for the default demo scenario, step by step, following SPEC.md "How costs are calculated". Every value comes from `data/assumptions.csv` (the Assumptions Library) or from the OurAirports airport file. A unit test (`src/engine/workedExample.test.ts`) checks that the app's cost engine gives the same results to the dollar.

The steps carry hours at full precision. They are shown rounded here, so a few totals differ from the sum of the rounded figures by a dollar or so.

## The scenario

- Home base: Teterboro (TEB)
- Trips, all round trips from Teterboro:

| Trip | Passengers | Bags | Days at destination | Times a year |
|---|---|---|---|---|
| Palm Beach (PBI) | 4 | 4 | 5 | 8 |
| Aspen (ASE) | 6 | 8 | 4 | 4 |
| Los Angeles, Van Nuys (VNY) | 4 | 4 | 3 | 4 |
| Boston, Bedford (BED) | 3 | 2 | 0 (same day) | 10 |

- Hours chartered out: 0
- Requirements, filled in from the trips: 6 seats, 8 bags, runway check on, 10% range safety margin, no limit on fuel stops, no must-haves.

## Values used

| Value | Amount | Library row |
|---|---|---|
| Range with 4 passengers | 3,220 nautical miles | challenger-300.range_4_pax |
| Cruise speed | 459 knots | challenger-300.cruise_speed |
| Seats | 8 | challenger-300.seats |
| Bag space | 106 cubic feet | challenger-300.bag_space |
| Takeoff distance | 4,810 ft | challenger-300.takeoff_distance |
| Fuel burn | 295 gallons per hour | challenger-300.fuel_burn |
| Maintenance (labor and parts) | $1,300 per hour | challenger-300.maintenance_per_hour |
| Engine reserve | $825 per hour | challenger-300.engine_reserve_per_hour |
| Purchase price | $8,200,000 (low $6,300,000, high $10,600,000) | challenger-300.purchase_price |
| Yearly value loss | 9.0% (low 7.9%, high 10.3%) | challenger-300.yearly_value_loss |
| Charter rate | $7,500 per hour (not used here: no charter hours) | challenger-300.charter_rate |
| Average pilot salary | $161,795 a year | super-midsize.pilot_salary_average |
| Benefits share | 43% of salary | super-midsize.benefits_share |
| Pilot training | $22,500 per pilot a year | super-midsize.pilot_training |
| Hangar | $66,450 a year | super-midsize.hangar |
| Insurance hull rate | 0.185% of price a year | super-midsize.insurance_hull_rate |
| Liability insurance | $18,500 a year | super-midsize.insurance_liability |
| Management fee | $81,000 a year | super-midsize.management_fee |
| Other fixed costs | $62,500 a year | super-midsize.other_fixed |
| Days out of service (base) | 14 a year | super-midsize.base_days_out_of_service |
| Extra days out of service | 2.5 per 100 hours | super-midsize.extra_days_out_of_service_per_100_hours |
| Fuel price | $8.49 a gallon (low $7.57, high $9.16) | all.fuel_price |
| Taxi, climb and descent allowance | 0.3 hours per flight | all.taxi_climb_descent_allowance |
| Landing and handling fee | $400 per landing | all.landing_handling_fee |
| Parking | $150 a night | all.parking_per_night |
| Pilots' hotel and meals | $330 per pilot a night | all.pilot_hotel_meals_per_night |
| Charter hours per available day | 1.0 | all.charter_hours_per_available_day |
| Third pilot needed above | 500 hours a year | all.third_pilot_threshold_hours |
| Typical owner's hours | 400 a year | all.typical_yearly_hours |
| Buying costs | 1.0% of price | all.buying_costs |
| Selling costs | 3.0% of price | all.selling_costs |
| Sales tax | 0% | all.sales_tax |
| Space per suitcase | 2.5 cubic feet | all.bag_size |

## Does it fit?

- Seats: 8, you need 6. Fits.
- Bag space: 106 cubic feet, you need 8 bags × 2.5 = 20 cubic feet. Fits.
- Runway: it needs 4,810 ft. The shortest longest-runway among the airports is Teterboro's 6,997 ft. Fits.
- No must-haves and no fuel-stop limit are set.

## 1. Turning trips into flying

**Usable range** = 3,220 × (1 − 10%) = 2,898 nautical miles. Every trip is shorter than this, so none needs a fuel stop.

**Flight time for one leg** = distance ÷ 459 knots + 0.3 hours.

| Trip | Distance (nautical miles) | Flying time | One leg with allowance | Hours a year (2 legs × times a year) |
|---|---|---|---|---|
| Palm Beach | 901.7 | 1.965 h | 2.265 h | 2 × 2.265 × 8 = 36.23 |
| Aspen | 1,502.5 | 3.273 h | 3.573 h | 2 × 3.573 × 4 = 28.59 |
| Van Nuys | 2,129.4 | 4.639 h | 4.939 h | 2 × 4.939 × 4 = 39.51 |
| Bedford | 157.8 | 0.344 h | 0.644 h | 2 × 0.644 × 10 = 12.88 |

**Wait, or fly home empty?** For round trips with days at the destination:

- Waiting costs nights × (2 pilots × $330 + $150 parking) = nights × $810.
- Flying home empty and back costs two extra legs. Each leg costs its hours × the hourly flying cost, plus a $400 landing fee.
  - Hourly flying cost = 295 gallons × $8.49 + $1,300 maintenance + $825 engine reserve = $4,629.55 an hour.

| Trip | Wait | Fly home empty and back | Cheaper |
|---|---|---|---|
| Palm Beach | 5 × $810 = $4,050 | 2 × (2.265 × $4,629.55 + $400) = $21,768 | Wait |
| Aspen | 4 × $810 = $3,240 | 2 × (3.573 × $4,629.55 + $400) = $33,887 | Wait |
| Van Nuys | 3 × $810 = $2,430 | 2 × (4.939 × $4,629.55 + $400) = $46,533 | Wait |

The jet waits at the destination on every trip, so there are no empty legs.

**Yearly totals:**

- Hours with you onboard = 36.23 + 28.59 + 39.51 + 12.88 = **117.21 hours**
- Empty hours = 0
- Charter hours = 0
- **Total yearly hours = 117.21**
- Landings = 2 per trip × (8 + 4 + 4 + 10) = 52
- Nights away = 5 × 8 + 4 × 4 + 3 × 4 + 0 × 10 = 68
- Fuel stops = 0

## 2. Can the jet fly that much?

- Days out of service = 14 + 2.5 × 117.21 ÷ 100 = 16.9 days
- Days the owner is using the jet = (5 + 1) × 8 + (4 + 1) × 4 + (3 + 1) × 4 + (0 + 1) × 10 = 48 + 20 + 16 + 10 = 94
- Most charter hours possible = 247 a year, rounded down. Days out of service go up as charter hours go up, so the app solves both together: 1.0 × (365 − 14 − 94 − 2.5 × 117.21 ÷ 100) ÷ (1 + 2.5 × 1.0 ÷ 100) = 247.6. The user asked for 0, so there is no limit.
- Number of pilots: 117.21 hours is below 500, so **2 pilots**.

## 3. Yearly costs

| Cost | Calculation | Amount |
|---|---|---|
| Fuel | 117.21 h × 295 gal × $8.49 | $293,562 |
| Maintenance | 117.21 h × $1,300 | $152,375 |
| Engine reserve | 117.21 h × $825 | $96,700 |
| Landing and handling | 52 × $400 | $20,800 |
| Fuel stop fees | 0 × $300 | $0 |
| Parking | 68 nights × $150 | $10,200 |
| Pilots' travel | 68 nights × 2 pilots × $330 | $44,880 |
| Pilots | 2 × $161,795 × (1 + 43%) | $462,734 |
| Pilot training | 2 × $22,500 | $45,000 |
| Hangar | | $66,450 |
| Insurance | 0.185% × $8,200,000 + $18,500 | $33,670 |
| Management fee | | $81,000 |
| Other fixed costs | | $62,500 |
| Charter certificate costs | no charter hours | $0 |
| **All yearly costs** | | **$1,369,871** |
| Charter income | no charter hours | $0 |

## 4. Buying and selling

- Purchase price: $8,200,000
- Buying costs: $8,200,000 × 1.0% = $82,000. Sales tax: $8,200,000 × 0% = $0.
- Resale value after 5 years = $8,200,000 × (1 − 9.0%)⁵ = $8,200,000 × 0.624032 = $5,117,064
- Extra value loss for high hours: 117.21 hours a year is below the typical 400, so $0.
- Selling costs = $5,117,064 × 3.0% = $153,512
- **Value lost** = $8,200,000 + $82,000 + $0 − ($5,117,064 − $153,512) = **$3,318,448**

## 5. The three numbers

- **5-year total cost** = $3,318,448 + 5 × ($1,369,871 − $0) = **$10,167,803**
- **Yearly out-of-pocket cost** = $1,369,871 − $0 = **$1,369,871**
- **Cost per hour you fly** = $10,167,803 ÷ (5 × 117.21) = **$17,349**

## 6. Ranges

Each range assumption is first moved alone to its low and then its high, with everything else typical. Charter rate and owner's share of charter revenue make no difference here because there are no charter hours.

| Assumption | Total at low | Total at high | Difference |
|---|---|---|---|
| Purchase price ($6.3M / $10.6M) | $9,398,895 | $11,139,056 | $1,740,162 |
| Yearly value loss (7.9% / 10.3%) | $9,860,468 | $10,512,357 | $651,889 |
| Fuel price ($7.57 / $9.16) | $10,008,747 | $10,283,638 | $274,891 |

For each assumption the low end is the favorable one. Insurance stays on the typical purchase price, as SPEC.md says.

- **Low** (price $6.3M, value loss 7.9%, fuel $7.57) = **$9,003,715**. Yearly out-of-pocket $1,338,060; cost per hour $15,363.
- **High** (price $10.6M, value loss 10.3%, fuel $9.16) = **$11,700,289**. Yearly out-of-pocket $1,393,038; cost per hour $19,964.
- **The assumption that moves this jet's total the most:** purchase price, by $1,740,162 between its low and high.

## What drives this cost (5 years)

| Part | Calculation | Amount |
|---|---|---|
| Value lost | | $3,318,448 |
| Crew | 5 × (pilots $462,734 + training $45,000 + pilots' travel $44,880) | $2,763,069 |
| Fixed costs | 5 × (hangar $66,450 + insurance $33,670 + management $81,000 + other $62,500 + charter certificate $0) | $1,218,100 |
| Fuel | 5 × $293,562 | $1,467,812 |
| Maintenance and engine reserve | 5 × ($152,375 + $96,700) | $1,245,374 |
| Trip fees | 5 × (landing and handling $20,800 + fuel stops $0 + parking $10,200) | $155,000 |
| Charter income | | $0 |
| **Total** | | **$10,167,803** |

import { describe, expect, it } from 'vitest'
import { calculate, defaultInputs } from './index.ts'
import { demoData } from './__fixtures__/data.ts'

/** Checks the engine against docs/worked-example.md, to the dollar. */
describe('worked example: Challenger 300, default scenario', () => {
  const results = calculate(defaultInputs(), {}, demoData())
  const c300 = results.fitting.find((r) => r.jet.id === 'challenger-300')!
  const t = c300.typical
  const dollars = (n: number | null) => Math.round(n ?? NaN)

  it('fits', () => {
    expect(c300.fits).toBe(true)
    expect(c300.reasons).toEqual([])
  })

  it('turns trips into flying', () => {
    expect(t.plans.map((p) => p.choice)).toEqual(['wait', 'wait', 'wait', null])
    expect(t.plans.map((p) => p.distanceNm.toFixed(1))).toEqual(['901.7', '1502.5', '2129.4', '157.8'])
    expect(dollars(t.plans[0].waitCost)).toBe(4050)
    expect(dollars(t.plans[0].flyHomeCost)).toBe(21768)
    expect(t.ownerHours.toFixed(2)).toBe('117.21')
    expect(t.emptyHours).toBe(0)
    expect(t.landings).toBe(52)
    expect(t.nightsAway).toBe(68)
    expect(t.fuelStopsPerYear).toBe(0)
    expect(c300.tripsNonstop).toBe(26)
    expect(c300.tripsTotal).toBe(26)
  })

  it('checks availability and pilots', () => {
    expect(t.ownerDays).toBe(94)
    expect(t.daysOutOfService.toFixed(1)).toBe('16.9')
    expect(t.maxCharterHours).toBe(247)
    expect(t.charterLimited).toBe(false)
    expect(t.pilots).toBe(2)
  })

  it('adds up yearly costs', () => {
    const y = t.yearly
    expect(dollars(y.fuel)).toBe(293562)
    expect(dollars(y.maintenance)).toBe(152375)
    expect(dollars(y.engineReserve)).toBe(96700)
    expect(dollars(y.landingAndHandling)).toBe(20800)
    expect(dollars(y.fuelStopFees)).toBe(0)
    expect(dollars(y.parking)).toBe(10200)
    expect(dollars(y.pilotTravel)).toBe(44880)
    expect(dollars(y.pilots)).toBe(462734)
    expect(dollars(y.pilotTraining)).toBe(45000)
    expect(dollars(y.hangar)).toBe(66450)
    expect(dollars(y.insurance)).toBe(33670)
    expect(dollars(y.managementFee)).toBe(81000)
    expect(dollars(y.otherFixed)).toBe(62500)
    expect(dollars(y.charterCertificate)).toBe(0)
    expect(dollars(t.yearlyCostsTotal)).toBe(1369871)
    expect(dollars(t.charterIncome)).toBe(0)
  })

  it('works out buying and selling', () => {
    const p = t.purchase
    expect(p.price).toBe(8200000)
    expect(dollars(p.buyingCosts)).toBe(82000)
    expect(dollars(p.salesTax)).toBe(0)
    expect(dollars(p.resaleBeforeHighHours)).toBe(5117064)
    expect(dollars(p.highHoursLoss)).toBe(0)
    expect(dollars(p.sellingCosts)).toBe(153512)
    expect(dollars(p.valueLost)).toBe(3318448)
  })

  it('gives the three numbers with low and high', () => {
    expect(dollars(c300.fiveYearTotal.typical)).toBe(10167803)
    expect(dollars(c300.yearlyOutOfPocket.typical)).toBe(1369871)
    expect(dollars(c300.costPerHour.typical)).toBe(17349)
    expect(dollars(c300.fiveYearTotal.low)).toBe(9003715)
    expect(dollars(c300.fiveYearTotal.high)).toBe(11700289)
    expect(dollars(c300.yearlyOutOfPocket.low)).toBe(1338060)
    expect(dollars(c300.yearlyOutOfPocket.high)).toBe(1393038)
    expect(dollars(c300.costPerHour.low)).toBe(15363)
    expect(dollars(c300.costPerHour.high)).toBe(19964)
  })

  it('names the biggest driver', () => {
    expect(c300.biggestDriver?.assumptionId).toBe('challenger-300.purchase_price')
    expect(dollars(c300.biggestDriver?.totalAtLow ?? null)).toBe(9398895)
    expect(dollars(c300.biggestDriver?.totalAtHigh ?? null)).toBe(11139056)
    expect(dollars(c300.biggestDriver?.difference ?? null)).toBe(1740162)
  })

  it('splits the total into what drives it', () => {
    const b = c300.breakdown
    expect(dollars(b.valueLost)).toBe(3318448)
    expect(dollars(b.pilotsAndOther)).toBe(4136169)
    expect(dollars(b.fuel)).toBe(1467812)
    expect(dollars(b.maintenance)).toBe(1245374)
    expect(dollars(b.charterIncome)).toBe(0)
  })
})

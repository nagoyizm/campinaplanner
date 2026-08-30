import { addDays, differenceInDays, format } from 'date-fns'

export interface SeasonRateItem {
  id?: string
  seasonId?: string
  unitTypeId: string
  rackRate: number
  extraPersonAdult?: number
  extraPersonChild?: number
  weekendSurcharge?: number
  includedOccupants?: number
}

export interface SeasonItem {
  id: string
  name: string
  startDate: string // "YYYY-MM-DD"
  endDate: string   // "YYYY-MM-DD"
  priority?: number
  active?: boolean
  rates?: SeasonRateItem[]
}

export interface BaseRateItem {
  id?: string
  name?: string
  rackRate: number
  includedOccupants?: number
  extraPersonAdult?: number
  extraPersonChild?: number
  weekendSurcharge?: number
}

export interface NightPricingBreakdown {
  date: string
  seasonId?: string | null
  seasonName: string
  rackRate: number
  extraCharge: number
  weekendCharge: number
  nightTotal: number
}

export interface StayPricingResult {
  totalNights: number
  totalPrice: number
  avgNightRate: number
  rackRateSum: number
  extraChargesTotal: number
  weekendChargesTotal: number
  appliedSeasons: string[]
  primarySeasonName: string
  breakdown: NightPricingBreakdown[]
}

export interface CalculateStayPricingParams {
  unitTypeId: string
  arrival: string | Date // "YYYY-MM-DD" or Date
  departure: string | Date // "YYYY-MM-DD" or Date
  adults?: number
  children?: number
  seasons?: SeasonItem[]
  baseRate?: BaseRateItem | null
}

function normalizeDateString(d: string | Date): string {
  if (typeof d === 'string') {
    return d.split('T')[0]
  }
  return format(d, 'yyyy-MM-dd')
}

export function calculateStayPricing({
  unitTypeId,
  arrival,
  departure,
  adults = 2,
  children = 0,
  seasons = [],
  baseRate = null,
}: CalculateStayPricingParams): StayPricingResult {
  const arrStr = normalizeDateString(arrival)
  const depStr = normalizeDateString(departure)

  const arrParts = arrStr.split('-').map(Number)
  const depParts = depStr.split('-').map(Number)

  const arrDate = new Date(Date.UTC(arrParts[0], arrParts[1] - 1, arrParts[2]))
  const depDate = new Date(Date.UTC(depParts[0], depParts[1] - 1, depParts[2]))

  const numNights = Math.max(1, differenceInDays(depDate, arrDate))
  const activeSeasons = (seasons || []).filter(s => s.active !== false)

  // Sort active seasons by priority DESC so highest priority matches first
  const sortedSeasons = [...activeSeasons].sort((a, b) => (b.priority || 0) - (a.priority || 0))

  const breakdown: NightPricingBreakdown[] = []
  const appliedSeasonsSet = new Set<string>()

  let totalPrice = 0
  let rackRateSum = 0
  let extraChargesTotal = 0
  let weekendChargesTotal = 0

  for (let i = 0; i < numNights; i++) {
    const currentNightDate = addDays(arrDate, i)
    const nightStr = format(currentNightDate, 'yyyy-MM-dd')
    const dayOfWeek = currentNightDate.getUTCDay() // 0 = Sunday, 5 = Friday, 6 = Saturday
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6

    // Find matching season for this night
    let matchingSeason: SeasonItem | null = null
    let matchingRate: SeasonRateItem | null = null

    for (const season of sortedSeasons) {
      if (season.startDate <= nightStr && nightStr <= season.endDate) {
        const rateForUnit = (season.rates || []).find(r => r.unitTypeId === unitTypeId)
        if (rateForUnit && rateForUnit.rackRate > 0) {
          matchingSeason = season
          matchingRate = rateForUnit
          break
        }
      }
    }

    const seasonName = matchingSeason ? matchingSeason.name : (baseRate?.name || 'Tarifa Base')
    appliedSeasonsSet.add(seasonName)

    const rackRate = matchingRate ? matchingRate.rackRate : (baseRate?.rackRate || 0)
    const included = matchingRate?.includedOccupants ?? (baseRate?.includedOccupants || 2)
    const extraAdultRate = matchingRate?.extraPersonAdult ?? (baseRate?.extraPersonAdult || 0)
    const extraChildRate = matchingRate?.extraPersonChild ?? (baseRate?.extraPersonChild || 0)
    const weekendSurcharge = matchingRate?.weekendSurcharge ?? (baseRate?.weekendSurcharge || 0)

    const extraAdults = Math.max(0, adults - included)
    const extraChildren = extraAdults > 0 ? children : Math.max(0, (adults + children) - included)
    const extraCharge = (extraAdults * extraAdultRate) + (extraChildren * extraChildRate)
    const weekendCharge = isWeekend ? weekendSurcharge : 0

    const nightTotal = rackRate + extraCharge + weekendCharge

    totalPrice += nightTotal
    rackRateSum += rackRate
    extraChargesTotal += extraCharge
    weekendChargesTotal += weekendCharge

    breakdown.push({
      date: nightStr,
      seasonId: matchingSeason?.id || null,
      seasonName,
      rackRate,
      extraCharge,
      weekendCharge,
      nightTotal,
    })
  }

  const appliedSeasons = Array.from(appliedSeasonsSet)
  const primarySeasonName = appliedSeasons.length === 1 ? appliedSeasons[0] : appliedSeasons.join(', ')

  return {
    totalNights: numNights,
    totalPrice,
    avgNightRate: Math.round(totalPrice / numNights),
    rackRateSum,
    extraChargesTotal,
    weekendChargesTotal,
    appliedSeasons,
    primarySeasonName,
    breakdown,
  }
}

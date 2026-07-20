import type {
  Refuel,
  Expense,
  Income,
  Trip,
  OdometerReading,
  Reminder,
  Vehicle,
  FuelType,
  TireType,
} from '../types'
import { FUEL_LABELS } from '../types'
import { monthKey, todayDateISO } from './format'

export const sortRefuels = (r: Refuel[]): Refuel[] =>
  [...r].sort((a, b) => a.odometer - b.odometer || a.date.localeCompare(b.date))

export interface ConsumptionPoint {
  refuelId: string
  date: string
  odometer: number
  distance: number
  litersUsed: number
  consumption: number // л/100км
}

/** Разход „пълен до пълен" за списък зареждания (с едно гориво). */
export const computeConsumption = (refuels: Refuel[]): ConsumptionPoint[] => {
  const sorted = sortRefuels(refuels)
  const points: ConsumptionPoint[] = []
  let prevFull = -1
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i]
    if (!cur.fullTank) continue
    if (prevFull === -1) {
      prevFull = i
      continue
    }
    const distance = cur.odometer - sorted[prevFull].odometer
    let litersUsed = 0
    let missed = false
    for (let j = prevFull + 1; j <= i; j++) {
      litersUsed += sorted[j].liters
      if (sorted[j].missedFill) missed = true
    }
    if (distance > 0 && litersUsed > 0 && !missed) {
      points.push({
        refuelId: cur.id,
        date: cur.date,
        odometer: cur.odometer,
        distance,
        litersUsed,
        consumption: (litersUsed / distance) * 100,
      })
    }
    prevFull = i
  }
  return points
}

export interface AllData {
  refuels: Refuel[]
  expenses: Expense[]
  incomes: Income[]
  trips: Trip[]
  readings: OdometerReading[]
}

/** Начална точка за изминато разстояние.
 *  includeInitial („От началото"): началният км на автомобила, ако е въведен;
 *  иначе (или при период) — първият въведен километраж от записите. */
export const firstOdometer = (v: Vehicle, d: AllData, includeInitial: boolean): number => {
  if (includeInitial && v.initialOdometer > 0) return v.initialOdometer
  const vals = [
    ...d.refuels.map((r) => r.odometer),
    ...d.expenses.map((e) => e.odometer ?? 0),
    ...d.incomes.map((i) => i.odometer ?? 0),
    ...d.trips.map((t) => t.startOdometer),
    ...d.readings.map((r) => r.odometer),
  ].filter((n) => n > 0)
  return vals.length ? Math.min(...vals) : v.initialOdometer
}

/** Текущ километраж = максимумът от всички въведени стойности. */
export const currentOdometer = (v: Vehicle, d: AllData): number => {
  const vals = [
    v.initialOdometer,
    ...d.refuels.map((r) => r.odometer),
    ...d.expenses.map((e) => e.odometer ?? 0),
    ...d.incomes.map((i) => i.odometer ?? 0),
    ...d.trips.map((t) => t.endOdometer ?? t.startOdometer),
    ...d.readings.map((r) => r.odometer),
  ].filter((n) => n > 0)
  return vals.length ? Math.max(...vals) : v.initialOdometer
}

export interface FuelStats {
  fuel: FuelType
  label: string
  liters: number
  cost: number
  avg: number | null
  low: number | null
  high: number | null
  last: number | null
}

export interface VehicleStats {
  totalFuelCost: number
  totalExpenseCost: number
  totalIncome: number
  totalCost: number
  balance: number
  totalLiters: number
  totalDistance: number
  avgConsumption: number | null
  lastConsumption: number | null
  avgPricePerLiter: number | null
  costPerKm: number | null
  fuelCostPerKm: number | null
  costPerDay: number | null
  currentOdometer: number
  refuelCount: number
  daysSpan: number
  byFuel: FuelStats[]
}

const allDates = (d: AllData): string[] => [
  ...d.refuels.map((r) => r.date),
  ...d.expenses.map((e) => e.date),
  ...d.incomes.map((i) => i.date),
  ...d.trips.map((t) => t.date),
  ...d.readings.map((r) => r.date),
]

/** periodBounded: true при доклад/справка за период — разстоянието е мин→макс км от записите
 *  в периода; false („От началото") — от първия въведен км, вкл. началния на автомобила. */
export const computeStats = (v: Vehicle, d: AllData, periodBounded = false): VehicleStats => {
  const totalFuelCost = d.refuels.reduce((s, r) => s + r.total, 0)
  const totalExpenseCost = d.expenses.reduce((s, e) => s + e.cost, 0)
  const totalIncome = d.incomes.reduce((s, i) => s + i.amount, 0)
  const totalLiters = d.refuels.reduce((s, r) => s + r.liters, 0)

  const odo = currentOdometer(v, d)
  const totalDistance = Math.max(0, odo - firstOdometer(v, d, !periodBounded))

  // разход по гориво
  const byFuel: FuelStats[] = v.fuels.map((fuel) => {
    const rf = d.refuels.filter((r) => r.fuelType === fuel)
    const cons = computeConsumption(rf)
    const vals = cons.map((c) => c.consumption)
    return {
      fuel,
      label: FUEL_LABELS[fuel],
      liters: rf.reduce((s, r) => s + r.liters, 0),
      cost: rf.reduce((s, r) => s + r.total, 0),
      avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
      low: vals.length ? Math.min(...vals) : null,
      high: vals.length ? Math.max(...vals) : null,
      last: vals.length ? vals[vals.length - 1] : null,
    }
  })

  const allCons = computeConsumption(d.refuels)
  const avgConsumption = allCons.length ? allCons.reduce((s, c) => s + c.consumption, 0) / allCons.length : null
  const lastConsumption = allCons.length ? allCons[allCons.length - 1].consumption : null

  const avgPricePerLiter = totalLiters > 0 ? totalFuelCost / totalLiters : null
  const totalCost = totalFuelCost + totalExpenseCost
  const costPerKm = totalDistance > 0 ? totalCost / totalDistance : null
  const fuelCostPerKm = totalDistance > 0 ? totalFuelCost / totalDistance : null

  const dates = allDates(d).sort()
  let daysSpan = 1
  if (dates.length > 1) {
    daysSpan = Math.max(1, Math.round((new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()) / 86400000))
  }
  const costPerDay = totalCost > 0 ? totalCost / daysSpan : null

  return {
    totalFuelCost,
    totalExpenseCost,
    totalIncome,
    totalCost,
    balance: totalIncome - totalCost,
    totalLiters,
    totalDistance,
    avgConsumption,
    lastConsumption,
    avgPricePerLiter,
    costPerKm,
    fuelCostPerKm,
    costPerDay,
    currentOdometer: odo,
    refuelCount: d.refuels.length,
    daysSpan,
    byFuel,
  }
}

export interface RefuelIntervalStats {
  count: number
  avgDaysBetween: number | null
  avgKmBetween: number | null
  fuelCostPerDay: number | null
}

/** Статистика на интервалите между зарежданията: период първо→последно ÷ (брой − 1). */
export const refuelIntervalStats = (refuels: Refuel[]): RefuelIntervalStats => {
  const count = refuels.length
  if (count < 2) return { count, avgDaysBetween: null, avgKmBetween: null, fuelCostPerDay: null }
  const dates = refuels.map((r) => r.date).sort()
  const spanDays = Math.round((new Date(dates[count - 1]).getTime() - new Date(dates[0]).getTime()) / 86400000)
  const sorted = sortRefuels(refuels)
  const kmSpan = sorted[count - 1].odometer - sorted[0].odometer
  const totalCost = refuels.reduce((s, r) => s + r.total, 0)
  return {
    count,
    avgDaysBetween: spanDays > 0 ? spanDays / (count - 1) : null,
    avgKmBetween: kmSpan > 0 ? kmSpan / (count - 1) : null,
    fuelCostPerDay: spanDays > 0 ? totalCost / spanDays : null,
  }
}

export interface RecordIntervalStats {
  count: number
  avgDaysBetween: number | null
  avgAmount: number | null
  amountPerDay: number | null
}

/** Статистика на записи (разходи/приходи/услуги): период първо→последно ÷ (брой − 1). */
export const recordIntervalStats = (records: { date: string; amount: number }[]): RecordIntervalStats => {
  const count = records.length
  const totalAmount = records.reduce((s, r) => s + r.amount, 0)
  const avgAmount = count > 0 ? totalAmount / count : null
  if (count < 2) return { count, avgDaysBetween: null, avgAmount, amountPerDay: null }
  const dates = records.map((r) => r.date).sort()
  const spanDays = Math.round((new Date(dates[count - 1]).getTime() - new Date(dates[0]).getTime()) / 86400000)
  return {
    count,
    avgDaysBetween: spanDays > 0 ? spanDays / (count - 1) : null,
    avgAmount,
    amountPerDay: spanDays > 0 ? totalAmount / spanDays : null,
  }
}

export interface ServiceMileage {
  /** Общо изминати км по вид гуми (сегменти между смените) */
  tireKm: Partial<Record<TireType, number>>
  /** Км от последната смяна на масло */
  sinceOil: number | null
  /** Км от последната смяна на ремъци */
  sinceBelts: number | null
}

/** Пробег по компоненти от сервизните записи; смята се върху всички записи (не по период). */
export const serviceMileage = (expenses: Expense[], currentOdo: number): ServiceMileage => {
  const tireChanges = expenses
    .filter((e) => e.kind === 'service' && e.tireType && (e.odometer ?? 0) > 0)
    .sort((a, b) => a.odometer! - b.odometer!)

  // Пробег на текущия комплект: „нови" гуми нулират брояча за вида,
  // „стари" (сезонна ротация на същия комплект) продължават натрупването.
  const tireKm: Partial<Record<TireType, number>> = {}
  tireChanges.forEach((e, i) => {
    const end = i + 1 < tireChanges.length ? tireChanges[i + 1].odometer! : currentOdo
    const seg = Math.max(0, end - e.odometer!)
    const t = e.tireType!
    if (e.tireCondition === 'new') tireKm[t] = seg
    else tireKm[t] = (tireKm[t] ?? 0) + seg
  })

  const sinceLast = (category: string): number | null => {
    const last = expenses
      .filter((e) => e.kind === 'service' && e.category === category && (e.odometer ?? 0) > 0)
      .reduce<Expense | null>((best, e) => (!best || e.odometer! > best.odometer! ? e : best), null)
    return last ? Math.max(0, currentOdo - last.odometer!) : null
  }

  return {
    tireKm,
    sinceOil: sinceLast('Смяна на масло'),
    sinceBelts: sinceLast('Ремъци'),
  }
}

export interface MonthlyBucket {
  key: string
  fuel: number
  service: number
  expense: number
  income: number
  total: number
}

/** Месечни суми; при подадени from/to връща непрекъсната поредица от месеци (празните са с нули). */
export const monthlySpend = (d: AllData, from?: string, to?: string): MonthlyBucket[] => {
  const map = new Map<string, MonthlyBucket>()
  const get = (k: string) => {
    if (!map.has(k)) map.set(k, { key: k, fuel: 0, service: 0, expense: 0, income: 0, total: 0 })
    return map.get(k)!
  }
  d.refuels.forEach((r) => {
    const b = get(monthKey(r.date))
    b.fuel += r.total
    b.total += r.total
  })
  d.expenses.forEach((e) => {
    const b = get(monthKey(e.date))
    if (e.kind === 'service') b.service += e.cost
    else b.expense += e.cost
    b.total += e.cost
  })
  d.incomes.forEach((i) => {
    get(monthKey(i.date)).income += i.amount
  })
  if (from && to && from <= to) {
    const out: MonthlyBucket[] = []
    let [y, m] = monthKey(from).split('-').map(Number)
    const end = monthKey(to)
    for (let key = monthKey(from); key <= end; ) {
      out.push(map.get(key) ?? { key, fuel: 0, service: 0, expense: 0, income: 0, total: 0 })
      m++
      if (m > 12) { m = 1; y++ }
      key = `${y}-${String(m).padStart(2, '0')}`
    }
    return out
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
}

export interface NamedBucket {
  name: string
  total: number
}

export const expensesByCategory = (expenses: Expense[]): NamedBucket[] =>
  groupSum(expenses.map((e) => ({ name: e.category, total: e.cost })))

export const incomesByCategory = (incomes: Income[]): NamedBucket[] =>
  groupSum(incomes.map((i) => ({ name: i.category, total: i.amount })))

export const refuelsByStation = (refuels: Refuel[]): NamedBucket[] =>
  groupSum(refuels.map((r) => ({ name: r.station || 'Без бензиностанция', total: r.total })))

function groupSum(items: NamedBucket[]): NamedBucket[] {
  const m = new Map<string, number>()
  items.forEach((i) => m.set(i.name, (m.get(i.name) ?? 0) + i.total))
  return [...m.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total)
}

export interface PricePoint {
  x: string
  value: number
}
export const fuelPriceTrend = (refuels: Refuel[]): PricePoint[] =>
  sortRefuels(refuels)
    .filter((r) => r.pricePerLiter > 0)
    .map((r) => ({ x: r.date, value: Number(r.pricePerLiter.toFixed(3)) }))

export type ReminderStatus = 'overdue' | 'soon' | 'ok'
export interface ReminderInfo {
  status: ReminderStatus
  daysLeft: number | null
  kmLeft: number | null
  label: string
}

/** Патч при „изпълнено": повтарящо се напомняне се мести напред, еднократно се отбелязва done. */
export const advanceReminderPatch = (r: Reminder, currentOdo: number): Partial<Reminder> => {
  if (!r.repeatMonths && !r.repeatKm) return { done: true }
  const patch: Partial<Reminder> = {}
  if (r.repeatMonths && r.dueDate) {
    const d = new Date(r.dueDate)
    d.setMonth(d.getMonth() + r.repeatMonths)
    patch.dueDate = d.toISOString().slice(0, 10)
  }
  if (r.repeatKm) patch.dueOdometer = (r.dueOdometer ?? currentOdo) + r.repeatKm
  return patch
}

/** При „Маркирай като завършено": еднократно → done; повтарящо се → периодът
 *  стартира ОТ ДНЕС/текущия км (за разлика от advanceReminderPatch, който брои
 *  от стария падеж — ползва се в ExpenseForm). */
export const restartReminderPatch = (r: Reminder, currentOdo: number, today = todayDateISO()): Partial<Reminder> => {
  if (!r.repeatMonths && !r.repeatKm) return { done: true }
  const patch: Partial<Reminder> = {}
  if (r.repeatMonths) {
    const d = new Date(today + 'T00:00:00')
    d.setMonth(d.getMonth() + r.repeatMonths)
    const p = (n: number) => String(n).padStart(2, '0')
    patch.dueDate = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  }
  if (r.repeatKm) patch.dueOdometer = currentOdo + r.repeatKm
  return patch
}

export const reminderInfo = (r: Reminder, odo: number): ReminderInfo => {
  let daysLeft: number | null = null
  let kmLeft: number | null = null
  const parts: string[] = []
  if ((r.basis === 'date' || r.basis === 'both') && r.dueDate) {
    const diff = Math.ceil((new Date(r.dueDate).getTime() - Date.now()) / 86400000)
    daysLeft = diff
    parts.push(diff < 0 ? `просрочено с ${-diff} дни` : `след ${diff} дни`)
  }
  if ((r.basis === 'odometer' || r.basis === 'both') && r.dueOdometer) {
    const diff = r.dueOdometer - odo
    kmLeft = diff
    parts.push(diff < 0 ? `надвишено с ${-diff} км` : `след ${diff} км`)
  }
  let status: ReminderStatus = 'ok'
  if ((daysLeft !== null && daysLeft < 0) || (kmLeft !== null && kmLeft < 0)) status = 'overdue'
  else if ((daysLeft !== null && daysLeft <= 14) || (kmLeft !== null && kmLeft <= 500)) status = 'soon'
  return { status, daysLeft, kmLeft, label: parts.join(' · ') || 'без срок' }
}

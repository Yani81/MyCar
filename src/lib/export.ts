import type { Vehicle, Refuel, Expense, Income, Trip, OdometerReading, Reminder } from '../types'
import { FUEL_LABELS, TIRE_LABELS, consUnitLabel } from '../types'
import { computeStats, computeConsumption } from './calculations'

const nf2 = new Intl.NumberFormat('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nf0 = new Intl.NumberFormat('bg-BG', { maximumFractionDigits: 0 })
const fmt2 = (n: number) => nf2.format(n)
const fmt0 = (n: number) => nf0.format(n)

export interface ExportData {
  vehicle: Vehicle
  refuels: Refuel[]
  expenses: Expense[]
  incomes: Income[]
  trips: Trip[]
  readings: OdometerReading[]
  reminders: Reminder[]
  period?: { from: string; to: string }
}

function isoToBg(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

// ─── CSV ────────────────────────────────────────────────────────────────────

function esc(val: unknown): string {
  const s = val == null ? '' : String(val)
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
}

function row(...vals: unknown[]): string {
  return vals.map(esc).join(',')
}

export function exportVehicleCSV(data: ExportData) {
  const { vehicle, refuels, expenses, incomes, trips, readings } = data
  const lines: string[] = []

  lines.push(row('Автомобил', vehicle.name))
  if (vehicle.plate) lines.push(row('Рег. номер', vehicle.plate))
  lines.push(row('Период', data.period ? `${isoToBg(data.period.from)} – ${isoToBg(data.period.to)}` : 'От началото'))
  lines.push(row('Дата на експорт', new Date().toLocaleDateString('bg-BG')))
  lines.push('')

  if (refuels.length > 0) {
    lines.push(row('ГОРИВО'))
    lines.push(row('Дата', 'Км', 'Гориво', 'Литри', 'Цена/л', 'Сума', 'Станция', 'Пълен', 'Бележки'))
    refuels.forEach((r) =>
      lines.push(row(r.date, r.odometer, FUEL_LABELS[r.fuelType], r.liters, r.pricePerLiter, r.total, r.station ?? '', r.fullTank ? 'Да' : 'Не', r.notes ?? ''))
    )
    lines.push('')
  }

  if (expenses.length > 0) {
    lines.push(row('РАЗХОДИ'))
    lines.push(row('Дата', 'Км', 'Вид', 'Категория', 'Заглавие', 'Сума', 'Място', 'Бележки'))
    expenses.forEach((e) =>
      lines.push(row(e.date, e.odometer ?? '', e.kind === 'service' ? 'Ремонт' : 'Разход', e.category, e.title ?? '', e.cost, e.place ?? '', e.notes ?? ''))
    )
    lines.push('')
  }

  if (incomes.length > 0) {
    lines.push(row('ПРИХОДИ'))
    lines.push(row('Дата', 'Км', 'Категория', 'Сума', 'Бележки'))
    incomes.forEach((i) => lines.push(row(i.date, i.odometer ?? '', i.category, i.amount, i.notes ?? '')))
    lines.push('')
  }

  if (trips.length > 0) {
    lines.push(row('МАРШРУТИ'))
    lines.push(row('Дата', 'От', 'До', 'Начало км', 'Край км', 'Сума', 'Цел', 'Бележки'))
    trips.forEach((t) =>
      lines.push(row(t.date, t.origin, t.destination, t.startOdometer, t.endOdometer, t.total, t.reason ?? '', t.notes ?? ''))
    )
    lines.push('')
  }

  if (readings.length > 0) {
    lines.push(row('КИЛОМЕТРАЖ'))
    lines.push(row('Дата', 'Км', 'Бележки'))
    readings.forEach((r) => lines.push(row(r.date, r.odometer, r.notes ?? '')))
    lines.push('')
  }

  const BOM = '﻿'
  const safeName = vehicle.name.replace(/[/\\?%*:|"<>]/g, '-')
  const date = new Date().toISOString().slice(0, 10)
  const blob = new Blob([BOM + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mycar-${safeName}-${date}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── PDF (HTML в нов таб) ────────────────────────────────────────────────────

function htmlRows(rows: unknown[][]): string {
  return rows.map((r) => `<tr>${r.map((v) => `<td>${v == null ? '' : String(v)}</td>`).join('')}</tr>`).join('')
}

function htmlTable(title: string, heads: string[], rows: unknown[][]): string {
  if (rows.length === 0) return ''
  return `
    <section>
      <h2>${title}</h2>
      <table>
        <thead><tr>${heads.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${htmlRows(rows)}</tbody>
      </table>
    </section>`
}

/** Допълнителни данни на сервизен запис (масло, филтри, гуми, застраховка) за колоната „Детайли". */
function expenseDetails(e: Expense): string {
  const parts: string[] = []
  if (e.title) parts.push(e.title)
  if (e.oilType) parts.push(`Масло: ${e.oilType}`)
  const filters = [
    e.oilFilterChanged && 'маслен',
    e.fuelFilterChanged && 'горивен',
    e.airFilterChanged && 'въздушен',
    e.cabinFilterChanged && 'купе',
  ].filter(Boolean)
  if (filters.length) parts.push(`Филтри: ${filters.join(', ')}`)
  if (e.tireType) parts.push(`Гуми: ${TIRE_LABELS[e.tireType]}${e.tireCondition ? ` (${e.tireCondition === 'new' ? 'нови' : 'стари'})` : ''}${e.tireBrand ? ' ' + e.tireBrand : ''}${e.tireSize ? ' ' + e.tireSize : ''}${e.tireDot ? ' · DOT ' + e.tireDot : ''}`)
  if (e.insuranceType) parts.push(`${e.insuranceType}${e.insuranceCompany ? ' – ' + e.insuranceCompany : ''}`)
  return parts.join(' · ')
}

export function exportVehiclePDF(data: ExportData) {
  const { vehicle, refuels, expenses, incomes, trips, readings } = data
  const date = new Date().toLocaleDateString('bg-BG')

  // Разход и изминати км „пълен до пълен" по вид гориво
  const consMap = new Map<string, { consumption: number; distance: number }>()
  for (const fuel of new Set(refuels.map((r) => r.fuelType))) {
    computeConsumption(refuels.filter((r) => r.fuelType === fuel)).forEach((p) =>
      consMap.set(p.refuelId, { consumption: p.consumption, distance: p.distance })
    )
  }

  const stats = computeStats(vehicle, { refuels, expenses, incomes, trips, readings }, !!data.period)
  const mainFuel = vehicle.fuels[0]
  const consUnit = consUnitLabel(mainFuel)

  const summaryItems: [string, string][] = [
    ['Изминато разстояние', `${fmt0(stats.totalDistance)} км`],
    ['Общо разходи', `${fmt2(stats.totalCost)} €`],
    ['За гориво', `${fmt2(stats.totalFuelCost)} €`],
    ['Други разходи и услуги', `${fmt2(stats.totalExpenseCost)} €`],
    ['Приходи', `${fmt2(stats.totalIncome)} €`],
    ['Баланс', `${fmt2(stats.balance)} €`],
    ['Среден разход', stats.avgConsumption !== null ? `${fmt2(stats.avgConsumption)} ${consUnit}` : '—'],
    ['Разход на километър', stats.costPerKm !== null ? `${fmt2(stats.costPerKm)} €/км` : '—'],
  ]
  const summary = `
    <div class="summary">
      ${summaryItems.map(([l, v]) => `<div class="sumItem"><span>${l}</span><b>${v}</b></div>`).join('')}
    </div>`

  const body = `
    ${htmlTable('Гориво', ['Дата', 'Км', 'Гориво', 'Литри', 'Цена/л', 'Сума (€)', `Разход (${consUnit})`, 'Изминати км', 'Станция', 'Пълен'],
      refuels.map((r) => {
        const c = consMap.get(r.id)
        return [isoToBg(r.date.slice(0, 10)), fmt0(r.odometer), FUEL_LABELS[r.fuelType], fmt2(r.liters), fmt2(r.pricePerLiter), fmt2(r.total), c ? fmt2(c.consumption) : '', c ? fmt0(c.distance) : '', r.station ?? '', r.fullTank ? 'Да' : 'Не']
      }))}
    ${htmlTable('Разходи', ['Дата', 'Км', 'Вид', 'Категория', 'Сума (€)', 'Място', 'Детайли', 'Бележка'],
      expenses.map((e) => [isoToBg(e.date.slice(0, 10)), e.odometer ? fmt0(e.odometer) : '', e.kind === 'service' ? 'Ремонт' : 'Разход', e.category, fmt2(e.cost), e.place ?? '', expenseDetails(e), e.notes ?? '']))}
    ${htmlTable('Приходи', ['Дата', 'Км', 'Категория', 'Сума (€)', 'Бележка'],
      incomes.map((i) => [isoToBg(i.date.slice(0, 10)), i.odometer ? fmt0(i.odometer) : '', i.category, fmt2(i.amount), i.notes ?? '']))}
    ${htmlTable('Маршрути', ['Дата', 'От', 'До', 'Начало км', 'Край км', 'Разстояние (км)', 'Сума (€)', 'Цел'],
      trips.map((t) => [isoToBg(t.date.slice(0, 10)), t.origin, t.destination, fmt0(t.startOdometer), fmt0(t.endOdometer), fmt0(Math.max(0, t.endOdometer - t.startOdometer)), fmt2(t.total), t.reason ?? '']))}
    ${htmlTable('Километраж', ['Дата', 'Км'],
      readings.map((r) => [isoToBg(r.date.slice(0, 10)), fmt0(r.odometer)]))}
  `

  const periodLabel = data.period ? `${isoToBg(data.period.from)} – ${isoToBg(data.period.to)}` : 'От началото'

  const html = `<!DOCTYPE html>
<html lang="bg">
<head>
<meta charset="UTF-8">
<title>MyCar – ${vehicle.name}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,Arial,sans-serif;font-size:11px;color:#111;padding:0}
  .toolbar{background:#f2f2fc;border-bottom:2px solid #5b5bd6;padding:12px 20px;display:flex;align-items:center;gap:16px;position:sticky;top:0}
  .toolbar h1{font-size:16px;color:#5b5bd6;font-weight:700;flex:1}
  .toolbar p{font-size:11px;color:#666;margin-top:2px}
  .print-btn{background:#5b5bd6;color:#fff;border:none;padding:9px 20px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer}
  .print-btn:hover{background:#4a4ac0}
  .content{padding:20px}
  .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:24px}
  .sumItem{border:1px solid #cdcdf0;border-radius:8px;padding:8px 10px;background:#f8f8fe}
  .sumItem span{display:block;font-size:9px;color:#666;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px}
  .sumItem b{font-size:13px;color:#111}
  section{margin-bottom:28px;break-inside:avoid}
  h2{font-size:13px;font-weight:700;margin-bottom:8px;color:#5b5bd6;border-left:3px solid #5b5bd6;padding-left:8px;text-transform:uppercase;letter-spacing:.04em}
  table{width:100%;border-collapse:collapse}
  th{background:#f2f2fc;font-weight:600;text-align:left;padding:5px 8px;border:1px solid #cdcdf0;font-size:10px;white-space:nowrap}
  td{padding:4px 8px;border:1px solid #e8e8e8;vertical-align:top}
  tr:nth-child(even) td{background:#fafafa}
  @media print{
    .toolbar{position:static}
    .print-btn{display:none}
  }
  @page{
    @bottom-left{content:"MyCar";font-family:-apple-system,Arial,sans-serif;font-size:9px;color:#888}
  }
</style>
</head>
<body>
<div class="toolbar">
  <div style="flex:1">
    <h1>${vehicle.name}${vehicle.plate ? ' · ' + vehicle.plate : ''}</h1>
    <p>Период: ${periodLabel} · Генерирано на ${date}</p>
  </div>
  <button class="print-btn" onclick="window.print()">Запази като PDF</button>
</div>
<div class="content">${summary}${body}</div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

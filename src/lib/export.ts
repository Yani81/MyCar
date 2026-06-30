import type { Vehicle, Refuel, Expense, Income, Trip, OdometerReading, Reminder } from '../types'
import { FUEL_LABELS } from '../types'

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
      lines.push(row(e.date, e.odometer ?? '', e.kind === 'service' ? 'Услуга' : 'Разход', e.category, e.title ?? '', e.cost, e.place ?? '', e.notes ?? ''))
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

export function exportVehiclePDF(data: ExportData) {
  const { vehicle, refuels, expenses, incomes, trips, readings } = data
  const date = new Date().toLocaleDateString('bg-BG')

  const body = `
    ${htmlTable('Гориво', ['Дата', 'Км', 'Гориво', 'Литри', 'Цена/л', 'Сума (€)', 'Станция', 'Пълен'],
      refuels.map((r) => [r.date, r.odometer, FUEL_LABELS[r.fuelType], r.liters, r.pricePerLiter, r.total, r.station ?? '', r.fullTank ? 'Да' : 'Не']))}
    ${htmlTable('Разходи', ['Дата', 'Км', 'Вид', 'Категория', 'Заглавие', 'Сума (€)', 'Място'],
      expenses.map((e) => [e.date, e.odometer ?? '', e.kind === 'service' ? 'Услуга' : 'Разход', e.category, e.title ?? '', e.cost, e.place ?? '']))}
    ${htmlTable('Приходи', ['Дата', 'Км', 'Категория', 'Сума (€)'],
      incomes.map((i) => [i.date, i.odometer ?? '', i.category, i.amount]))}
    ${htmlTable('Маршрути', ['Дата', 'От', 'До', 'Начало км', 'Край км', 'Сума (€)', 'Цел'],
      trips.map((t) => [t.date, t.origin, t.destination, t.startOdometer, t.endOdometer, t.total, t.reason ?? '']))}
    ${htmlTable('Километраж', ['Дата', 'Км'],
      readings.map((r) => [r.date, r.odometer]))}
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
  .toolbar{background:#f0fafb;border-bottom:2px solid #1bb3bf;padding:12px 20px;display:flex;align-items:center;gap:16px;position:sticky;top:0}
  .toolbar h1{font-size:16px;color:#1bb3bf;font-weight:700;flex:1}
  .toolbar p{font-size:11px;color:#666;margin-top:2px}
  .print-btn{background:#1bb3bf;color:#fff;border:none;padding:9px 20px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer}
  .print-btn:hover{background:#149aa5}
  .content{padding:20px}
  section{margin-bottom:28px;break-inside:avoid}
  h2{font-size:13px;font-weight:700;margin-bottom:8px;color:#1bb3bf;border-left:3px solid #1bb3bf;padding-left:8px;text-transform:uppercase;letter-spacing:.04em}
  table{width:100%;border-collapse:collapse}
  th{background:#f0fafb;font-weight:600;text-align:left;padding:5px 8px;border:1px solid #c8e8ea;font-size:10px;white-space:nowrap}
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
<div class="content">${body}</div>
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

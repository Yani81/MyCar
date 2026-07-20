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
      lines.push(row(t.date, t.origin, t.destination ?? '', t.startOdometer, t.endOdometer ?? '', t.total, t.reason ?? '', t.notes ?? ''))
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

// ─── PDF (pdfmake — директно сваляне на файл, кирилица чрез Roboto) ─────────

const INDIGO = '#5b5bd6'
const HEAD_BG = '#f2f2fc'

type Cell = string | { text: string; alignment?: 'right'; bold?: boolean; color?: string; fontSize?: number }

/** Стойност в евро: дясно подравнена, със знака след числото. */
const euro = (n: number): Cell => ({ text: `${fmt2(n)} €`, alignment: 'right' })
/** Число (км, литри…): дясно подравнено, без валута. */
const rnum = (n: number, digits: 0 | 2 = 0): Cell => ({ text: digits === 2 ? fmt2(n) : fmt0(n), alignment: 'right' })

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
  if (e.vignetteValidUntil) parts.push(`Валидна до ${isoToBg(e.vignetteValidUntil)}`)
  if (e.insuranceType) parts.push(`${e.insuranceType}${e.insuranceCompany ? ' – ' + e.insuranceCompany : ''}`)
  return parts.join(' · ')
}

/** Секция с таблица за pdfmake; пропуска се при празни редове. */
function pdfSection(title: string, heads: string[], rows: Cell[][]): object[] {
  if (rows.length === 0) return []
  const headRow: Cell[] = heads.map((h) => ({ text: h, bold: true }))
  return [
    { text: title, color: INDIGO, bold: true, fontSize: 10, margin: [0, 12, 0, 4] },
    {
      table: {
        headerRows: 1,
        widths: heads.map(() => 'auto'),
        body: [headRow, ...rows],
      },
      fontSize: 8,
      layout: {
        fillColor: (rowIndex: number) => (rowIndex === 0 ? HEAD_BG : rowIndex % 2 === 0 ? '#fafafa' : null),
        hLineColor: () => '#e8e8e8',
        vLineColor: () => '#e8e8e8',
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
      },
    },
  ]
}

export async function exportVehiclePDF(data: ExportData) {
  const { vehicle, refuels, expenses, incomes, trips, readings } = data

  // Разход и изминати км „пълен до пълен" по вид гориво
  const consMap = new Map<string, { consumption: number; distance: number }>()
  for (const fuel of new Set(refuels.map((r) => r.fuelType))) {
    computeConsumption(refuels.filter((r) => r.fuelType === fuel)).forEach((p) =>
      consMap.set(p.refuelId, { consumption: p.consumption, distance: p.distance })
    )
  }

  const stats = computeStats(vehicle, { refuels, expenses, incomes, trips, readings }, !!data.period)
  const consUnit = consUnitLabel(vehicle.fuels[0])
  const periodLabel = data.period ? `${isoToBg(data.period.from)} – ${isoToBg(data.period.to)}` : 'От началото'

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
  const summaryCell = ([label, value]: [string, string]) => ({
    stack: [
      { text: label.toUpperCase(), fontSize: 6.5, color: '#666', margin: [0, 0, 0, 2] },
      { text: value, bold: true, fontSize: 10 },
    ],
    margin: [4, 4, 4, 4],
  })

  const content: object[] = [
    { text: `${vehicle.name}${vehicle.plate ? ' · ' + vehicle.plate : ''}`, color: INDIGO, bold: true, fontSize: 14 },
    { text: `Период: ${periodLabel} · Генерирано на ${new Date().toLocaleDateString('bg-BG')}`, color: '#666', fontSize: 8, margin: [0, 2, 0, 10] },
    {
      table: {
        widths: ['*', '*', '*', '*'],
        body: [summaryItems.slice(0, 4).map(summaryCell), summaryItems.slice(4).map(summaryCell)],
      },
      layout: {
        fillColor: () => '#f8f8fe',
        hLineColor: () => '#cdcdf0',
        vLineColor: () => '#cdcdf0',
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
      },
    },
    ...pdfSection('ГОРИВО', ['Дата', 'Км', 'Гориво', 'Литри', 'Цена/л', 'Сума', `Разход (${consUnit})`, 'Изминати км', 'Станция', 'Пълен'],
      refuels.map((r) => {
        const c = consMap.get(r.id)
        return [isoToBg(r.date.slice(0, 10)), rnum(r.odometer), FUEL_LABELS[r.fuelType], rnum(r.liters, 2), euro(r.pricePerLiter), euro(r.total), c ? rnum(c.consumption, 2) : '', c ? rnum(c.distance) : '', r.station ?? '', r.fullTank ? 'Да' : 'Не']
      })),
    ...pdfSection('РАЗХОДИ', ['Дата', 'Км', 'Вид', 'Категория', 'Сума', 'Място', 'Детайли', 'Бележка'],
      expenses.map((e) => [isoToBg(e.date.slice(0, 10)), e.odometer ? rnum(e.odometer) : '', e.kind === 'service' ? 'Ремонт' : 'Разход', e.category, euro(e.cost), e.place ?? '', expenseDetails(e), e.notes ?? ''])),
    ...pdfSection('ПРИХОДИ', ['Дата', 'Км', 'Категория', 'Сума', 'Бележка'],
      incomes.map((i) => [isoToBg(i.date.slice(0, 10)), i.odometer ? rnum(i.odometer) : '', i.category, euro(i.amount), i.notes ?? ''])),
    ...pdfSection('МАРШРУТИ', ['Дата', 'От', 'До', 'Начало км', 'Край км', 'Разстояние (км)', 'Сума', 'Цел'],
      trips.map((t) => [isoToBg(t.date.slice(0, 10)), t.origin, t.destination ? (t.roundTrip ? `${t.destination} и обратно` : t.destination) : 'в движение', rnum(t.startOdometer), t.endOdometer != null ? rnum(t.endOdometer) : '', t.endOdometer != null ? rnum(Math.max(0, t.endOdometer - t.startOdometer)) : '', euro(t.total), t.reason ?? ''])),
    ...pdfSection('КИЛОМЕТРАЖ', ['Дата', 'Км'],
      readings.map((r) => [isoToBg(r.date.slice(0, 10)), rnum(r.odometer)])),
  ]

  // pdfmake се зарежда мързеливо (~1 MB с шрифтовете) — само при реален експорт
  const [pdfMakeModule, fontsModule] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ])
  const pdfMake = (pdfMakeModule as { default?: unknown }).default ?? pdfMakeModule
  const fonts = (fontsModule as { default?: unknown }).default ?? fontsModule
  // 0.3.x: addVirtualFileSystem; 0.2.x: .vfs
  const pm = pdfMake as { addVirtualFileSystem?: (f: unknown) => void; vfs?: unknown; createPdf: (d: object) => { download: (name: string) => void } }
  if (typeof pm.addVirtualFileSystem === 'function') pm.addVirtualFileSystem(fonts)
  else pm.vfs = fonts

  const safeName = vehicle.name.replace(/[/\\?%*:|"<>]/g, '-')
  const date = new Date().toISOString().slice(0, 10)
  pm.createPdf({
    pageSize: 'A4',
    pageMargins: [28, 28, 28, 32],
    defaultStyle: { font: 'Roboto', fontSize: 8 },
    footer: { text: 'MyCar', fontSize: 7, color: '#888', margin: [28, 8, 0, 0] },
    content,
  }).download(`mycar-${safeName}-${date}.pdf`)
}

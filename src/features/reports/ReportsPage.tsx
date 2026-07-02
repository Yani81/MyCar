import { Fragment, useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import styles from './ReportsPage.module.css'
import { useStore, useActiveVehicle } from '../../store/useStore'
import {
  computeStats, computeConsumption, monthlySpend, expensesByCategory, incomesByCategory,
  refuelsByStation, fuelPriceTrend, type AllData, type NamedBucket,
} from '../../lib/calculations'
import { consUnitLabel, FUEL_UNITS } from '../../types'
import { money, num, numFixed, monthLabel, dateShort, km } from '../../lib/format'
import { IconIncome, IconRoute, IconWrench, IconFuel, IconChart } from '../../components/Layout/icons'
import { Modal } from '../../components/ui/Modal'
import { Field, Row, inputClass } from '../../components/ui/Field'

type RangeOption = 'all' | 'year' | 'halfyear' | 'quarter' | 'month' | 'custom'
type SubTab = 'general' | 'fuel' | 'expense' | 'income' | 'service'

const RANGE_LABELS: Record<RangeOption, string> = {
  all:      'От началото',
  year:     'Тази година',
  halfyear: 'Последните 6 месеца',
  quarter:  'Последните 3 месеца',
  month:    'Този месец',
  custom:   'Произволен период',
}

function isoToBg(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}
type Stats = ReturnType<typeof computeStats>
interface MonthlyRow { key: string; label: string; fuel: number; service: number; expense: number; income: number; total: number }

const DONUT_COLORS = ['#f5821f', '#5f7079', '#3f9c35', '#ec5b53', '#7e57c2', '#c2185b', '#7a5c4a', '#22d3ee']
const tooltipStyle = { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }

export function ReportsPage() {
  const v = useActiveVehicle()
  const refuels = useStore((s) => s.refuels)
  const expenses = useStore((s) => s.expenses)
  const incomes = useStore((s) => s.incomes)
  const trips = useStore((s) => s.trips)
  const readings = useStore((s) => s.readings)
  const [rangeOption, setRangeOption] = useState<RangeOption>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState(new Date().toLocaleDateString('sv'))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [tab, setTab] = useState<SubTab>('general')

  const firstRecordDate = useMemo(() => {
    if (!v) return ''
    let min = ''
    for (const arr of [refuels, expenses, incomes, trips, readings] as { vehicleId: string; date: string }[][]) {
      for (const x of arr) {
        if (x.vehicleId === v.id && (!min || x.date < min)) min = x.date
      }
    }
    return min || v.createdAt.slice(0, 10)
  }, [v, refuels, expenses, incomes, trips, readings])

  const { from, to } = useMemo(() => {
    const today = new Date()
    const todayStr = today.toLocaleDateString('sv')
    switch (rangeOption) {
      case 'all':      return { from: firstRecordDate, to: todayStr }
      case 'year':     return { from: `${today.getFullYear()}-01-01`, to: todayStr }
      case 'halfyear': { const d = new Date(today); d.setMonth(d.getMonth() - 6); return { from: d.toLocaleDateString('sv'), to: todayStr } }
      case 'quarter':  { const d = new Date(today); d.setMonth(d.getMonth() - 3); return { from: d.toLocaleDateString('sv'), to: todayStr } }
      case 'month':    return { from: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`, to: todayStr }
      case 'custom':   return { from: customFrom, to: customTo }
    }
  }, [firstRecordDate, rangeOption, customFrom, customTo])

  const data: AllData | null = useMemo(() => {
    if (!v) return null
    const f = <T extends { vehicleId: string; date: string }>(arr: T[]) =>
      arr.filter((x) => x.vehicleId === v.id && (!from || x.date >= from) && (!to || x.date <= to))
    return { refuels: f(refuels), expenses: f(expenses), incomes: f(incomes), trips: f(trips), readings: f(readings) }
  }, [v, refuels, expenses, incomes, trips, readings, from, to])

  const stats = useMemo(() => (v && data ? computeStats(v, data) : null), [v, data])
  const monthly: MonthlyRow[] = useMemo(
    () => (data ? monthlySpend(data).slice(-12).map((b) => ({ ...b, label: monthLabel(b.key) })) : []),
    [data]
  )

  if (!v || !data || !stats) return null
  const hasData = stats.refuelCount > 0 || stats.totalExpenseCost > 0 || stats.totalIncome > 0

  return (
    <div className={styles.wrap}>
      <Modal open={pickerOpen} title="Период" onClose={() => setPickerOpen(false)}>
        <div className={styles.pickerList}>
          {(Object.keys(RANGE_LABELS) as RangeOption[]).map((opt) => (
            <button
              key={opt}
              className={`${styles.pickerOpt} ${rangeOption === opt ? styles.pickerActive : ''}`}
              onClick={() => {
                if (opt === 'custom' && rangeOption !== 'custom') {
                  setCustomFrom(from)
                  setCustomTo(to)
                }
                setRangeOption(opt)
                if (opt !== 'custom') setPickerOpen(false)
              }}
            >
              {RANGE_LABELS[opt]}
            </button>
          ))}
        </div>
        {rangeOption === 'custom' && (
          <>
            <Row>
              <Field label="От">
                <input className={inputClass} type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              </Field>
              <Field label="До">
                <input className={inputClass} type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </Field>
            </Row>
            <button className={styles.applyBtn} onClick={() => setPickerOpen(false)}>Приложи</button>
          </>
        )}
      </Modal>

      <div className={styles.stickyFilters}>
        <button className={styles.rangeBtn} onClick={() => setPickerOpen(true)}>
          <span className={styles.rangeBtnLabel}>{RANGE_LABELS[rangeOption]}</span>
          <span className={styles.rangeBtnDates}>{isoToBg(from)} – {isoToBg(to)}</span>
          <span className={styles.rangeChev}>▾</span>
        </button>

        <div className={styles.tabs}>
          {([['general', 'Общ'], ['fuel', 'Гориво'], ['expense', 'Разходи'], ['income', 'Приход'], ['service', 'Услуга']] as [SubTab, string][]).map(
            ([id, label]) => (
              <button key={id} className={tab === id ? styles.tActive : ''} onClick={() => setTab(id)}>{label}</button>
            )
          )}
        </div>
      </div>

      {!hasData ? (
        <div className="empty" style={{ marginTop: 8 }}>Няма данни за избрания период.</div>
      ) : tab === 'general' ? (
        <General stats={stats} monthly={monthly} />
      ) : tab === 'fuel' ? (
        <Fuel data={data} stats={stats} monthly={monthly} />
      ) : tab === 'expense' ? (
        <Expense data={data} stats={stats} monthly={monthly} />
      ) : tab === 'income' ? (
        <IncomeTab data={data} stats={stats} monthly={monthly} />
      ) : (
        <Service data={data} monthly={monthly} />
      )}
    </div>
  )
}

function General({ stats, monthly }: { stats: Stats; monthly: MonthlyRow[] }) {
  const service = monthly.reduce((s, x) => s + x.service, 0)
  const expense = monthly.reduce((s, x) => s + x.expense, 0)
  return (
    <>
      <div className={styles.cards}>
        <Card label="Баланс" value={money(stats.balance)} perDay={stats.daysSpan} amount={stats.balance} dist={stats.totalDistance} color="var(--brand)" Icon={IconIncome} />
        <Card label="Разстояние" value={km(stats.totalDistance)} color="#5f7079" Icon={IconRoute} />
        <Card label="Разходи" value={money(stats.totalCost)} perDay={stats.daysSpan} amount={stats.totalCost} dist={stats.totalDistance} accent color="#f5821f" Icon={IconWrench} />
        <Card label="Приход" value={money(stats.totalIncome)} color="#3f9c35" Icon={IconIncome} />
      </div>
      <MonthlyChart monthly={monthly} stacked title="Разходи по месеци" />
      <Donut title="Сравнение на разходите" buckets={[
        { name: 'Гориво', total: stats.totalFuelCost },
        { name: 'Услуги', total: service },
        { name: 'Други', total: expense },
      ].filter((b) => b.total > 0)} />
    </>
  )
}

function Fuel({ data, stats, monthly }: { data: AllData; stats: Stats; monthly: MonthlyRow[] }) {
  const stations = refuelsByStation(data.refuels)
  const priceTrend = fuelPriceTrend(data.refuels).map((p) => ({ x: dateShort(p.x), value: p.value }))
  const multiTrend = stats.byFuel.filter((f) => f.liters > 0).length > 1
  const mainFuel = stats.byFuel[0]?.fuel ?? 'petrol'
  const consTrends = stats.byFuel
    .map((f) => ({
      fuel: f.fuel,
      label: f.label,
      points: computeConsumption(data.refuels.filter((r) => r.fuelType === f.fuel))
        .map((p) => ({ x: dateShort(p.date), value: Number(p.consumption.toFixed(2)) })),
    }))
    .filter((t) => t.points.length > 1)
  return (
    <>
      <div className={styles.cards}>
        <Card label="За гориво" value={money(stats.totalFuelCost)} color="#f5821f" Icon={IconFuel} />
        <Card label="Среден разход" value={stats.avgConsumption !== null ? numFixed(stats.avgConsumption) : '—'} unit={consUnitLabel(mainFuel)} accent color="#f5821f" Icon={IconChart} />
        <Card label={`Ср. цена/${mainFuel === 'electric' ? 'kWh' : 'литър'}`} value={stats.avgPricePerLiter !== null ? money(stats.avgPricePerLiter) : '—'} />
        <Card label="Гориво / км" value={stats.fuelCostPerKm !== null ? money(stats.fuelCostPerKm) : '—'} />
      </div>
      {stats.byFuel.filter((f) => f.liters > 0).map((f, i) => (
        <div key={f.fuel} className={`card ${styles.tank}`}>
          <div className={styles.tankHead}>Резервоар {i + 1} · {f.label}</div>
          <div className={styles.tankGrid}>
            <Mini label="Средно" value={f.avg !== null ? `${numFixed(f.avg)} ${consUnitLabel(f.fuel)}` : '—'} />
            <Mini label="Общ обем" value={`${num(f.liters, 1)} ${FUEL_UNITS[f.fuel]}`} />
            <Mini label="Обща стойност" value={money(f.cost)} />
            <Mini label="Висок" value={f.high !== null ? numFixed(f.high) : '—'} red />
            <Mini label="Последен" value={f.last !== null ? numFixed(f.last) : '—'} />
            <Mini label="Нисък" value={f.low !== null ? numFixed(f.low) : '—'} green />
          </div>
        </div>
      ))}
      {consTrends.map((t) => (
        <Fragment key={t.fuel}>
          <div className="section-title">Разход във времето{multiTrend ? ` · ${t.label}` : ''}</div>
          <div className={`card ${styles.chartCard}`}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={t.points} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="x" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} domain={['dataMin - 0.5', 'dataMax + 0.5']} tickFormatter={(v: number) => v.toFixed(1)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => [`${val.toFixed(2)} ${consUnitLabel(t.fuel)}`, 'Разход']} labelStyle={{ color: 'var(--muted)' }} />
                <Line type="monotone" dataKey="value" stroke="#f5821f" strokeWidth={2.5} dot={{ r: 2.5, fill: '#f5821f' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Fragment>
      ))}
      <MonthlyChart monthly={monthly} dataKey="fuel" title="Разходи за гориво по месеци" label="Гориво" />
      {stations.length > 0 && <Donut title="По бензиностанции" buckets={stations} />}
      {priceTrend.length > 1 && (
        <>
          <div className="section-title">Цена на горивото</div>
          <div className={`card ${styles.chartCard}`}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={priceTrend} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="x" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} domain={['dataMin - 0.1', 'dataMax + 0.1']} tickFormatter={(v: number) => v.toFixed(2)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => [`${val.toFixed(2)} €/${FUEL_UNITS[mainFuel]}`, 'Цена']} labelStyle={{ color: 'var(--muted)' }} />
                <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 2.5, fill: 'var(--accent)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </>
  )
}

function Expense({ data, stats, monthly }: { data: AllData; stats: Stats; monthly: MonthlyRow[] }) {
  const list = data.expenses.filter((e) => e.kind === 'expense')
  const cats = expensesByCategory(list)
  const total = cats.reduce((s, c) => s + c.total, 0)
  return (
    <>
      <div className={styles.cards}>
        <Card label="Други разходи" value={money(total)} perDay={stats.daysSpan} amount={total} dist={stats.totalDistance} accent color="#ec5b53" Icon={IconWrench} />
        <Card label="Брой записи" value={String(list.length)} />
      </div>
      <MonthlyChart monthly={monthly} dataKey="expense" title="Разходи по месеци" color="#ec5b53" label="Разходи" />
      {cats.length > 0 && <Donut title="По категории" buckets={cats} />}
    </>
  )
}

function IncomeTab({ data, stats, monthly }: { data: AllData; stats: Stats; monthly: MonthlyRow[] }) {
  const cats = incomesByCategory(data.incomes)
  return (
    <>
      <div className={styles.cards}>
        <Card label="Общо приход" value={money(stats.totalIncome)} accent color="#3f9c35" Icon={IconIncome} />
        <Card label="Баланс" value={money(stats.balance)} />
      </div>
      <MonthlyChart monthly={monthly} dataKey="income" title="Приходи по месеци" color="var(--green)" label="Приходи" />
      {cats.length > 0 && <Donut title="По източник" buckets={cats} />}
    </>
  )
}

function Service({ data, monthly }: { data: AllData; monthly: MonthlyRow[] }) {
  const list = data.expenses.filter((e) => e.kind === 'service')
  const cats = expensesByCategory(list)
  const total = cats.reduce((s, c) => s + c.total, 0)
  return (
    <>
      <div className={styles.cards}>
        <Card label="За сервиз" value={money(total)} accent color="#7a5c4a" Icon={IconWrench} />
        <Card label="Брой услуги" value={String(list.length)} />
      </div>
      <MonthlyChart monthly={monthly} dataKey="service" title="Услуги по месеци" color="#7a5c4a" label="Услуги" />
      {cats.length > 0 && <Donut title="По вид услуга" buckets={cats} />}
    </>
  )
}

function Card({ label, value, unit, perDay, amount, dist, accent, color, Icon }: {
  label: string; value: string; unit?: string; perDay?: number; amount?: number; dist?: number; accent?: boolean
  color?: string; Icon?: typeof IconWrench
}) {
  const c = color ?? 'var(--brand)'
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        {Icon && <span className={styles.cardIcon} style={{ background: c }}><Icon width={18} height={18} color="#fff" /></span>}
        <span className={styles.cardLabel}>{label}</span>
      </div>
      <span className={`${styles.cardValue} mono`} style={{ color: accent ? c : undefined }}>{value}{unit && <small> {unit}</small>}</span>
      {perDay !== undefined && amount !== undefined && (
        <div className={styles.cardSub}>
          <span>на ден<br /><b className="mono">{money(amount / Math.max(1, perDay))}</b></span>
          <span>на км<br /><b className="mono">{dist && dist > 0 ? money(amount / dist) : '—'}</b></span>
        </div>
      )}
    </div>
  )
}

function Mini({ label, value, green, red }: { label: string; value: string; green?: boolean; red?: boolean }) {
  return (
    <div className={styles.mini}>
      <span className={styles.miniLabel}>{label}</span>
      <span className="mono" style={{ fontWeight: 700, fontSize: 14, color: green ? 'var(--green)' : red ? 'var(--red)' : 'var(--text)' }}>{value}</span>
    </div>
  )
}

function MonthlyChart({ monthly, stacked, dataKey, title, color, label }: {
  monthly: MonthlyRow[]; stacked?: boolean; dataKey?: keyof MonthlyRow; title?: string; color?: string; label?: string
}) {
  if (monthly.length === 0) return null
  return (
    <>
      <div className="section-title">{title ?? 'Разходи по месеци'}</div>
      <div className={`card ${styles.chartCard}`}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthly} margin={{ top: 6, right: 0, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: 'var(--surface-3)' }} contentStyle={tooltipStyle} formatter={(val: number) => money(val)} labelStyle={{ color: 'var(--muted)' }} />
            {stacked ? (
              <>
                <Bar dataKey="fuel" name="Гориво" stackId="a" fill="var(--accent)" />
                <Bar dataKey="service" name="Услуги" stackId="a" fill="#7a5c4a" />
                <Bar dataKey="expense" name="Разходи" stackId="a" fill="#ec5b53" radius={[5, 5, 0, 0]} />
              </>
            ) : (
              <Bar dataKey={(dataKey as string) ?? 'total'} name={label ?? 'Общо'} fill={color ?? 'var(--accent)'} radius={[5, 5, 0, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

function Donut({ title, buckets }: { title: string; buckets: NamedBucket[] }) {
  if (buckets.length === 0) return null
  const top = buckets.slice(0, 8)
  return (
    <>
      <div className="section-title">{title}</div>
      <div className={`card ${styles.chartCard}`}>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={top} dataKey="total" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
              {top.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(val: number, name) => [money(val), name]} />
          </PieChart>
        </ResponsiveContainer>
        <div className={styles.legend}>
          {top.map((b, i) => (
            <span key={b.name}><i style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />{b.name} · <b className="mono">{money(b.total)}</b></span>
          ))}
        </div>
      </div>
    </>
  )
}

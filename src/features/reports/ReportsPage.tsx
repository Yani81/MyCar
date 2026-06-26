import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import styles from './ReportsPage.module.css'
import { useStore, useActiveVehicle } from '../../store/useStore'
import {
  computeStats, monthlySpend, expensesByCategory, incomesByCategory,
  refuelsByStation, fuelPriceTrend, type AllData, type NamedBucket,
} from '../../lib/calculations'
import { money, num, monthLabel, dateShort, km } from '../../lib/format'
import { IconIncome, IconRoute, IconWrench, IconFuel, IconChart } from '../../components/Layout/icons'

type Range = 'month' | 'year' | 'all'
type SubTab = 'general' | 'fuel' | 'expense' | 'income' | 'service'
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
  const [range, setRange] = useState<Range>('all')
  const [tab, setTab] = useState<SubTab>('general')

  const data: AllData | null = useMemo(() => {
    if (!v) return null
    let from = ''
    const now = new Date()
    if (range === 'month') from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    if (range === 'year') from = `${now.getFullYear()}-01-01`
    const f = <T extends { vehicleId: string; date: string }>(arr: T[]) =>
      arr.filter((x) => x.vehicleId === v.id && x.date >= from)
    return { refuels: f(refuels), expenses: f(expenses), incomes: f(incomes), trips: f(trips), readings: f(readings) }
  }, [v, refuels, expenses, incomes, trips, readings, range])

  const stats = useMemo(() => (v && data ? computeStats(v, data) : null), [v, data])
  const monthly: MonthlyRow[] = useMemo(
    () => (data ? monthlySpend(data).slice(-12).map((b) => ({ ...b, label: monthLabel(b.key) })) : []),
    [data]
  )

  if (!v || !data || !stats) return null
  const hasData = stats.refuelCount > 0 || stats.totalExpenseCost > 0 || stats.totalIncome > 0

  return (
    <div className={styles.wrap}>
      <div className={styles.stickyFilters}>
        <div className={styles.range}>
          {(['month', 'year', 'all'] as Range[]).map((r) => (
            <button key={r} className={range === r ? styles.rActive : ''} onClick={() => setRange(r)}>
              {r === 'month' ? 'Този месец' : r === 'year' ? 'Тази година' : 'Всичко'}
            </button>
          ))}
        </div>

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
  return (
    <>
      <div className={styles.cards}>
        <Card label="За гориво" value={money(stats.totalFuelCost)} color="#f5821f" Icon={IconFuel} />
        <Card label="Среден разход" value={stats.avgConsumption !== null ? num(stats.avgConsumption, 1) : '—'} unit="л/100км" accent color="#f5821f" Icon={IconChart} />
        <Card label="Ср. цена/литър" value={stats.avgPricePerLiter !== null ? money(stats.avgPricePerLiter) : '—'} />
        <Card label="Гориво / км" value={stats.fuelCostPerKm !== null ? money(stats.fuelCostPerKm) : '—'} />
      </div>
      {stats.byFuel.filter((f) => f.liters > 0).map((f, i) => (
        <div key={f.fuel} className={`card ${styles.tank}`}>
          <div className={styles.tankHead}>Резервоар {i + 1} · {f.label}</div>
          <div className={styles.tankGrid}>
            <Mini label="Средно" value={f.avg !== null ? `${num(f.avg, 2)} л/100км` : '—'} />
            <Mini label="Общ обем" value={`${num(f.liters, 1)} л`} />
            <Mini label="Нисък" value={f.low !== null ? num(f.low, 1) : '—'} green />
            <Mini label="Висок" value={f.high !== null ? num(f.high, 1) : '—'} red />
            <Mini label="Последен" value={f.last !== null ? num(f.last, 1) : '—'} />
            <Mini label="Обща цена" value={money(f.cost)} />
          </div>
        </div>
      ))}
      <MonthlyChart monthly={monthly} dataKey="fuel" title="Разходи за гориво по месеци" />
      {stations.length > 0 && <Donut title="По бензиностанции" buckets={stations} />}
      {priceTrend.length > 1 && (
        <>
          <div className="section-title">Цена на горивото</div>
          <div className={`card ${styles.chartCard}`}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={priceTrend} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="x" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} domain={['dataMin - 0.1', 'dataMax + 0.1']} />
                <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => [`${val.toFixed(3)} €/л`, 'Цена']} labelStyle={{ color: 'var(--muted)' }} />
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
      <MonthlyChart monthly={monthly} dataKey="expense" title="Разходи по месеци" color="#ec5b53" />
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
      <MonthlyChart monthly={monthly} dataKey="income" title="Приходи по месеци" color="var(--green)" />
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
      <MonthlyChart monthly={monthly} dataKey="service" title="Услуги по месеци" color="#7a5c4a" />
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
    <div className={`${styles.card} ${accent ? styles.cardAccent : ''}`}>
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

function MonthlyChart({ monthly, stacked, dataKey, title, color }: {
  monthly: MonthlyRow[]; stacked?: boolean; dataKey?: keyof MonthlyRow; title?: string; color?: string
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
                <Bar dataKey="fuel" stackId="a" fill="var(--accent)" />
                <Bar dataKey="service" stackId="a" fill="#7a5c4a" />
                <Bar dataKey="expense" stackId="a" fill="#ec5b53" radius={[5, 5, 0, 0]} />
              </>
            ) : (
              <Bar dataKey={(dataKey as string) ?? 'total'} fill={color ?? 'var(--accent)'} radius={[5, 5, 0, 0]} />
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

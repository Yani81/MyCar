import { useMemo } from 'react'
import styles from './HistoryPage.module.css'
import { useStore, useActiveVehicle } from '../../store/useStore'
import { useUI, type FormOpen, type HistoryFilter } from '../../store/useUI'
import { money, km, dateShort } from '../../lib/format'
import { FUEL_LABELS } from '../../types'
import { IconFuel, IconWrench, IconIncome, IconRoute, IconOdometer } from '../../components/Layout/icons'

const FILTERS: { value: HistoryFilter | null; label: string; color: string }[] = [
  { value: null,        label: 'Всички',  color: 'var(--brand)' },
  { value: 'refuel',   label: 'Гориво',  color: '#f5821f' },
  { value: 'expense',  label: 'Разход',  color: '#ec5b53' },
  { value: 'service',  label: 'Сервиз',  color: '#7a5c4a' },
  { value: 'income',   label: 'Приход',  color: '#3f9c35' },
  { value: 'trip',     label: 'Маршрут', color: '#5f7079' },
  { value: 'odometer', label: 'Км',      color: '#c2185b' },
]

interface Item {
  id: string
  date: string
  color: string
  Icon: typeof IconFuel
  title: string
  subtitle: string
  amount: number | null
  positive: boolean
  hasReceipt: boolean
  open: FormOpen
}

const MONTHS = ['Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни', 'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември']
const monthHeader = (key: string) => {
  const [y, m] = key.split('-')
  return `${MONTHS[Number(m) - 1]} ${y}`.toUpperCase()
}

export function HistoryPage() {
  const v = useActiveVehicle()
  const refuels = useStore((s) => s.refuels)
  const expenses = useStore((s) => s.expenses)
  const incomes = useStore((s) => s.incomes)
  const trips = useStore((s) => s.trips)
  const readings = useStore((s) => s.readings)
  const openForm = useUI((s) => s.openForm)
  const setMenu = useUI((s) => s.setMenu)
  const historyFilter = useUI((s) => s.historyFilter)
  const setHistoryFilter = useUI((s) => s.setHistoryFilter)

  const groups = useMemo(() => {
    if (!v) return []
    const multi = v.fuels.length > 1
    const items: Item[] = []

    refuels.filter((r) => r.vehicleId === v.id).forEach((r) =>
      items.push({
        id: r.id, date: r.date, color: '#f5821f', Icon: IconFuel,
        title: multi ? `Зареждане · ${FUEL_LABELS[r.fuelType]}` : 'Зареждане',
        subtitle: `${km(r.odometer)}${r.station ? ' · ' + r.station : ''}${r.notes ? ' · ' + r.notes : ''}`,
        amount: r.total, positive: false, hasReceipt: !!r.receiptImage, open: { type: 'refuel', entry: r },
      })
    )
    expenses.filter((e) => e.vehicleId === v.id).forEach((e) =>
      items.push({
        id: e.id, date: e.date, color: e.kind === 'service' ? '#7a5c4a' : '#ec5b53', Icon: IconWrench,
        title: e.title || e.category, subtitle: e.category + (e.odometer ? ' · ' + km(e.odometer) : ''),
        amount: e.cost, positive: false, hasReceipt: false, open: { type: e.kind === 'service' ? 'service' : 'expense', entry: e },
      })
    )
    incomes.filter((i) => i.vehicleId === v.id).forEach((i) =>
      items.push({
        id: i.id, date: i.date, color: '#3f9c35', Icon: IconIncome,
        title: i.category, subtitle: i.odometer ? km(i.odometer) : 'Приход',
        amount: i.amount, positive: true, hasReceipt: false, open: { type: 'income', entry: i },
      })
    )
    trips.filter((t) => t.vehicleId === v.id).forEach((t) =>
      items.push({
        id: t.id, date: t.date, color: '#5f7079', Icon: IconRoute,
        title: `${t.origin} → ${t.destination}`, subtitle: km(Math.max(0, t.endOdometer - t.startOdometer)),
        amount: t.total > 0 ? t.total : null, positive: false, hasReceipt: false, open: { type: 'trip', entry: t },
      })
    )
    readings.filter((r) => r.vehicleId === v.id).forEach((r) =>
      items.push({
        id: r.id, date: r.date, color: '#c2185b', Icon: IconOdometer,
        title: 'Показание', subtitle: km(r.odometer), amount: null, positive: false, hasReceipt: false,
        open: { type: 'odometer', entry: r },
      })
    )

    items.sort((a, b) => b.date.localeCompare(a.date))
    const visible = historyFilter ? items.filter((it) => it.open.type === historyFilter) : items
    const map = new Map<string, Item[]>()
    visible.forEach((it) => {
      const k = it.date.slice(0, 7)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(it)
    })
    return [...map.entries()]
  }, [v, refuels, expenses, incomes, trips, readings, historyFilter])

  if (!v) return null

  return (
    <div className={styles.wrap}>
      <div className={styles.filterBar}>
        {FILTERS.map((f) => {
          const active = historyFilter === f.value
          return (
            <button
              key={String(f.value)}
              className={styles.filterBtn}
              style={active ? { background: f.color, borderColor: f.color, color: '#fff' } : undefined}
              onClick={() => setHistoryFilter(f.value)}
            >
              {f.label}
            </button>
          )
        })}
      </div>
      {groups.length === 0 ? (
        <div className="empty" style={{ marginTop: 14 }}>
          Още няма записи. Натисни „+", за да добавиш зареждане, разход, приход, маршрут…
        </div>
      ) : (
        groups.map(([key, items]) => (
          <div key={key} className={styles.group}>
            <div className={styles.month}>{monthHeader(key)}</div>
            <div className={styles.timeline}>
              {items.map((it) => (
                <button key={it.id} className={styles.row} onClick={() => openForm(it.open)}>
                  <span className={styles.dot} style={{ borderColor: it.color }}>
                    <it.Icon width={17} height={17} color={it.color} />
                  </span>
                  <div className={styles.info}>
                    <span className={styles.title}>{it.title}</span>
                    <span className={styles.sub}>{it.subtitle} · {dateShort(it.date)}</span>
                  </div>
                  {it.amount !== null && (
                    <span className={`${styles.amount} mono`} style={it.positive ? { color: 'var(--green)' } : undefined}>
                      {it.positive ? '+' : ''}{money(it.amount)}
                    </span>
                  )}
                  {it.hasReceipt && (
                    <span className={styles.receiptIcon} title="Има прикачена бележка">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="9" y1="15" x2="15" y2="15"/>
                        <line x1="9" y1="11" x2="15" y2="11"/>
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      <button className="fab" onClick={() => setMenu(true)} aria-label="Добави запис">+</button>
    </div>
  )
}

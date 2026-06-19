import { useMemo } from 'react'
import styles from './HistoryPage.module.css'
import { useStore, useActiveVehicle } from '../../store/useStore'
import { useUI, type FormOpen } from '../../store/useUI'
import { money, km, dateShort } from '../../lib/format'
import { FUEL_LABELS } from '../../types'
import { IconFuel, IconWrench, IconIncome, IconRoute, IconOdometer } from '../../components/Layout/icons'

interface Item {
  id: string
  date: string
  color: string
  Icon: typeof IconFuel
  title: string
  subtitle: string
  amount: number | null
  positive: boolean
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

  const groups = useMemo(() => {
    if (!v) return []
    const multi = v.fuels.length > 1
    const items: Item[] = []

    refuels.filter((r) => r.vehicleId === v.id).forEach((r) =>
      items.push({
        id: r.id, date: r.date, color: '#f5821f', Icon: IconFuel,
        title: multi ? `Зареждане · ${FUEL_LABELS[r.fuelType]}` : 'Зареждане',
        subtitle: `${km(r.odometer)}${r.station ? ' · ' + r.station : ''}`,
        amount: r.total, positive: false, open: { type: 'refuel', entry: r },
      })
    )
    expenses.filter((e) => e.vehicleId === v.id).forEach((e) =>
      items.push({
        id: e.id, date: e.date, color: e.kind === 'service' ? '#7a5c4a' : '#ec5b53', Icon: IconWrench,
        title: e.title || e.category, subtitle: e.category + (e.odometer ? ' · ' + km(e.odometer) : ''),
        amount: e.cost, positive: false, open: { type: e.kind === 'service' ? 'service' : 'expense', entry: e },
      })
    )
    incomes.filter((i) => i.vehicleId === v.id).forEach((i) =>
      items.push({
        id: i.id, date: i.date, color: '#3f9c35', Icon: IconIncome,
        title: i.category, subtitle: i.odometer ? km(i.odometer) : 'Приход',
        amount: i.amount, positive: true, open: { type: 'income', entry: i },
      })
    )
    trips.filter((t) => t.vehicleId === v.id).forEach((t) =>
      items.push({
        id: t.id, date: t.date, color: '#5f7079', Icon: IconRoute,
        title: `${t.origin} → ${t.destination}`, subtitle: km(Math.max(0, t.endOdometer - t.startOdometer)),
        amount: t.total > 0 ? t.total : null, positive: false, open: { type: 'trip', entry: t },
      })
    )
    readings.filter((r) => r.vehicleId === v.id).forEach((r) =>
      items.push({
        id: r.id, date: r.date, color: '#c2185b', Icon: IconOdometer,
        title: 'Показание', subtitle: km(r.odometer), amount: null, positive: false,
        open: { type: 'odometer', entry: r },
      })
    )

    items.sort((a, b) => b.date.localeCompare(a.date))
    const map = new Map<string, Item[]>()
    items.forEach((it) => {
      const k = it.date.slice(0, 7)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(it)
    })
    return [...map.entries()]
  }, [v, refuels, expenses, incomes, trips, readings])

  if (!v) return null

  return (
    <div className={styles.wrap}>
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

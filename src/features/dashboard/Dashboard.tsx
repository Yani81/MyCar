import { useMemo, useState } from 'react'
import styles from './Dashboard.module.css'
import { useStore, useActiveVehicle } from '../../store/useStore'
import { useUI, type FormOpen } from '../../store/useUI'
import { computeStats, reminderInfo, type AllData } from '../../lib/calculations'
import { money, km, num, dateShort } from '../../lib/format'
import type { Tab } from '../../components/Layout/BottomNav'
import { FUEL_LABELS } from '../../types'
import { IconFuel, IconWrench, IconIncome, IconRoute, IconBell } from '../../components/Layout/icons'
import { supabase } from '../../lib/supabase'

type GoResult = { valid: boolean; message: string } | null

export function Dashboard({ go }: { go: (t: Tab) => void }) {
  const v = useActiveVehicle()
  const refuels = useStore((s) => s.refuels)
  const expenses = useStore((s) => s.expenses)
  const incomes = useStore((s) => s.incomes)
  const trips = useStore((s) => s.trips)
  const readings = useStore((s) => s.readings)
  const reminders = useStore((s) => s.reminders)
  const openForm = useUI((s) => s.openForm)

  const d = useMemo(() => {
    if (!v) return null
    const data: AllData = {
      refuels: refuels.filter((r) => r.vehicleId === v.id),
      expenses: expenses.filter((e) => e.vehicleId === v.id),
      incomes: incomes.filter((i) => i.vehicleId === v.id),
      trips: trips.filter((t) => t.vehicleId === v.id),
      readings: readings.filter((r) => r.vehicleId === v.id),
    }
    const stats = computeStats(v, data)

    const sortedFuelRefuels = [...data.refuels].sort((a, b) => b.odometer - a.odometer)
    const lastRefuel = sortedFuelRefuels[0] ?? null
    const prevRefuelOdo = sortedFuelRefuels[1]?.odometer ?? null
    const lastKm = lastRefuel && prevRefuelOdo !== null ? lastRefuel.odometer - prevRefuelOdo : null

    const nextRem = reminders
      .filter((r) => r.vehicleId === v.id && !r.done)
      .map((r) => ({ r, info: reminderInfo(r, stats.currentOdometer) }))
      .sort((a, b) => ({ overdue: 0, soon: 1, ok: 2 }[a.info.status] - { overdue: 0, soon: 1, ok: 2 }[b.info.status]))[0]

    const recent = [
      ...data.refuels.map((r) => ({ id: r.id, Icon: IconFuel, cls: 'fuel', date: r.date, odo: r.odometer, label: `${num(r.liters, 2)} л · ${num(r.pricePerLiter, 2)} €/л`, sub: `${FUEL_LABELS[r.fuelType]}${r.station ? ` · ${r.station}` : ''}`, amount: r.total, pos: false, open: { type: 'refuel', entry: r } as FormOpen })),
      ...data.expenses.map((e) => ({ id: e.id, Icon: IconWrench, cls: e.kind === 'service' ? 'service' : 'exp', date: e.date, odo: e.odometer ?? 0, label: e.title || e.category, sub: e.place || '', amount: e.cost, pos: false, open: { type: e.kind === 'service' ? 'service' : 'expense', entry: e } as FormOpen })),
      ...data.incomes.map((i) => ({ id: i.id, Icon: IconIncome, cls: 'income', date: i.date, odo: 0, label: i.category, sub: i.notes || '', amount: i.amount, pos: true, open: { type: 'income', entry: i } as FormOpen })),
      ...data.trips.map((t) => ({ id: t.id, Icon: IconRoute, cls: 'trip', date: t.date, odo: t.endOdometer, label: `${t.origin} → ${t.destination}`, sub: km(t.endOdometer - t.startOdometer), amount: t.total, pos: false, open: { type: 'trip', entry: t } as FormOpen })),
    ]
      .sort((a, b) => b.date.localeCompare(a.date) || b.odo - a.odo)
      .slice(0, 6)

    return { stats, nextRem, recent, lastRefuel, lastKm }
  }, [v, refuels, expenses, incomes, trips, readings, reminders])

  const [goResult, setGoResult] = useState<GoResult>(null)
  const [goLoading, setGoLoading] = useState(false)

  const checkGO = async () => {
    setGoLoading(true)
    setGoResult(null)
    try {
      const { data, error } = await supabase.functions.invoke('check-go', {
        body: { plate: v?.plate ?? '' },
      })
      if (error) throw error
      setGoResult(data as GoResult)
    } catch {
      setGoResult({ valid: false, message: 'Грешка при проверката. Опитай отново.' })
    } finally {
      setGoLoading(false)
    }
  }

  if (!v || !d) return null
  const { stats, nextRem, recent } = d

  return (
    <div className={styles.wrap}>
      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <span>Среден разход{v.fuels.length > 1 ? ` · ${FUEL_LABELS[v.fuels[0]]}+` : ''}</span>
          <span className={styles.odo}>{km(stats.currentOdometer)}</span>
        </div>
        <div className={styles.bigValue}>
          <span className="mono">{stats.avgConsumption !== null ? num(stats.avgConsumption, 2) : '—'}</span>
          <small>л/100км</small>
        </div>
        <div className={styles.heroSub}>
          {stats.lastConsumption !== null ? `Последно: ${num(stats.lastConsumption, 2)} л/100км` : 'Добави 2 пълни зареждания за разход'}
        </div>
      </div>

      <div className={styles.grid}>
        <Stat label="Баланс" value={money(stats.balance)} />
        <Stat label="Цена / км" value={stats.costPerKm !== null ? money(stats.costPerKm) : '—'} />
        <Stat label="За гориво" value={money(stats.totalFuelCost)} />
        <Stat label="Приход" value={money(stats.totalIncome)} />
      </div>


      <div className={styles.total}>
        <span>Общо разходи</span>
        <span className="mono">{money(stats.totalCost)}</span>
      </div>

      {nextRem && (
        <button className={`${styles.reminder} ${styles[nextRem.info.status]}`} onClick={() => go('reminders')}>
          <IconBell width={20} height={20} />
          <div className={styles.remText}>
            <span className={styles.remTitle}>{nextRem.r.title}</span>
            <span className={styles.remSub}>{nextRem.info.label}</span>
          </div>
        </button>
      )}

      <div className={`${styles.goCard} ${goResult ? (goResult.valid ? styles.goValid : styles.goInvalid) : ''}`}>
        <div className={styles.goInfo}>
          <span className={styles.goTitle}>Гражданска отговорност</span>
          <span className={styles.goSub}>
            {goLoading
              ? 'Проверява...'
              : goResult
                ? goResult.message.slice(0, 100)
                : v.plate || 'Провери застраховката'}
          </span>
        </div>
        <button className={styles.goBtn} onClick={checkGO} disabled={goLoading}>
          {goLoading ? '…' : 'Провери'}
        </button>
      </div>

      <div className="section-title">Последна активност</div>
      {recent.length === 0 ? (
        <div className="empty">Още няма записи. Добави първото си зареждане през „+".</div>
      ) : (
        <div className={styles.activity}>
          {recent.map((item) => (
            <button key={item.id} className={styles.actRow} onClick={() => openForm(item.open)}>
              <span className={`${styles.actIcon} ${styles[item.cls]}`}><item.Icon width={18} height={18} /></span>
              <div className={styles.actInfo}>
                <span className={styles.actLabel}>{item.label}</span>
                <span className={styles.actDate}>
                  {item.sub ? `${item.sub} · ${dateShort(item.date)}` : dateShort(item.date)}
                </span>
              </div>
              <span className="mono" style={item.pos ? { color: 'var(--green)' } : undefined}>{item.pos ? '+' : ''}{money(item.amount)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`${styles.stat} ${accent ? styles.statAccent : ''}`}>
      <span className={styles.statLabel}>{label}</span>
      <span className={`${styles.statValue} mono`}>{value}</span>
    </div>
  )
}

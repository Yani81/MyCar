import { useMemo, useState, useRef, type ReactNode } from 'react'
import styles from './RemindersPage.module.css'
import { useStore, useActiveVehicle } from '../../store/useStore'
import { advanceReminderPatch, computeStats, reminderInfo, type ReminderStatus, type AllData } from '../../lib/calculations'
import { useUI } from '../../store/useUI'
import type { Reminder } from '../../types'

const STATUS_LABEL: Record<ReminderStatus, string> = {
  overdue: 'Просрочено',
  soon: 'Наближава',
  ok: 'Активно',
}

const SWIPE_THRESHOLD = -72

function SwipeRow({ children, onDelete }: { children: ReactNode; onDelete: () => void }) {
  const [dx, setDx] = useState(0)
  const [snapping, setSnapping] = useState(false)
  const startX = useRef(0)
  const active = useRef(false)

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-sm)' }}>
      <div className={styles.deleteHint}>Изтрий</div>
      <div
        style={{ transform: `translateX(${dx}px)`, transition: snapping ? 'transform 0.22s ease' : 'none' }}
        onTouchStart={(e) => {
          startX.current = e.touches[0].clientX
          active.current = true
          setSnapping(false)
        }}
        onTouchMove={(e) => {
          if (!active.current) return
          const d = e.touches[0].clientX - startX.current
          if (d < 0) setDx(d)
        }}
        onTouchEnd={() => {
          active.current = false
          if (dx < SWIPE_THRESHOLD) {
            onDelete()
          } else {
            setSnapping(true)
            setDx(0)
          }
        }}
      >
        {children}
      </div>
    </div>
  )
}

export function RemindersPage() {
  const v = useActiveVehicle()
  const all = useStore((s) => s.reminders)
  const refuels = useStore((s) => s.refuels)
  const expenses = useStore((s) => s.expenses)
  const incomes = useStore((s) => s.incomes)
  const trips = useStore((s) => s.trips)
  const readings = useStore((s) => s.readings)
  const updateReminder = useStore((s) => s.updateReminder)
  const removeReminder = useStore((s) => s.removeReminder)
  const openForm = useUI((s) => s.openForm)

  const currentOdometer = useMemo(() => {
    if (!v) return 0
    const data: AllData = {
      refuels: refuels.filter((r) => r.vehicleId === v.id),
      expenses: expenses.filter((e) => e.vehicleId === v.id),
      incomes: incomes.filter((i) => i.vehicleId === v.id),
      trips: trips.filter((t) => t.vehicleId === v.id),
      readings: readings.filter((r) => r.vehicleId === v.id),
    }
    return computeStats(v, data).currentOdometer
  }, [v, refuels, expenses, incomes, trips, readings])

  const { active, done } = useMemo(() => {
    if (!v) return { active: [], done: [] }
    const mine = all.filter((r) => r.vehicleId === v.id)
    const withInfo = mine.map((r) => ({ r, info: reminderInfo(r, currentOdometer) }))
    const order = { overdue: 0, soon: 1, ok: 2 }
    return {
      active: withInfo.filter((x) => !x.r.done).sort((a, b) => order[a.info.status] - order[b.info.status]),
      done: withInfo.filter((x) => x.r.done),
    }
  }, [v, all, currentOdometer])

  if (!v) return null

  const complete = (r: Reminder) => {
    updateReminder(r.id, advanceReminderPatch(r, currentOdometer))
  }

  return (
    <div className={styles.wrap}>
      <div className="section-title">Предстоящи</div>
      {active.length === 0 ? (
        <div className="empty">Няма активни напомняния. Добави сервиз, застраховка, винетка…</div>
      ) : (
        <div className={styles.list}>
          {active.map(({ r, info }) => (
            <SwipeRow key={r.id} onDelete={() => removeReminder(r.id)}>
              <div className={`${styles.item} ${styles[info.status]}`}>
                <button className={styles.body} onClick={() => openForm({ type: 'reminder', entry: r })}>
                  <span className={styles.badge}>{STATUS_LABEL[info.status]}</span>
                  <span className={styles.title}>{r.title}</span>
                  <span className={styles.sub}>{info.label}</span>
                </button>
                <button className={styles.check} onClick={() => complete(r)} aria-label="Готово">✓</button>
              </div>
            </SwipeRow>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <>
          <div className="section-title">Изпълнени</div>
          <div className={styles.list}>
            {done.map(({ r }) => (
              <SwipeRow key={r.id} onDelete={() => removeReminder(r.id)}>
                <div className={styles.doneItem}>
                  <span className={styles.title}>{r.title}</span>
                  <button className={styles.undo} onClick={() => updateReminder(r.id, { done: false })}>върни</button>
                </div>
              </SwipeRow>
            ))}
          </div>
        </>
      )}

    </div>
  )
}

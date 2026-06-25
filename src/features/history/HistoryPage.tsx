import { useEffect, useMemo, useRef, useState } from 'react'
import styles from './HistoryPage.module.css'
import { useStore, useActiveVehicle } from '../../store/useStore'
import { useUI, type FormOpen, type HistoryFilter } from '../../store/useUI'
import { money, km, dateShort } from '../../lib/format'
import { FUEL_LABELS, type Refuel, type Expense, type Income, type Trip, type OdometerReading } from '../../types'
import { IconWrench, IconIncome, IconRoute, IconOdometer } from '../../components/Layout/icons'
import { ImageLightbox } from '../../components/ui/ImageLightbox'
import { computeConsumption, sortRefuels } from '../../lib/calculations'

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
  amount: number | null
  positive: boolean
  open: FormOpen
  title: string
  receiptImage?: string
  entry: Refuel | Expense | Income | Trip | OdometerReading
  consumption?: number
  distanceFromPrev?: number
}

const MONTHS = ['Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни', 'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември']
const monthHeader = (key: string) => {
  const [y, m] = key.split('-')
  return `${MONTHS[Number(m) - 1]} ${y}`.toUpperCase()
}

const fmt2 = (n: number) =>
  n.toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const DELETE_W = 80

function TrashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  )
}

function SwipeCard({
  isOpen,
  onOpen,
  onClose,
  onDelete,
  children,
}: {
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onDelete: () => void
  children: React.ReactNode
}) {
  const innerRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const dirRef = useRef<'none' | 'h' | 'v'>('none')
  const isDraggingMouse = useRef(false)
  const suppressNextClick = useRef(false)

  useEffect(() => {
    if (!innerRef.current) return
    innerRef.current.style.transition = 'transform 0.25s ease'
    innerRef.current.style.transform = isOpen ? `translateX(-${DELETE_W}px)` : ''
  }, [isOpen])

  const snapTo = (x: number, animated: boolean) => {
    if (!innerRef.current) return
    innerRef.current.style.transition = animated ? 'transform 0.25s ease' : 'none'
    innerRef.current.style.transform = x !== 0 ? `translateX(${x}px)` : ''
  }

  const applyDrag = (base: number, dx: number) => {
    const raw = base + dx
    const clamped = Math.max(-DELETE_W - 10, Math.min(8, raw))
    if (innerRef.current) {
      innerRef.current.style.transition = 'none'
      innerRef.current.style.transform = `translateX(${clamped}px)`
    }
  }

  const handleEnd = (dx: number) => {
    if (dirRef.current !== 'h') return
    if (!isOpen && dx < -40) onOpen()
    else if (isOpen && dx > 20) onClose()
    else snapTo(isOpen ? -DELETE_W : 0, true)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    dirRef.current = 'none'
  }

  const onTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current
    if (dirRef.current === 'none') {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      dirRef.current = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v'
    }
    if (dirRef.current !== 'h') return
    applyDrag(isOpen ? -DELETE_W : 0, dx)
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    handleEnd(e.changedTouches[0].clientX - startX.current)
  }

  const onMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX
    startY.current = e.clientY
    dirRef.current = 'none'
    isDraggingMouse.current = true
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingMouse.current) return
    const dx = e.clientX - startX.current
    const dy = e.clientY - startY.current
    if (dirRef.current === 'none') {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      dirRef.current = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v'
    }
    if (dirRef.current !== 'h') return
    applyDrag(isOpen ? -DELETE_W : 0, dx)
  }

  const onMouseUp = (e: React.MouseEvent) => {
    if (!isDraggingMouse.current) return
    isDraggingMouse.current = false
    const dx = e.clientX - startX.current
    if (dirRef.current === 'h' && Math.abs(dx) > 8) suppressNextClick.current = true
    handleEnd(dx)
  }

  const onMouseLeave = () => {
    if (!isDraggingMouse.current) return
    isDraggingMouse.current = false
    snapTo(isOpen ? -DELETE_W : 0, true)
  }

  const onClickCapture = (e: React.MouseEvent) => {
    if (suppressNextClick.current) {
      e.stopPropagation()
      suppressNextClick.current = false
    }
  }

  return (
    <div className={styles.swipeOuter}>
      <button className={styles.swipeDelete} onClick={onDelete} aria-label="Изтрий">
        <TrashIcon />
      </button>
      <div
        ref={innerRef}
        className={styles.swipeInner}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    </div>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {open
        ? <polyline points="18 15 12 9 6 15" />
        : <polyline points="6 9 12 15 18 9" />
      }
    </svg>
  )
}

function DetailRow({ label, value, badge }: { label: string; value?: string; badge?: string }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      {badge !== undefined
        ? <span className={styles.detailBadge}>{badge}</span>
        : <span className={styles.detailValue}>{value}</span>
      }
    </div>
  )
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
  const [lightboxImg, setLightboxImg] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [swipeOpenId, setSwipeOpenId] = useState<string | null>(null)

  const removeRefuel = useStore(s => s.removeRefuel)
  const removeExpense = useStore(s => s.removeExpense)
  const removeIncome = useStore(s => s.removeIncome)
  const removeTrip = useStore(s => s.removeTrip)
  const removeReading = useStore(s => s.removeReading)

  const handleDelete = (it: Item) => {
    const { type } = it.open
    if (type === 'refuel') removeRefuel(it.id)
    else if (type === 'expense' || type === 'service') removeExpense(it.id)
    else if (type === 'income') removeIncome(it.id)
    else if (type === 'trip') removeTrip(it.id)
    else if (type === 'odometer') removeReading(it.id)
    setSwipeOpenId(null)
    setExpanded(prev => { const next = new Set(prev); next.delete(it.id); return next })
  }

  const toggle = (id: string) => {
    if (swipeOpenId !== null) {
      setSwipeOpenId(null)
      return
    }
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const groups = useMemo(() => {
    if (!v) return []
    const multi = v.fuels.length > 1
    const items: Item[] = []

    const vehicleRefuels = refuels.filter(r => r.vehicleId === v.id)

    const consMap = new Map<string, number>()
    const distMap = new Map<string, number>()
    const fuelTypes = [...new Set(vehicleRefuels.map(r => r.fuelType))]
    for (const fuel of fuelTypes) {
      const fuelRefuels = vehicleRefuels.filter(r => r.fuelType === fuel)
      computeConsumption(fuelRefuels).forEach(p => consMap.set(p.refuelId, p.consumption))
      const fuelSorted = sortRefuels(fuelRefuels)
      for (let i = 1; i < fuelSorted.length; i++) {
        distMap.set(fuelSorted[i].id, fuelSorted[i].odometer - fuelSorted[i - 1].odometer)
      }
    }

    vehicleRefuels.forEach(r => items.push({
      id: r.id, date: r.date, color: '#f5821f',
      title: multi ? FUEL_LABELS[r.fuelType] : 'Зареждане',
      amount: r.total, positive: false,
      receiptImage: r.receiptImage,
      open: { type: 'refuel', entry: r },
      entry: r,
      consumption: consMap.get(r.id),
      distanceFromPrev: distMap.get(r.id),
    }))

    expenses.filter(e => e.vehicleId === v.id).forEach(e => items.push({
      id: e.id, date: e.date, color: e.kind === 'service' ? '#7a5c4a' : '#ec5b53',
      title: e.title || e.category,
      amount: e.cost, positive: false,
      open: { type: e.kind === 'service' ? 'service' : 'expense', entry: e },
      entry: e,
    }))

    incomes.filter(i => i.vehicleId === v.id).forEach(i => items.push({
      id: i.id, date: i.date, color: '#3f9c35',
      title: i.category,
      amount: i.amount, positive: true,
      open: { type: 'income', entry: i },
      entry: i,
    }))

    trips.filter(t => t.vehicleId === v.id).forEach(t => items.push({
      id: t.id, date: t.date, color: '#5f7079',
      title: `${t.origin} → ${t.destination}`,
      amount: t.total > 0 ? t.total : null, positive: false,
      open: { type: 'trip', entry: t },
      entry: t,
    }))

    readings.filter(r => r.vehicleId === v.id).forEach(r => items.push({
      id: r.id, date: r.date, color: '#c2185b',
      title: 'Показание',
      amount: null, positive: false,
      open: { type: 'odometer', entry: r },
      entry: r,
    }))

    items.sort((a, b) => b.date.localeCompare(a.date))
    const visible = historyFilter ? items.filter(it => it.open.type === historyFilter) : items
    const map = new Map<string, Item[]>()
    visible.forEach(it => {
      const k = it.date.slice(0, 7)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(it)
    })
    return [...map.entries()]
  }, [v, refuels, expenses, incomes, trips, readings, historyFilter])

  if (!v) return null

  const renderExpanded = (it: Item) => {
    const type = it.open.type

    if (type === 'refuel') {
      const r = it.entry as Refuel
      return (
        <div className={styles.details}>
          <DetailRow label="Пробег" value={km(r.odometer)} />
          {it.distanceFromPrev != null && it.distanceFromPrev > 0 && (
            <DetailRow label="Разстояние" value={`${km(it.distanceFromPrev)} от предишно зареждане`} />
          )}
          <DetailRow label="Вид" badge={r.fullTank ? 'Пълен резервоар' : 'Частично'} />
          <DetailRow label="Гориво" value={FUEL_LABELS[r.fuelType]} />
          {r.station && <DetailRow label="Бензиностанция" value={r.station} />}
          {r.driver && <DetailRow label="Шофьор" value={r.driver} />}
          {r.notes && <DetailRow label="Бележка" value={r.notes} />}
          {it.receiptImage && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Касова бележка</span>
              <button className={styles.receiptLink} onClick={() => setLightboxImg(it.receiptImage!)}>
                Виж снимка
              </button>
            </div>
          )}
          <button className={styles.editBtn} onClick={() => openForm(it.open)}>Редактирай</button>
        </div>
      )
    }

    if (type === 'expense' || type === 'service') {
      const e = it.entry as Expense
      return (
        <div className={styles.details}>
          <DetailRow label="Категория" value={e.category} />
          {e.odometer != null && e.odometer > 0 && <DetailRow label="Километраж" value={km(e.odometer)} />}
          {e.place && <DetailRow label="Място" value={e.place} />}
          {e.driver && <DetailRow label="Шофьор" value={e.driver} />}
          {e.notes && <DetailRow label="Бележка" value={e.notes} />}
          <button className={styles.editBtn} onClick={() => openForm(it.open)}>Редактирай</button>
        </div>
      )
    }

    if (type === 'income') {
      const i = it.entry as Income
      return (
        <div className={styles.details}>
          {i.odometer != null && i.odometer > 0 && <DetailRow label="Километраж" value={km(i.odometer)} />}
          {i.driver && <DetailRow label="Шофьор" value={i.driver} />}
          {i.notes && <DetailRow label="Бележка" value={i.notes} />}
          <button className={styles.editBtn} onClick={() => openForm(it.open)}>Редактирай</button>
        </div>
      )
    }

    if (type === 'trip') {
      const t = it.entry as Trip
      const dist = Math.max(0, t.endOdometer - t.startOdometer)
      return (
        <div className={styles.details}>
          <DetailRow label="Начало" value={km(t.startOdometer)} />
          <DetailRow label="Край" value={km(t.endOdometer)} />
          <DetailRow label="Разстояние" value={km(dist)} />
          {t.reason && <DetailRow label="Причина" value={t.reason} />}
          {t.driver && <DetailRow label="Шофьор" value={t.driver} />}
          {t.notes && <DetailRow label="Бележка" value={t.notes} />}
          <button className={styles.editBtn} onClick={() => openForm(it.open)}>Редактирай</button>
        </div>
      )
    }

    if (type === 'odometer') {
      const r = it.entry as OdometerReading
      return (
        <div className={styles.details}>
          <DetailRow label="Показание" value={km(r.odometer)} />
          {r.driver && <DetailRow label="Шофьор" value={r.driver} />}
          {r.notes && <DetailRow label="Бележка" value={r.notes} />}
          <button className={styles.editBtn} onClick={() => openForm(it.open)}>Редактирай</button>
        </div>
      )
    }

    return null
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.filterBar}>
        {FILTERS.map(f => {
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
              {items.map(it => {
                const isExp = expanded.has(it.id)

                if (it.open.type === 'refuel') {
                  const r = it.entry as Refuel
                  return (
                    <SwipeCard
                      key={it.id}
                      isOpen={swipeOpenId === it.id}
                      onOpen={() => setSwipeOpenId(it.id)}
                      onClose={() => setSwipeOpenId(null)}
                      onDelete={() => handleDelete(it)}
                    >
                      <div className={styles.card}>
                        <div
                          className={styles.cardHead}
                          role="button"
                          tabIndex={0}
                          onClick={() => toggle(it.id)}
                          onKeyDown={e => e.key === 'Enter' && toggle(it.id)}
                        >
                          <div className={styles.refuelTitle}>
                            {fmt2(r.liters)} литра
                          </div>
                          <div className={styles.cardMeta}>
                            <span className={styles.chip}>{money(r.total)}</span>
                            <span className={styles.chip}>{fmt2(r.pricePerLiter)} € / л</span>
                            <span className={styles.metaDate}>{dateShort(it.date)}</span>
                            <span className={styles.chevron}><ChevronIcon open={isExp} /></span>
                          </div>
                          {it.consumption != null && it.consumption > 0 && (
                            <div className={styles.pill}>
                              {fmt2(it.consumption)} л / 100 км от предишно пълно зареждане
                            </div>
                          )}
                        </div>
                        {isExp && (
                          <>
                            <div className={styles.divider} />
                            {renderExpanded(it)}
                          </>
                        )}
                      </div>
                    </SwipeCard>
                  )
                }

                const Icon = it.open.type === 'expense' || it.open.type === 'service'
                  ? IconWrench
                  : it.open.type === 'income'
                  ? IconIncome
                  : it.open.type === 'trip'
                  ? IconRoute
                  : IconOdometer

                return (
                  <SwipeCard
                    key={it.id}
                    isOpen={swipeOpenId === it.id}
                    onOpen={() => setSwipeOpenId(it.id)}
                    onClose={() => setSwipeOpenId(null)}
                    onDelete={() => handleDelete(it)}
                  >
                    <div className={styles.card}>
                      <div
                        className={styles.cardHead}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggle(it.id)}
                        onKeyDown={e => e.key === 'Enter' && toggle(it.id)}
                      >
                        <div className={styles.genericRow}>
                          <span className={styles.dot} style={{ borderColor: it.color }}>
                            <Icon width={17} height={17} color={it.color} />
                          </span>
                          <span className={styles.genericTitle}>{it.title}</span>
                          {it.amount !== null && (
                            <span
                              className={`${styles.amount} mono`}
                              style={it.positive ? { color: 'var(--green)' } : undefined}
                            >
                              {it.positive ? '+' : ''}{money(it.amount)}
                            </span>
                          )}
                          <span className={styles.chevron}><ChevronIcon open={isExp} /></span>
                        </div>
                        <div className={styles.genericDate}>{dateShort(it.date)}</div>
                      </div>
                      {isExp && (
                        <>
                          <div className={styles.divider} />
                          {renderExpanded(it)}
                        </>
                      )}
                    </div>
                  </SwipeCard>
                )
              })}
            </div>
          </div>
        ))
      )}

      <button className="fab" onClick={() => setMenu(true)} aria-label="Добави запис">+</button>
      {lightboxImg && <ImageLightbox src={lightboxImg} onClose={() => setLightboxImg(null)} />}
    </div>
  )
}

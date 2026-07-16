import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Field, Row, inputClass, Toggle } from '../../components/ui/Field'
import { FormFooter } from '../../components/ui/FormFooter'
import { useStore, useActiveVehicle } from '../../store/useStore'
import { todayISO, todayTimeISO, km, money, num, toNumStr } from '../../lib/format'
import { computeStats } from '../../lib/calculations'
import { currentCity } from '../../lib/geo'
import { IconPin } from '../../components/Layout/icons'
import { ENTRY_COLORS, type Trip } from '../../types'
import styles from './TripForm.module.css'

export function TripForm({ vehicleId, edit, onClose }: { vehicleId: string; edit: Trip | null; onClose: () => void }) {
  const addTrip = useStore((s) => s.addTrip)
  const updateTrip = useStore((s) => s.updateTrip)
  const removeTrip = useStore((s) => s.removeTrip)
  const v = useActiveVehicle()
  const refuels  = useStore((s) => s.refuels.filter((r) => r.vehicleId === vehicleId))
  const expenses = useStore((s) => s.expenses.filter((e) => e.vehicleId === vehicleId))
  const incomes  = useStore((s) => s.incomes.filter((i) => i.vehicleId === vehicleId))
  const allTrips = useStore((s) => s.trips.filter((t) => t.vehicleId === vehicleId))
  const readings = useStore((s) => s.readings.filter((r) => r.vehicleId === vehicleId))

  const stats = v ? computeStats(v, { refuels, expenses, incomes, trips: allTrips, readings }) : null

  const [origin, setOrigin] = useState(edit?.origin ?? '')
  const [destination, setDestination] = useState(edit?.destination ?? '')
  const [date, setDate] = useState((edit?.date ?? todayISO()).slice(0, 10))
  const [time, setTime] = useState(edit?.date && edit.date.length > 10 ? edit.date.slice(11, 16) : todayTimeISO())
  const [startOdometer, setStart] = useState(edit ? String(edit.startOdometer) : '')
  const [endOdometer, setEnd] = useState(edit?.endOdometer != null ? String(edit.endOdometer) : '')
  const [costPerKm, setCostPerKm] = useState(
    edit?.costPerKm
      ? String(edit.costPerKm)
      : stats?.fuelCostPerKm != null
        ? stats.fuelCostPerKm.toFixed(3)
        : ''
  )
  const [reason, setReason] = useState(edit?.reason ?? '')
  const [notes, setNotes] = useState(edit?.notes ?? '')
  const [roundTrip, setRoundTrip] = useState(edit?.roundTrip ?? false)

  const [locating, setLocating] = useState<'origin' | 'destination' | null>(null)

  const fillFromLocation = (target: 'origin' | 'destination') => {
    setLocating(target)
    currentCity().then((city) => {
      if (city) (target === 'origin' ? setOrigin : setDestination)(city)
      setLocating(null)
    })
  }

  const distance = Math.max(0, Number(endOdometer) - Number(startOdometer))
  const total = distance * (Number(costPerKm) || 0)
  // Дестинация и краен км са двойка: и двете празни = маршрут „в движение", иначе и двете попълнени
  const finishing = destination.trim() !== '' || endOdometer !== ''
  const valid = origin.trim() !== '' && Number(startOdometer) > 0 &&
    (!finishing || (destination.trim() !== '' && distance > 0))

  const submit = () => {
    if (!valid) return
    const payload = {
      vehicleId,
      origin: origin.trim(),
      destination: destination.trim() || undefined,
      date: date + (time ? 'T' + time : ''),
      startOdometer: Number(startOdometer),
      endOdometer: endOdometer !== '' ? Number(endOdometer) : undefined,
      roundTrip: roundTrip || undefined,
      costPerKm: Number(costPerKm) || undefined,
      total,
      reason: reason.trim() || undefined,
      notes: notes.trim() || undefined,
    }
    if (edit) updateTrip(edit.id, payload)
    else addTrip(payload)
    onClose()
  }

  return (
    <Modal
      open
      title={edit ? (edit.endOdometer == null ? 'Пристигане' : 'Редакция на маршрут') : 'Нов маршрут'}
      color={ENTRY_COLORS.trip}
      onClose={onClose}
      footer={<FormFooter valid={valid} edit={!!edit} onSubmit={submit} onDelete={edit ? () => { removeTrip(edit.id); onClose() } : undefined} deleteMsg="Изтриване на маршрута?" color={ENTRY_COLORS.trip} />}
    >
      <Field label="Начална точка">
        <div className={styles.locWrap}>
          <input className={inputClass} value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="напр. Бургас" />
          <button type="button" className={styles.locBtn} title="Попълни от локацията" disabled={locating !== null} onClick={() => fillFromLocation('origin')}>
            {locating === 'origin' ? <span className={styles.locSpin} /> : <IconPin width={18} height={18} />}
          </button>
        </div>
      </Field>
      <Field label="Крайна точка (или допълни при пристигане)">
        <div className={styles.locWrap}>
          <input className={inputClass} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="напр. София" />
          <button type="button" className={styles.locBtn} title="Попълни от локацията" disabled={locating !== null} onClick={() => fillFromLocation('destination')}>
            {locating === 'destination' ? <span className={styles.locSpin} /> : <IconPin width={18} height={18} />}
          </button>
        </div>
      </Field>
      <Toggle checked={roundTrip} onChange={setRoundTrip} label="Отиване и връщане (обратно до началната точка)" />
      <Row>
        <Field label="Дата">
          <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Час">
          <input className={inputClass} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label="Начален км">
          <input className={inputClass} inputMode="numeric" value={startOdometer} onChange={(e) => setStart(e.target.value)} placeholder="0" />
        </Field>
        <Field label={roundTrip ? 'Краен км (след връщането)' : 'Краен км'}>
          <input className={inputClass} inputMode="numeric" value={endOdometer} onChange={(e) => setEnd(e.target.value)} placeholder="0" />
        </Field>
      </Row>
      {roundTrip && distance > 0 && (
        <div style={{ display: 'flex', marginTop: -4 }}>
          <button
            type="button"
            className={styles.chip}
            onClick={() => setEnd(String(Number(startOdometer) + 2 * distance))}
          >
            ×2 — въведох само отиването ({km(distance)} → {km(2 * distance)})
          </button>
        </div>
      )}
      <Row>
        <Field label="Стойност / км (по избор)">
          <input className={inputClass} inputMode="decimal" value={costPerKm} onChange={(e) => setCostPerKm(toNumStr(e.target.value))} placeholder="0.000" />
        </Field>
        <Field label="Разстояние">
          <input className={inputClass} value={distance > 0 ? km(distance) : '—'} readOnly />
        </Field>
      </Row>
      {(stats?.fuelCostPerKm != null || stats?.costPerKm != null) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: -4 }}>
          {stats?.fuelCostPerKm != null && (
            <button type="button" className={styles.chip} onClick={() => setCostPerKm(stats.fuelCostPerKm!.toFixed(3))}>
              Гориво: {num(stats.fuelCostPerKm, 3)} €/км
            </button>
          )}
          {stats?.costPerKm != null && (
            <button type="button" className={styles.chip} onClick={() => setCostPerKm(stats.costPerKm!.toFixed(3))}>
              Всичко: {num(stats.costPerKm, 3)} €/км
            </button>
          )}
        </div>
      )}
      {total > 0 && <div style={{ fontSize: 13, color: 'var(--muted)' }}>Общо: <b style={{ color: 'var(--text)' }}>{money(total)}</b></div>}
      <Field label="Причина (по избор)">
        <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="напр. служебно" />
      </Field>
      <Field label="Бележка (по избор)">
        <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Modal>
  )
}

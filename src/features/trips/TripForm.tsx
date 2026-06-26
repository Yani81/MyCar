import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Field, Row, inputClass } from '../../components/ui/Field'
import { FormFooter } from '../../components/ui/FormFooter'
import { useStore, useActiveVehicle } from '../../store/useStore'
import { todayISO, km, money, num, toNumStr } from '../../lib/format'
import { computeStats } from '../../lib/calculations'
import type { Trip } from '../../types'
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
  const [date, setDate] = useState(edit?.date ?? todayISO())
  const [startOdometer, setStart] = useState(edit ? String(edit.startOdometer) : '')
  const [endOdometer, setEnd] = useState(edit ? String(edit.endOdometer) : '')
  const [costPerKm, setCostPerKm] = useState(
    edit?.costPerKm
      ? String(edit.costPerKm)
      : stats?.fuelCostPerKm != null
        ? stats.fuelCostPerKm.toFixed(3)
        : ''
  )
  const [reason, setReason] = useState(edit?.reason ?? '')
  const [notes, setNotes] = useState(edit?.notes ?? '')

  const distance = Math.max(0, Number(endOdometer) - Number(startOdometer))
  const total = distance * (Number(costPerKm) || 0)
  const valid = origin.trim() !== '' && destination.trim() !== '' && distance > 0

  const submit = () => {
    if (!valid) return
    const payload = {
      vehicleId,
      origin: origin.trim(),
      destination: destination.trim(),
      date,
      startOdometer: Number(startOdometer),
      endOdometer: Number(endOdometer),
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
      title={edit ? 'Редакция на маршрут' : 'Нов маршрут'}
      color="#5f7079"
      onClose={onClose}
      footer={<FormFooter valid={valid} edit={!!edit} onSubmit={submit} onDelete={edit ? () => { removeTrip(edit.id); onClose() } : undefined} deleteMsg="Изтриване на маршрута?" color="#5f7079" />}
    >
      <Field label="Произход (A)">
        <input className={inputClass} value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="напр. Бургас" />
      </Field>
      <Field label="Дестинация (B)">
        <input className={inputClass} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="напр. София" />
      </Field>
      <Field label="Дата">
        <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Row>
        <Field label="Начален км">
          <input className={inputClass} inputMode="numeric" value={startOdometer} onChange={(e) => setStart(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Краен км">
          <input className={inputClass} inputMode="numeric" value={endOdometer} onChange={(e) => setEnd(e.target.value)} placeholder="0" />
        </Field>
      </Row>
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

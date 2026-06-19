import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Field, Row, inputClass } from '../../components/ui/Field'
import { FormFooter } from '../../components/ui/FormFooter'
import { useStore, useActiveVehicle } from '../../store/useStore'
import { computeStats } from '../../lib/calculations'
import { todayISO, km } from '../../lib/format'
import type { OdometerReading } from '../../types'

export function OdometerForm({ vehicleId, edit, onClose }: { vehicleId: string; edit: OdometerReading | null; onClose: () => void }) {
  const v = useActiveVehicle()
  const addReading = useStore((s) => s.addReading)
  const updateReading = useStore((s) => s.updateReading)
  const removeReading = useStore((s) => s.removeReading)
  const refuels = useStore((s) => s.refuels)
  const expenses = useStore((s) => s.expenses)
  const incomes = useStore((s) => s.incomes)
  const trips = useStore((s) => s.trips)
  const readings = useStore((s) => s.readings)

  const last = v
    ? computeStats(v, {
        refuels: refuels.filter((r) => r.vehicleId === v.id),
        expenses: expenses.filter((e) => e.vehicleId === v.id),
        incomes: incomes.filter((i) => i.vehicleId === v.id),
        trips: trips.filter((t) => t.vehicleId === v.id),
        readings: readings.filter((r) => r.vehicleId === v.id),
      }).currentOdometer
    : 0

  const [date, setDate] = useState(edit?.date ?? todayISO())
  const [odometer, setOdometer] = useState(edit ? String(edit.odometer) : '')
  const [driver, setDriver] = useState(edit?.driver ?? '')
  const [notes, setNotes] = useState(edit?.notes ?? '')

  const valid = Number(odometer) > 0
  const submit = () => {
    if (!valid) return
    const payload = { vehicleId, date, odometer: Number(odometer), driver: driver.trim() || undefined, notes: notes.trim() || undefined }
    if (edit) updateReading(edit.id, payload)
    else addReading(payload)
    onClose()
  }

  return (
    <Modal
      open
      title={edit ? 'Редакция на показание' : 'Ново показание'}
      color="#c2185b"
      onClose={onClose}
      footer={<FormFooter valid={valid} edit={!!edit} onSubmit={submit} onDelete={edit ? () => { removeReading(edit.id); onClose() } : undefined} deleteMsg="Изтриване на показанието?" color="#c2185b" />}
    >
      <Row>
        <Field label="Дата">
          <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Километраж" hint={`последно: ${km(last)}`}>
          <input className={inputClass} inputMode="numeric" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="0" />
        </Field>
      </Row>
      <Field label="Шофьор (по избор)">
        <input className={inputClass} value={driver} onChange={(e) => setDriver(e.target.value)} />
      </Field>
      <Field label="Бележка (по избор)">
        <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Modal>
  )
}

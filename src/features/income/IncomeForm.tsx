import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Field, Row, inputClass, selectClass } from '../../components/ui/Field'
import { FormFooter } from '../../components/ui/FormFooter'
import { useStore } from '../../store/useStore'
import { todayISO, toNumStr } from '../../lib/format'
import { INCOME_CATEGORIES, type Income } from '../../types'

export function IncomeForm({ vehicleId, edit, onClose }: { vehicleId: string; edit: Income | null; onClose: () => void }) {
  const addIncome = useStore((s) => s.addIncome)
  const updateIncome = useStore((s) => s.updateIncome)
  const removeIncome = useStore((s) => s.removeIncome)

  const [date, setDate] = useState(edit?.date ?? todayISO())
  const [category, setCategory] = useState(edit?.category ?? INCOME_CATEGORIES[0])
  const [amount, setAmount] = useState(edit ? String(edit.amount) : '')
  const [odometer, setOdometer] = useState(edit?.odometer ? String(edit.odometer) : '')
  const [driver, setDriver] = useState(edit?.driver ?? '')
  const [notes, setNotes] = useState(edit?.notes ?? '')

  const valid = Number(amount) > 0
  const submit = () => {
    if (!valid) return
    const payload = {
      vehicleId,
      date,
      category,
      amount: Number(amount),
      odometer: Number(odometer) || undefined,
      driver: driver.trim() || undefined,
      notes: notes.trim() || undefined,
    }
    if (edit) updateIncome(edit.id, payload)
    else addIncome(payload)
    onClose()
  }

  return (
    <Modal
      open
      title={edit ? 'Редакция на приход' : 'Нов приход'}
      color="#3f9c35"
      onClose={onClose}
      footer={<FormFooter valid={valid} edit={!!edit} onSubmit={submit} onDelete={edit ? () => { removeIncome(edit.id); onClose() } : undefined} deleteMsg="Изтриване на прихода?" color="#3f9c35" />}
    >
      <Field label="Категория">
        <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}>
          {INCOME_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Row>
        <Field label="Сума (€)">
          <input className={inputClass} inputMode="decimal" value={amount} onChange={(e) => setAmount(toNumStr(e.target.value))} placeholder="0.00" />
        </Field>
        <Field label="Дата">
          <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label="Километраж (по избор)">
          <input className={inputClass} inputMode="numeric" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Шофьор (по избор)">
          <input className={inputClass} value={driver} onChange={(e) => setDriver(e.target.value)} />
        </Field>
      </Row>
      <Field label="Бележка (по избор)">
        <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Modal>
  )
}

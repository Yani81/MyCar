import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Field, Row, inputClass, selectClass, textareaClass } from '../../components/ui/Field'
import { FormFooter } from '../../components/ui/FormFooter'
import { useStore } from '../../store/useStore'
import { todayISO } from '../../lib/format'
import { EXPENSE_CATEGORIES, type Expense, type ExpenseKind } from '../../types'

export function ExpenseForm({
  vehicleId,
  edit,
  mode,
  onClose,
}: {
  vehicleId: string
  edit: Expense | null
  mode: ExpenseKind
  onClose: () => void
}) {
  const addExpense = useStore((s) => s.addExpense)
  const updateExpense = useStore((s) => s.updateExpense)
  const removeExpense = useStore((s) => s.removeExpense)

  const kind: ExpenseKind = edit?.kind ?? mode
  const cats = EXPENSE_CATEGORIES.filter((c) => c.kind === kind)

  const [date, setDate] = useState(edit?.date ?? todayISO())
  const [categoryId, setCategoryId] = useState(
    edit ? EXPENSE_CATEGORIES.find((c) => c.label === edit.category)?.id ?? cats[0].id : cats[0].id
  )
  const [title, setTitle] = useState(edit?.title ?? '')
  const [cost, setCost] = useState(edit ? String(edit.cost) : '')
  const [odometer, setOdometer] = useState(edit?.odometer ? String(edit.odometer) : '')
  const [place, setPlace] = useState(edit?.place ?? '')
  const [driver, setDriver] = useState(edit?.driver ?? '')
  const [notes, setNotes] = useState(edit?.notes ?? '')

  const cat = EXPENSE_CATEGORIES.find((c) => c.id === categoryId) ?? cats[0]
  const valid = Number(cost) > 0
  const submit = () => {
    if (!valid) return
    const payload = {
      vehicleId,
      date,
      kind: cat.kind,
      category: cat.label,
      title: title.trim() || undefined,
      cost: Number(cost),
      odometer: Number(odometer) || undefined,
      place: place.trim() || undefined,
      driver: driver.trim() || undefined,
      notes: notes.trim() || undefined,
    }
    if (edit) updateExpense(edit.id, payload)
    else addExpense(payload)
    onClose()
  }

  const title0 = kind === 'service' ? 'услуга / сервиз' : 'разход'
  const formColor = kind === 'service' ? '#7a5c4a' : '#ec5b53'
  return (
    <Modal
      open
      title={edit ? `Редакция на ${title0}` : `Нов ${title0}`}
      color={formColor}
      onClose={onClose}
      footer={<FormFooter valid={valid} edit={!!edit} onSubmit={submit} onDelete={edit ? () => { removeExpense(edit.id); onClose() } : undefined} deleteMsg="Изтриване на записа?" color={formColor} />}
    >
      <Field label={kind === 'service' ? 'Вид услуга' : 'Категория'}>
        <select className={selectClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </Field>
      <Field label="Описание (по избор)">
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="напр. Смяна на накладки" />
      </Field>
      <Row>
        <Field label="Сума (лв.)">
          <input className={inputClass} inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Дата">
          <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label="Километраж (по избор)">
          <input className={inputClass} inputMode="numeric" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Място (по избор)">
          <input className={inputClass} value={place} onChange={(e) => setPlace(e.target.value)} />
        </Field>
      </Row>
      <Field label="Шофьор (по избор)">
        <input className={inputClass} value={driver} onChange={(e) => setDriver(e.target.value)} />
      </Field>
      <Field label="Бележка (по избор)">
        <textarea className={textareaClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Modal>
  )
}

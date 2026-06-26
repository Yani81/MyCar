import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Field, Row, inputClass, selectClass, textareaClass, Toggle, Segmented, CheckGroup } from '../../components/ui/Field'
import { FormFooter } from '../../components/ui/FormFooter'
import { useStore } from '../../store/useStore'
import { todayISO, toDateTimeLocal, toNumStr } from '../../lib/format'
import { EXPENSE_CATEGORIES, type Expense, type ExpenseKind, type ReminderBasis } from '../../types'

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
  const addReminder = useStore((s) => s.addReminder)

  const kind: ExpenseKind = edit?.kind ?? mode
  const cats = EXPENSE_CATEGORIES.filter((c) => c.kind === kind)

  const [date, setDate] = useState(toDateTimeLocal(edit?.date ?? todayISO()))
  const [categoryId, setCategoryId] = useState(
    edit ? EXPENSE_CATEGORIES.find((c) => c.label === edit.category)?.id ?? cats[0].id : cats[0].id
  )
  const [title, setTitle] = useState(edit?.title ?? '')
  const [cost, setCost] = useState(edit ? String(edit.cost) : '')
  const [odometer, setOdometer] = useState(edit?.odometer ? String(edit.odometer) : '')
  const [place, setPlace] = useState(edit?.place ?? '')
  const [notes, setNotes] = useState(edit?.notes ?? '')

  // Oil change specific
  const [oilType, setOilType] = useState(edit?.oilType ?? '')
  const [oilFilter, setOilFilter] = useState(edit?.oilFilterChanged ?? false)
  const [fuelFilter, setFuelFilter] = useState(edit?.fuelFilterChanged ?? false)
  const [airFilter, setAirFilter] = useState(edit?.airFilterChanged ?? false)

  // Inline reminder (само при нов запис)
  const [enableReminder, setEnableReminder] = useState(false)
  const [reminderBasis, setReminderBasis] = useState<ReminderBasis>('odometer')
  const [reminderDate, setReminderDate] = useState('')
  const [reminderOdo, setReminderOdo] = useState('')
  const [reminderMonths, setReminderMonths] = useState('')
  const [reminderKm, setReminderKm] = useState('')

  const cat = EXPENSE_CATEGORIES.find((c) => c.id === categoryId) ?? cats[0]
  const isOil = cat.id === 'oil'
  const showReminderDate = reminderBasis === 'date' || reminderBasis === 'both'
  const showReminderOdo = reminderBasis === 'odometer' || reminderBasis === 'both'

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
      notes: notes.trim() || undefined,
      ...(isOil && {
        oilType: oilType.trim() || undefined,
        oilFilterChanged: oilFilter || undefined,
        fuelFilterChanged: fuelFilter || undefined,
        airFilterChanged: airFilter || undefined,
      }),
    }
    if (edit) updateExpense(edit.id, payload)
    else addExpense(payload)

    if (isOil && !edit && enableReminder) {
      addReminder({
        vehicleId,
        title: 'Смяна на масло',
        basis: reminderBasis,
        dueDate: showReminderDate ? reminderDate || undefined : undefined,
        dueOdometer: showReminderOdo ? Number(reminderOdo) || undefined : undefined,
        repeatMonths: Number(reminderMonths) || undefined,
        repeatKm: Number(reminderKm) || undefined,
        done: false,
      })
    }

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
      <Field label="Дата и час">
        <input className={inputClass} type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Row>
        <Field label="Сума (€)">
          <input className={inputClass} inputMode="decimal" value={cost} onChange={(e) => setCost(toNumStr(e.target.value))} placeholder="0.00" />
        </Field>
        <Field label="Километраж (по избор)">
          <input className={inputClass} inputMode="numeric" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="0" />
        </Field>
      </Row>
      <Field label="Място (по избор)">
        <input className={inputClass} value={place} onChange={(e) => setPlace(e.target.value)} />
      </Field>
      {isOil && (
        <>
          <Field label="Вид масло (по избор)">
            <input
              className={inputClass}
              value={oilType}
              onChange={(e) => setOilType(e.target.value)}
              placeholder="напр. 5W-40 синтетично"
            />
          </Field>
          <Field label="Сменени филтри">
            <CheckGroup
              items={[
                { label: 'Маслен филтър', checked: oilFilter, onChange: setOilFilter },
                { label: 'Горивен филтър', checked: fuelFilter, onChange: setFuelFilter },
                { label: 'Въздушен филтър', checked: airFilter, onChange: setAirFilter },
              ]}
            />
          </Field>
          {!edit && (
            <>
              <Toggle checked={enableReminder} onChange={setEnableReminder} label="Добави напомняне" />
              {enableReminder && (
                <>
                  <Field label="Напомни по">
                    <Segmented
                      value={reminderBasis}
                      onChange={setReminderBasis}
                      options={[
                        { value: 'date', label: 'Дата' },
                        { value: 'odometer', label: 'Километраж' },
                        { value: 'both', label: 'И двете' },
                      ]}
                    />
                  </Field>
                  {showReminderDate && (
                    <Field label="Дата на следваща смяна">
                      <input className={inputClass} type="date" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} />
                    </Field>
                  )}
                  {showReminderOdo && (
                    <Field label="Километраж на следваща смяна">
                      <input className={inputClass} inputMode="numeric" value={reminderOdo} onChange={(e) => setReminderOdo(e.target.value)} placeholder="0" />
                    </Field>
                  )}
                  <Row>
                    <Field label="Повтаряй (месеци)" hint="по избор">
                      <input className={inputClass} inputMode="numeric" value={reminderMonths} onChange={(e) => setReminderMonths(e.target.value)} placeholder="12" />
                    </Field>
                    <Field label="Повтаряй (км)" hint="по избор">
                      <input className={inputClass} inputMode="numeric" value={reminderKm} onChange={(e) => setReminderKm(e.target.value)} placeholder="15000" />
                    </Field>
                  </Row>
                </>
              )}
            </>
          )}
        </>
      )}

      <Field label="Бележка (по избор)">
        <textarea className={textareaClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Modal>
  )
}

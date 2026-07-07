import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Field, Row, inputClass, Segmented } from '../../components/ui/Field'
import { FormFooter } from '../../components/ui/FormFooter'
import { useStore } from '../../store/useStore'
import { ENTRY_COLORS, type Reminder, type ReminderBasis } from '../../types'

export function ReminderForm({ vehicleId, edit, onClose }: { vehicleId: string; edit: Reminder | null; onClose: () => void }) {
  const addReminder = useStore((s) => s.addReminder)
  const updateReminder = useStore((s) => s.updateReminder)
  const removeReminder = useStore((s) => s.removeReminder)

  const [title, setTitle] = useState(edit?.title ?? '')
  const [basis, setBasis] = useState<ReminderBasis>(edit?.basis ?? 'date')
  const [dueDate, setDueDate] = useState(edit?.dueDate ?? '')
  const [dueOdometer, setDueOdometer] = useState(edit?.dueOdometer ? String(edit.dueOdometer) : '')
  const [repeatMonths, setRepeatMonths] = useState(edit?.repeatMonths ? String(edit.repeatMonths) : '')
  const [repeatKm, setRepeatKm] = useState(edit?.repeatKm ? String(edit.repeatKm) : '')

  const showDate = basis === 'date' || basis === 'both'
  const showOdo = basis === 'odometer' || basis === 'both'
  const valid = !!title.trim() && ((showDate && !!dueDate) || (showOdo && Number(dueOdometer) > 0))

  const submit = () => {
    if (!valid) return
    const payload = {
      vehicleId,
      title: title.trim(),
      basis,
      dueDate: showDate ? dueDate : undefined,
      dueOdometer: showOdo ? Number(dueOdometer) || undefined : undefined,
      repeatMonths: Number(repeatMonths) || undefined,
      repeatKm: Number(repeatKm) || undefined,
      done: edit?.done ?? false,
    }
    if (edit) updateReminder(edit.id, payload)
    else addReminder(payload)
    onClose()
  }

  return (
    <Modal
      open
      title={edit ? 'Редакция на напомняне' : 'Ново напомняне'}
      color={ENTRY_COLORS.reminder}
      onClose={onClose}
      footer={<FormFooter valid={valid} edit={!!edit} onSubmit={submit} onDelete={edit ? () => { removeReminder(edit.id); onClose() } : undefined} deleteMsg="Изтриване на напомнянето?" color={ENTRY_COLORS.reminder} />}
    >
      <Field label="Какво">
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="напр. Смяна на масло" />
      </Field>
      <Field label="По">
        <Segmented
          value={basis}
          onChange={setBasis}
          options={[
            { value: 'date', label: 'Дата' },
            { value: 'odometer', label: 'Километраж' },
            { value: 'both', label: 'И двете' },
          ]}
        />
      </Field>
      {showDate && (
        <Field label="Дата на падеж">
          <input className={inputClass} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
      )}
      {showOdo && (
        <Field label="Километраж на падеж">
          <input className={inputClass} inputMode="numeric" value={dueOdometer} onChange={(e) => setDueOdometer(e.target.value)} placeholder="0" />
        </Field>
      )}
      <Row>
        <Field label="Повтаряй (месеци)" hint="по избор">
          <input className={inputClass} inputMode="numeric" value={repeatMonths} onChange={(e) => setRepeatMonths(e.target.value)} placeholder="12" />
        </Field>
        <Field label="Повтаряй (км)" hint="по избор">
          <input className={inputClass} inputMode="numeric" value={repeatKm} onChange={(e) => setRepeatKm(e.target.value)} placeholder="15000" />
        </Field>
      </Row>
    </Modal>
  )
}

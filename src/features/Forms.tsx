import { useUI } from '../store/useUI'
import { useActiveVehicle } from '../store/useStore'
import { RefuelForm } from './fuel/RefuelForm'
import { ExpenseForm } from './expenses/ExpenseForm'
import { IncomeForm } from './income/IncomeForm'
import { TripForm } from './trips/TripForm'
import { OdometerForm } from './odometer/OdometerForm'
import { ReminderForm } from './reminders/ReminderForm'

export function Forms() {
  const form = useUI((s) => s.form)
  const close = useUI((s) => s.closeForm)
  const v = useActiveVehicle()
  if (!form || !v) return null

  const key = form.type + (form.entry?.id ?? 'new')
  switch (form.type) {
    case 'refuel':
      return <RefuelForm key={key} vehicleId={v.id} edit={form.entry} onClose={close} />
    case 'expense':
      return <ExpenseForm key={key} vehicleId={v.id} edit={form.entry} draft={form.draft} mode="expense" onClose={close} />
    case 'service':
      return <ExpenseForm key={key} vehicleId={v.id} edit={form.entry} draft={form.draft} mode="service" onClose={close} />
    case 'income':
      return <IncomeForm key={key} vehicleId={v.id} edit={form.entry} onClose={close} />
    case 'trip':
      return <TripForm key={key} vehicleId={v.id} edit={form.entry} onClose={close} />
    case 'odometer':
      return <OdometerForm key={key} vehicleId={v.id} edit={form.entry} onClose={close} />
    case 'reminder':
      return <ReminderForm key={key} vehicleId={v.id} edit={form.entry} onClose={close} />
  }
}

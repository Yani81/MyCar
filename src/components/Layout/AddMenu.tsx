import styles from './AddMenu.module.css'
import { useUI, type FormOpen } from '../../store/useUI'
import { ENTRY_COLORS } from '../../types'
import { Modal } from '../ui/Modal'
import { IconFuel, IconWrench, IconBell, IconIncome, IconRoute, IconOdometer } from './icons'

const ITEMS: { type: FormOpen['type']; label: string; color: string; Icon: typeof IconFuel }[] = [
  { type: 'refuel', label: 'Зареждане', color: ENTRY_COLORS.refuel, Icon: IconFuel },
  { type: 'expense', label: 'Разход', color: ENTRY_COLORS.expense, Icon: IconWrench },
  { type: 'service', label: 'Ремонт', color: ENTRY_COLORS.service, Icon: IconWrench },
  { type: 'income', label: 'Приход', color: ENTRY_COLORS.income, Icon: IconIncome },
  { type: 'trip', label: 'Маршрут', color: ENTRY_COLORS.trip, Icon: IconRoute },
  { type: 'odometer', label: 'Показание', color: ENTRY_COLORS.odometer, Icon: IconOdometer },
  { type: 'reminder', label: 'Напомняне', color: ENTRY_COLORS.reminder, Icon: IconBell },
]

export function AddMenu() {
  const open = useUI((s) => s.menuOpen)
  const setMenu = useUI((s) => s.setMenu)
  const openForm = useUI((s) => s.openForm)

  return (
    <Modal open={open} title="Добави запис" onClose={() => setMenu(false)}>
      <div className={styles.grid}>
        {ITEMS.map(({ type, label, color, Icon }) => (
          <button key={type} className={styles.item} onClick={() => openForm({ type, entry: null } as FormOpen)}>
            <span className={styles.icon} style={{ background: color }}>
              <Icon width={22} height={22} color="#fff" />
            </span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}

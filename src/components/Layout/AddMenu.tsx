import styles from './AddMenu.module.css'
import { useUI, type FormOpen } from '../../store/useUI'
import { Modal } from '../ui/Modal'
import { IconFuel, IconWrench, IconBell, IconIncome, IconRoute, IconOdometer } from './icons'

const ITEMS: { type: FormOpen['type']; label: string; color: string; Icon: typeof IconFuel }[] = [
  { type: 'refuel', label: 'Зареждане', color: '#f5821f', Icon: IconFuel },
  { type: 'expense', label: 'Разход', color: '#ec5b53', Icon: IconWrench },
  { type: 'service', label: 'Услуга / сервиз', color: '#7a5c4a', Icon: IconWrench },
  { type: 'income', label: 'Приход', color: '#3f9c35', Icon: IconIncome },
  { type: 'trip', label: 'Маршрут', color: '#5f7079', Icon: IconRoute },
  { type: 'odometer', label: 'Показание', color: '#c2185b', Icon: IconOdometer },
  { type: 'reminder', label: 'Напомняне', color: '#7e57c2', Icon: IconBell },
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

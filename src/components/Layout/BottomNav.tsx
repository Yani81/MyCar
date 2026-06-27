import styles from './BottomNav.module.css'
import { IconGauge, IconList, IconBell, IconChart, IconPlus } from './icons'
import { useUI } from '../../store/useUI'

export type Tab = 'dashboard' | 'history' | 'reminders' | 'reports' | 'checks'

const LEFT: { id: Tab; label: string; Icon: typeof IconGauge }[] = [
  { id: 'dashboard', label: 'Табло', Icon: IconGauge },
  { id: 'history', label: 'История', Icon: IconList },
]
const RIGHT: { id: Tab; label: string; Icon: typeof IconGauge }[] = [
  { id: 'reminders', label: 'Напомняния', Icon: IconBell },
  { id: 'reports', label: 'Справки', Icon: IconChart },
]

export function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const setMenu = useUI((s) => s.setMenu)
  const item = (id: Tab, label: string, Icon: typeof IconGauge) => (
    <button key={id} className={`${styles.item} ${active === id ? styles.active : ''}`} onClick={() => onChange(id)}>
      <Icon className={styles.icon} />
      <span>{label}</span>
    </button>
  )
  return (
    <nav className={styles.nav}>
      {LEFT.map(({ id, label, Icon }) => item(id, label, Icon))}
      <button className={styles.center} onClick={() => setMenu(true)} aria-label="Добави запис">
        <IconPlus width={26} height={26} />
      </button>
      {RIGHT.map(({ id, label, Icon }) => item(id, label, Icon))}
    </nav>
  )
}

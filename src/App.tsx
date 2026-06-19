import { useEffect, useState } from 'react'
import { Header } from './components/Layout/Header'
import { BottomNav, type Tab } from './components/Layout/BottomNav'
import { Dashboard } from './features/dashboard/Dashboard'
import { HistoryPage } from './features/history/HistoryPage'
import { RemindersPage } from './features/reminders/RemindersPage'
import { ReportsPage } from './features/reports/ReportsPage'
import { Forms } from './features/Forms'
import { AddMenu } from './components/Layout/AddMenu'
import { useStore } from './store/useStore'

function applyTheme(theme: 'auto' | 'light' | 'dark') {
  const root = document.documentElement
  if (theme === 'auto') {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.dataset.theme = dark ? 'dark' : 'light'
  } else {
    root.dataset.theme = theme
  }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const theme = useStore((s) => s.theme)

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('auto')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  return (
    <div className="app">
      <Header />
      {tab === 'dashboard' && <Dashboard go={setTab} />}
      {tab === 'history' && <HistoryPage />}
      {tab === 'reminders' && <RemindersPage />}
      {tab === 'reports' && <ReportsPage />}
      <BottomNav active={tab} onChange={setTab} />
      <AddMenu />
      <Forms />
    </div>
  )
}

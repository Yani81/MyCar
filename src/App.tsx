import { useEffect, useRef, useState } from 'react'
import { Header } from './components/Layout/Header'
import { BottomNav, type Tab } from './components/Layout/BottomNav'
import { Dashboard } from './features/dashboard/Dashboard'
import { HistoryPage } from './features/history/HistoryPage'
import { RemindersPage } from './features/reminders/RemindersPage'
import { ReportsPage } from './features/reports/ReportsPage'
import { Forms } from './features/Forms'
import { AddMenu } from './components/Layout/AddMenu'
import { AuthPage } from './features/auth/AuthPage'
import { useStore } from './store/useStore'
import { useAuth } from './store/useAuth'
import { loadFromCloud, saveToCloud } from './lib/sync'

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
  const loadCloudData = useStore((s) => s.loadCloudData)
  const { user, loading } = useAuth()
  const prevUserId = useRef<string | null>(null)

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('auto')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  useEffect(() => {
    if (!user || user.id === prevUserId.current) return
    prevUserId.current = user.id

    loadFromCloud().then((data) => {
      if (data) {
        loadCloudData(data)
      } else {
        // New account — migrate existing localStorage data to Supabase
        const s = useStore.getState()
        saveToCloud({
          vehicles: s.vehicles,
          refuels: s.refuels,
          expenses: s.expenses,
          incomes: s.incomes,
          trips: s.trips,
          readings: s.readings,
          reminders: s.reminders,
          activeVehicleId: s.activeVehicleId,
          theme: s.theme,
        })
      }
    })
  }, [user?.id])

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
        …
      </div>
    )
  }

  if (!user) return <AuthPage />

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

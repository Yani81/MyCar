import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Header } from './components/Layout/Header'
import { BottomNav, type Tab } from './components/Layout/BottomNav'
import { Dashboard } from './features/dashboard/Dashboard'
import { HistoryPage } from './features/history/HistoryPage'
import { RemindersPage } from './features/reminders/RemindersPage'
import { ChecksPage } from './features/checks/ChecksPage'
import { useDailyFineCheck } from './features/checks/useDailyFineCheck'
import { Forms } from './features/Forms'
import { AddMenu } from './components/Layout/AddMenu'
import { AuthPage } from './features/auth/AuthPage'
import { useStore } from './store/useStore'
import { useAuth } from './store/useAuth'
import { loadFromCloud, saveToCloud, refreshFromCloudIfNewer } from './lib/sync'

// Recharts (~400 kB) се ползва само в Справки — зарежда се при първо отваряне на таба
const ReportsPage = lazy(() =>
  import('./features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage }))
)

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
  const reminders = useStore((s) => s.reminders)
  const notifyDaysAhead = useStore((s) => s.notifyDaysAhead)
  const autoCheckFines = useStore((s) => s.autoCheckFines)
  const driverProfile = useStore((s) => s.driverProfile)
  const { user, loading } = useAuth()
  const prevUserId = useRef<string | null>(null)

  useDailyFineCheck(!!user && autoCheckFines)

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
          notifyDaysAhead: s.notifyDaysAhead,
        })
      }
    })
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshFromCloudIfNewer()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [user?.id])

  useEffect(() => {
    if (!user || notifyDaysAhead <= 0) return
    if (sessionStorage.getItem('notif-checked')) return
    sessionStorage.setItem('notif-checked', '1')

    const todayMs = new Date().setHours(0, 0, 0, 0)
    const upcoming = reminders.filter((r) => {
      if (r.done || !r.dueDate) return false
      const due = new Date(r.dueDate + 'T00:00:00').getTime()
      const days = Math.round((due - todayMs) / 86400000)
      return days >= 0 && days <= notifyDaysAhead
    })
    if (!upcoming.length || !('Notification' in window)) return

    const show = () => {
      upcoming.forEach((r) => {
        const due = new Date(r.dueDate! + 'T00:00:00').getTime()
        const days = Math.round((due - todayMs) / 86400000)
        const body = days === 0 ? 'Днес!' : `След ${days} ${days === 1 ? 'ден' : 'дни'}`
        const opts = { body, icon: '/MyCar/icon-192.png' }
        if (navigator.serviceWorker?.controller) {
          navigator.serviceWorker.ready
            .then((sw) => sw.showNotification(`MyCar: ${r.title}`, opts))
            .catch(() => new Notification(`MyCar: ${r.title}`, opts))
        } else {
          new Notification(`MyCar: ${r.title}`, opts)
        }
      })
    }

    if (Notification.permission === 'granted') {
      show()
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((p) => { if (p === 'granted') show() })
    }
  }, [user?.id, notifyDaysAhead])

  // Предупреждение за изтичане на шофьорска книжка — ФИКСИРАНО 1 месец
  // предварително, независимо от настройката „Известия" по-горе.
  useEffect(() => {
    const validUntil = driverProfile?.licenseValidUntil
    if (!user || !validUntil) return
    if (sessionStorage.getItem('notif-license-checked')) return
    sessionStorage.setItem('notif-license-checked', '1')

    const todayMs = new Date().setHours(0, 0, 0, 0)
    const due = new Date(validUntil + 'T00:00:00').getTime()
    const days = Math.round((due - todayMs) / 86400000)
    if (days < 0 || days > 30 || !('Notification' in window)) return

    const body = days === 0 ? 'Днес!' : `След ${days} ${days === 1 ? 'ден' : 'дни'}`
    const opts = { body, icon: '/MyCar/icon-192.png' }
    const show = () => {
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.ready
          .then((sw) => sw.showNotification('MyCar: Шофьорската книжка изтича', opts))
          .catch(() => new Notification('MyCar: Шофьорската книжка изтича', opts))
      } else {
        new Notification('MyCar: Шофьорската книжка изтича', opts)
      }
    }

    if (Notification.permission === 'granted') {
      show()
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((p) => { if (p === 'granted') show() })
    }
  }, [user?.id, driverProfile?.licenseValidUntil])

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
      <Header go={setTab} />
      {tab === 'dashboard' && <Dashboard go={setTab} />}
      {tab === 'history' && <HistoryPage />}
      {tab === 'reminders' && <RemindersPage />}
      {tab === 'reports' && <Suspense fallback={null}><ReportsPage /></Suspense>}
      {tab === 'checks' && <ChecksPage go={setTab} />}
      <BottomNav active={tab} onChange={setTab} />
      <AddMenu />
      <Forms />
    </div>
  )
}

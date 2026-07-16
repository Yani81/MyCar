import { useEffect, useRef } from 'react'
import { useStore } from '../../store/useStore'
import { isCheckError, runDelictCheck, runKatCheck } from './runChecks'
import type { VehicleCheckResult } from '../../types'

/** Успешна проверка от днес — няма нужда от нова до утре. */
const freshToday = (r: VehicleCheckResult | undefined, today: string) =>
  !!r && r.checkedAt === today && !isCheckError(r)

function notify(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const opts = { body, icon: '/MyCar/icon-192.png' }
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.ready
      .then((sw) => sw.showNotification(title, opts))
      .catch(() => new Notification(title, opts))
  } else {
    new Notification(title, opts)
  }
}

/**
 * Веднъж дневно при отваряне на приложението проверява глоби КАТ и BGToll
 * за активното МПС със запазените КАТ данни (ЕГН + СУМПС) от устройството.
 * Пуска се при mount и при връщане на таба на преден план.
 */
export function useDailyFineCheck(enabled: boolean) {
  const running = useRef(false)

  useEffect(() => {
    if (!enabled) return

    const run = async () => {
      if (running.current) return
      const s = useStore.getState()
      const creds = s.katCredentials
      if (!s.autoCheckFines || !creds) return
      const v = s.vehicles.find((x) => x.id === s.activeVehicleId) ?? s.vehicles[0]
      if (!v) return

      const today = new Date().toISOString().slice(0, 10)
      const checks = s.vehicleChecks[v.id] ?? {}
      const needKat = !freshToday(checks.kat, today)
      const needDelict = !!v.plate && !freshToday(checks.delict, today)
      if (!needKat && !needDelict) return

      running.current = true
      try {
        const found: string[] = []
        if (needKat) {
          const r = await runKatCheck(creds.egn, creds.license)
          useStore.getState().saveCheck(v.id, 'kat', r)
          if (!r.valid && !isCheckError(r)) found.push(`КАТ: ${r.message}`)
        }
        if (needDelict) {
          const r = await runDelictCheck(v.plate!, creds.egn)
          useStore.getState().saveCheck(v.id, 'delict', r)
          if (!r.valid && !isCheckError(r)) found.push(`BGToll: ${r.message}`)
        }
        if (found.length) notify('MyCar: Има глоби', found.join('\n'))
      } finally {
        running.current = false
      }
    }

    run()
    const onVisible = () => {
      if (document.visibilityState === 'visible') run()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [enabled])
}

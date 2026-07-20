import { useState } from 'react'
import styles from './ChecksPage.module.css'
import { useActiveVehicle, useStore } from '../../store/useStore'
import type { Tab } from '../../components/Layout/BottomNav'
import { supabase } from '../../lib/supabase'
import { Modal } from '../../components/ui/Modal'
import { Field, inputClass } from '../../components/ui/Field'
import { dateShort, toISODate } from '../../lib/format'
import { dateSpanUntil, formatSpan, driverLicenseStatus } from '../../lib/calculations'
import { ENTRY_COLORS } from '../../types'
import type { DriverProfile } from '../../types'
import { useUI } from '../../store/useUI'
import { plateForApi } from '../../lib/plate'
import { CHECK_REGION, runDelictCheck, runKatCheck } from './runChecks'

export function ChecksPage({ go }: { go: (t: Tab) => void }) {
  const openForm = useUI((s) => s.openForm)
  const v = useActiveVehicle()
  const vehicleChecks = useStore((s) => s.vehicleChecks)
  const saveCheck = useStore((s) => s.saveCheck)
  const driverProfile = useStore((s) => s.driverProfile)
  const setDriverProfile = useStore((s) => s.setDriverProfile)
  const autoCheckFines = useStore((s) => s.autoCheckFines)
  const setAutoCheckFines = useStore((s) => s.setAutoCheckFines)

  const [goLoading, setGoLoading] = useState(false)
  const [gtpLoading, setGtpLoading] = useState(false)
  const [vignetteLoading, setVignetteLoading] = useState(false)
  const [delictLoading, setDelictLoading] = useState(false)
  const [katLoading, setKatLoading] = useState(false)

  const [showEgnModal, setShowEgnModal] = useState(false)
  const [egnInput, setEgnInput] = useState('')

  // Профил на водача — редактиране, споделено между картата „Шофьорска книжка"
  // и КАТ проверката (ако липсват данни при „Провери")
  const [showDriverModal, setShowDriverModal] = useState(false)
  const [driverThenCheckKat, setDriverThenCheckKat] = useState(false)
  const [driverName, setDriverName] = useState('')
  const [driverEgn, setDriverEgn] = useState('')
  const [driverLicense, setDriverLicense] = useState('')
  const [driverValidUntil, setDriverValidUntil] = useState('')

  if (!v) return null

  const checks = vehicleChecks[v.id] ?? {}
  const today = new Date().toISOString().slice(0, 10)
  const hasDriverCreds = !!driverProfile?.egn && !!driverProfile?.license

  const openDriverModal = (thenCheckKat: boolean) => {
    setDriverName(driverProfile?.fullName ?? '')
    setDriverEgn(driverProfile?.egn ?? '')
    setDriverLicense(driverProfile?.license ?? '')
    setDriverValidUntil(driverProfile?.licenseValidUntil ?? '')
    setDriverThenCheckKat(thenCheckKat)
    setShowDriverModal(true)
  }

  const saveDriverProfile = async () => {
    if (!driverEgn.trim() || !driverLicense.trim()) return
    const profile: DriverProfile = {
      fullName: driverName.trim(),
      egn: driverEgn.trim(),
      license: driverLicense.trim(),
      licenseValidUntil: driverValidUntil || undefined,
    }
    setDriverProfile(profile)
    setShowDriverModal(false)
    if (driverThenCheckKat) await checkKATWith(profile.egn, profile.license)
  }

  const handleAutoToggle = (on: boolean) => {
    setAutoCheckFines(on)
    if (on && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  const checkGO = async () => {
    setGoLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('check-go', { body: { plate: plateForApi(v.plate ?? '') }, region: CHECK_REGION })
      if (error) throw error
      const d = data as { valid: boolean; message: string; validUntil?: string }
      saveCheck(v.id, 'go', { valid: d.valid, validUntil: d.validUntil, checkedAt: today, message: d.message })
    } catch {
      saveCheck(v.id, 'go', { valid: false, checkedAt: today, message: 'Грешка при проверката.' })
    } finally {
      setGoLoading(false)
    }
  }

  const checkGTP = async () => {
    setGtpLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('check-gtp', { body: { plate: plateForApi(v.plate ?? '') }, region: CHECK_REGION })
      if (error) throw error
      const d = data as { valid: boolean; message: string; validUntil?: string }
      saveCheck(v.id, 'gtp', { valid: d.valid, validUntil: d.validUntil, checkedAt: today, message: d.message })
    } catch {
      saveCheck(v.id, 'gtp', { valid: false, checkedAt: today, message: 'Грешка при проверката.' })
    } finally {
      setGtpLoading(false)
    }
  }

  const checkVignette = async () => {
    setVignetteLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('check-vignette', { body: { plate: plateForApi(v.plate ?? ''), country: 'BG' }, region: CHECK_REGION })
      if (error) throw error
      const d = data as { valid: boolean; message: string; validUntil?: string }
      saveCheck(v.id, 'vignette', { valid: d.valid, validUntil: d.validUntil, checkedAt: today, message: d.message })
    } catch {
      saveCheck(v.id, 'vignette', { valid: false, checkedAt: today, message: 'Грешка при проверката.' })
    } finally {
      setVignetteLoading(false)
    }
  }

  const checkDelict = async () => {
    if (!egnInput.trim()) return
    setShowEgnModal(false)
    setDelictLoading(true)
    const r = await runDelictCheck(v.plate ?? '', egnInput.trim())
    saveCheck(v.id, 'delict', r)
    setDelictLoading(false)
    setEgnInput('')
  }

  const checkKATWith = async (egn: string, license: string) => {
    setKatLoading(true)
    const r = await runKatCheck(egn, license)
    saveCheck(v.id, 'kat', r)
    setKatLoading(false)
  }

  /** „Провери" за КАТ: ако книжката вече е попълнена — директно, иначе отваря формата. */
  const onCheckKAT = () => {
    if (hasDriverCreds) checkKATWith(driverProfile!.egn, driverProfile!.license)
    else openDriverModal(true)
  }

  const cards = [
    {
      key: 'go' as const,
      title: 'Гражданска отговорност',
      color: ENTRY_COLORS.expense,
      loading: goLoading,
      onCheck: checkGO,
      formatSub: (r: typeof checks.go) =>
        r ? (r.valid && r.validUntil ? `Валидна до ${r.validUntil}` : r.valid ? 'Валидна' : r.message.startsWith('Грешка') ? r.message : 'Няма валидна застраховка') : v.plate || 'Натисни Провери',
    },
    {
      key: 'gtp' as const,
      title: 'Технически преглед',
      color: ENTRY_COLORS.service,
      loading: gtpLoading,
      onCheck: checkGTP,
      formatSub: (r: typeof checks.gtp) =>
        r ? (r.valid && r.validUntil ? `Валиден до ${r.validUntil}` : r.valid ? 'Валиден' : r.message.startsWith('Грешка') ? r.message : 'Няма валиден ГТП') : v.plate || 'Натисни Провери',
    },
    {
      key: 'vignette' as const,
      title: 'Електронна винетка',
      color: 'var(--brand)',
      loading: vignetteLoading,
      onCheck: checkVignette,
      formatSub: (r: typeof checks.vignette) =>
        r ? (r.valid && r.validUntil ? `Валидна до ${r.validUntil}` : r.valid ? 'Валидна' : r.message.startsWith('Грешка') ? r.message : 'Няма валидна винетка') : v.plate || 'Натисни Провери',
    },
    {
      key: 'delict' as const,
      title: 'Глоби BGToll',
      color: ENTRY_COLORS.odometer,
      loading: delictLoading,
      onCheck: () => { setEgnInput(driverProfile?.egn ?? ''); setShowEgnModal(true) },
      formatSub: (r: typeof checks.delict) =>
        r ? r.message : v.plate || 'Натисни Провери',
    },
    {
      key: 'kat' as const,
      title: 'Глоби КАТ (МВР)',
      color: '#1976d2',
      loading: katLoading,
      onCheck: onCheckKAT,
      formatSub: (r: typeof checks.kat) =>
        r ? r.message : 'Натисни Провери',
    },
  ]

  const driverReady = driverEgn.trim().length > 0 && driverLicense.trim().length > 0

  // Статус на „Шофьорска книжка" картата
  const licenseStatus = driverLicenseStatus(driverProfile?.licenseValidUntil)
  const licenseSub = (() => {
    if (licenseStatus === 'missing') return 'Няма въведени данни'
    const span = dateSpanUntil(driverProfile!.licenseValidUntil!)
    const formatted = dateShort(driverProfile!.licenseValidUntil!)
    if (!span) return formatted
    return licenseStatus === 'valid'
      ? `До ${formatted} · остават ${formatSpan(span)}`
      : `Изтекла на ${formatted} · преди ${formatSpan(span)}`
  })()

  return (
    <div className={styles.wrap}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => go('dashboard')}>← Табло</button>
        <span className={styles.title}>Проверки</span>
      </div>

      <div
        className={`${styles.card} ${licenseStatus === 'valid' ? styles.cardValid : licenseStatus === 'expired' ? styles.cardInvalid : ''}`}
        style={{ borderLeftColor: ENTRY_COLORS.reminder }}
      >
        <div className={styles.cardInfo}>
          <span className={styles.cardTitle}>Шофьорска книжка</span>
          <span className={styles.cardSub}>{licenseSub}</span>
        </div>
        <button
          className={styles.cardBtn}
          onClick={() => openDriverModal(false)}
          style={{ background: ENTRY_COLORS.reminder }}
        >
          {driverProfile ? 'Редактирай' : 'Добави'}
        </button>
      </div>

      {cards.map(({ key, title, color, loading, onCheck, formatSub }) => {
        const r = checks[key]
        const valid = r?.valid
        return (
          <div
            key={key}
            className={`${styles.card} ${r ? (valid ? styles.cardValid : styles.cardInvalid) : ''}`}
            style={{ borderLeftColor: color }}
          >
            <div className={styles.cardInfo}>
              <span className={styles.cardTitle}>{title}</span>
              <span className={styles.cardSub}>
                {loading ? 'Проверява...' : formatSub(r)}
              </span>
              {r && (
                <span className={styles.cardCheckedAt}>
                  Проверено на {dateShort(r.checkedAt)}
                </span>
              )}
              {key === 'vignette' && r?.valid && (
                <button
                  className={styles.addExpenseLink}
                  onClick={() =>
                    openForm({
                      type: 'expense',
                      entry: null,
                      draft: { category: 'Винетка', vignetteValidUntil: toISODate(r.validUntil) },
                    })
                  }
                >
                  + Добави като разход
                </button>
              )}
            </div>
            <button
              className={styles.cardBtn}
              onClick={onCheck}
              disabled={loading}
              style={{ background: color }}
            >
              {loading ? '…' : r ? 'Обнови' : 'Провери'}
            </button>
          </div>
        )
      })}

      <div className={styles.card} style={{ borderLeftColor: '#1976d2' }}>
        <div className={styles.cardInfo}>
          <span className={styles.cardTitle}>Автоматична проверка за глоби</span>
          <span className={styles.cardSub} style={{ whiteSpace: 'normal' }}>
            {hasDriverCreds
              ? 'КАТ и BGToll — веднъж дневно при отваряне'
              : 'Първо попълни „Шофьорска книжка"'}
          </span>
        </div>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={autoCheckFines}
            disabled={!hasDriverCreds}
            onChange={(e) => handleAutoToggle(e.target.checked)}
          />
          <span className={styles.toggleSlider} />
        </label>
      </div>

      <Modal
        open={showEgnModal}
        title="Провери глоби BGToll"
        onClose={() => setShowEgnModal(false)}
        color={ENTRY_COLORS.odometer}
        footer={
          <button
            style={{
              flex: 1,
              padding: 15,
              borderRadius: 14,
              background: egnInput.trim() ? ENTRY_COLORS.odometer : 'var(--surface-3)',
              color: egnInput.trim() ? '#fff' : 'var(--faint)',
              fontWeight: 700,
            }}
            onClick={checkDelict}
            disabled={!egnInput.trim()}
          >
            Провери
          </button>
        }
      >
        <p style={{ marginBottom: 12, color: 'var(--text-2)', fontSize: 14 }}>
          Въведи ЕГН или ЕИК за проверка на <strong>{v.plate}</strong>.
          ЕГН не се записва в приложението.
        </p>
        <input
          className={inputClass}
          type="text"
          inputMode="numeric"
          placeholder="ЕГН или ЕИК"
          value={egnInput}
          onChange={(e) => setEgnInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && checkDelict()}
        />
      </Modal>

      <Modal
        open={showDriverModal}
        title="Шофьорска книжка"
        onClose={() => setShowDriverModal(false)}
        color={ENTRY_COLORS.reminder}
        footer={
          <button
            style={{
              flex: 1,
              padding: 15,
              borderRadius: 14,
              background: driverReady ? ENTRY_COLORS.reminder : 'var(--surface-3)',
              color: driverReady ? '#fff' : 'var(--faint)',
              fontWeight: 700,
            }}
            onClick={saveDriverProfile}
            disabled={!driverReady}
          >
            Запази
          </button>
        }
      >
        <p style={{ marginBottom: 12, color: 'var(--text-2)', fontSize: 14 }}>
          Данните се пазят само в този браузър — не в облака, не в бекъпа.
          {driverThenCheckKat && ' Използват се за проверка на глоби КАТ (e-uslugi.mvr.bg).'}
        </p>
        <Field label="Имена">
          <input className={inputClass} type="text" value={driverName} onChange={(e) => setDriverName(e.target.value)} style={{ marginBottom: 10 }} />
        </Field>
        <Field label="ЕГН">
          <input className={inputClass} type="text" inputMode="numeric" value={driverEgn} onChange={(e) => setDriverEgn(e.target.value)} style={{ marginBottom: 10 }} />
        </Field>
        <Field label="Номер на книжка (СУМПС)">
          <input className={inputClass} type="text" value={driverLicense} onChange={(e) => setDriverLicense(e.target.value)} style={{ marginBottom: 10 }} />
        </Field>
        <Field label="Валидна до (по избор)">
          <input className={inputClass} type="date" value={driverValidUntil} onChange={(e) => setDriverValidUntil(e.target.value)} />
        </Field>
        <div className={styles.infoBox}>
          Данните, които изискваме, са необходими от системата на МВР. Твоите данни НЕ се записват в нашата база от данни.{' '}
          <span style={{ wordBreak: 'break-all' }}>https://e-uslugi.mvr.bg/services/kat-obligations</span>
        </div>
      </Modal>
    </div>
  )
}

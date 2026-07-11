import { useState } from 'react'
import styles from './ChecksPage.module.css'
import { useActiveVehicle, useStore } from '../../store/useStore'
import type { Tab } from '../../components/Layout/BottomNav'
import { supabase } from '../../lib/supabase'
import { Modal } from '../../components/ui/Modal'
import { inputClass } from '../../components/ui/Field'
import { dateShort } from '../../lib/format'
import { ENTRY_COLORS } from '../../types'
import { useUI } from '../../store/useUI'
import { plateForApi } from '../../lib/plate'

/** „YYYY-MM-DD" или „дд.мм.гггг" → ISO дата; при неуспех undefined. */
function toISODate(s: string | undefined): string | undefined {
  if (!s) return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return undefined
}

export function ChecksPage({ go }: { go: (t: Tab) => void }) {
  const openForm = useUI((s) => s.openForm)
  const v = useActiveVehicle()
  const vehicleChecks = useStore((s) => s.vehicleChecks)
  const saveCheck = useStore((s) => s.saveCheck)
  const katCredentials = useStore((s) => s.katCredentials)
  const setKatCredentials = useStore((s) => s.setKatCredentials)

  const [goLoading, setGoLoading] = useState(false)
  const [gtpLoading, setGtpLoading] = useState(false)
  const [vignetteLoading, setVignetteLoading] = useState(false)
  const [delictLoading, setDelictLoading] = useState(false)
  const [katLoading, setKatLoading] = useState(false)

  const [showEgnModal, setShowEgnModal] = useState(false)
  const [egnInput, setEgnInput] = useState('')

  const [showKatModal, setShowKatModal] = useState(false)
  const [katEgn, setKatEgn] = useState('')
  const [katLicense, setKatLicense] = useState('')
  const [saveKat, setSaveKat] = useState(false)

  if (!v) return null

  const checks = vehicleChecks[v.id] ?? {}
  const today = new Date().toISOString().slice(0, 10)

  const openKatModal = () => {
    setKatEgn(katCredentials?.egn ?? '')
    setKatLicense(katCredentials?.license ?? '')
    setSaveKat(katCredentials !== null)
    setShowKatModal(true)
  }

  const handleKatToggle = (on: boolean) => {
    setSaveKat(on)
    if (!on) setKatCredentials(null)
  }

  const closeKatModal = () => {
    setShowKatModal(false)
    setKatEgn('')
    setKatLicense('')
  }

  const checkGO = async () => {
    setGoLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('check-go', { body: { plate: plateForApi(v.plate ?? '') } })
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
      const { data, error } = await supabase.functions.invoke('check-gtp', { body: { plate: plateForApi(v.plate ?? '') } })
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
      const { data, error } = await supabase.functions.invoke('check-vignette', { body: { plate: plateForApi(v.plate ?? ''), country: 'BG' } })
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
    try {
      const { data, error } = await supabase.functions.invoke('check-delict', {
        body: { plate: plateForApi(v.plate ?? ''), egn: egnInput.trim(), country: 'BG' },
      })
      if (error) throw error
      const d = data as { hasDelicts: boolean; count: number; message: string }
      saveCheck(v.id, 'delict', { valid: !d.hasDelicts, checkedAt: today, message: d.message })
    } catch {
      saveCheck(v.id, 'delict', { valid: false, checkedAt: today, message: 'Грешка при проверката.' })
    } finally {
      setDelictLoading(false)
      setEgnInput('')
    }
  }

  const checkKAT = async () => {
    if (!katEgn.trim() || !katLicense.trim()) return
    const egnVal = katEgn.trim()
    const licVal = katLicense.trim()
    if (saveKat) setKatCredentials({ egn: egnVal, license: licVal })
    closeKatModal()
    setKatLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('check-kat', {
        body: { egn: egnVal, license: licVal },
      })
      if (error) throw error
      const d = data as { hasObligations: boolean; count: number; message: string }
      saveCheck(v.id, 'kat', { valid: !d.hasObligations, checkedAt: today, message: d.message })
    } catch {
      saveCheck(v.id, 'kat', { valid: false, checkedAt: today, message: 'Грешка при проверката.' })
    } finally {
      setKatLoading(false)
    }
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
      onCheck: () => setShowEgnModal(true),
      formatSub: (r: typeof checks.delict) =>
        r ? r.message : v.plate || 'Натисни Провери',
    },
    {
      key: 'kat' as const,
      title: 'Глоби КАТ (МВР)',
      color: '#1976d2',
      loading: katLoading,
      onCheck: openKatModal,
      formatSub: (r: typeof checks.kat) =>
        r ? r.message : 'Натисни Провери',
    },
  ]

  const katReady = katEgn.trim().length > 0 && katLicense.trim().length > 0

  return (
    <div className={styles.wrap}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => go('dashboard')}>← Табло</button>
        <span className={styles.title}>Проверки</span>
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
        open={showKatModal}
        title="Провери глоби КАТ"
        onClose={closeKatModal}
        color="#1976d2"
        footer={
          <button
            style={{
              flex: 1,
              padding: 15,
              borderRadius: 14,
              background: katReady ? '#1976d2' : 'var(--surface-3)',
              color: katReady ? '#fff' : 'var(--faint)',
              fontWeight: 700,
            }}
            onClick={checkKAT}
            disabled={!katReady}
          >
            Провери
          </button>
        }
      >
        <p style={{ marginBottom: 12, color: 'var(--text-2)', fontSize: 14 }}>
          Въведи ЕГН и номер на СУМПС. Данните не се записват в облака.
        </p>
        <input
          className={inputClass}
          type="text"
          inputMode="numeric"
          placeholder="ЕГН"
          value={katEgn}
          onChange={(e) => setKatEgn(e.target.value)}
          style={{ marginBottom: 10 }}
        />
        <input
          className={inputClass}
          type="text"
          placeholder="Номер на СУМПС"
          value={katLicense}
          onChange={(e) => setKatLicense(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && checkKAT()}
        />
        <div className={styles.saveRow}>
          <span>Запази данните на твоето устройство за следваща проверка</span>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={saveKat}
              onChange={(e) => handleKatToggle(e.target.checked)}
            />
            <span className={styles.toggleSlider} />
          </label>
        </div>
        <div className={styles.infoBox}>
          Данните, които изискваме, са необходими от системата на МВР. Твоите данни НЕ се записват в нашата база от данни.{' '}
          <span style={{ wordBreak: 'break-all' }}>https://e-uslugi.mvr.bg/services/kat-obligations</span>
        </div>
      </Modal>
    </div>
  )
}

import { useState, useRef } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Field, Row, inputClass, selectClass, textareaClass, Toggle, Segmented, CheckGroup } from '../../components/ui/Field'
import { FormFooter } from '../../components/ui/FormFooter'
import { useStore } from '../../store/useStore'
import { todayISO, todayDateISO, toNumStr } from '../../lib/format'
import { EXPENSE_CATEGORIES, type Expense, type ExpenseKind, type ReminderBasis } from '../../types'
import { ImageLightbox } from '../../components/ui/ImageLightbox'
import styles from './ExpenseForm.module.css'

const INSURANCE_TYPES = ['Гражданска отговорност', 'Каско']

const DEFAULT_INSURERS = [
  'Алианц България', 'Армеец', 'Булстрад', 'ДЗИ', 'Евроинс',
  'Generali', 'Лев Инс', 'ОЗК', 'Уника', 'Хелвеция',
]

const INSTALLMENT_OPTIONS = [
  { value: 1, label: 'Една вноска' },
  { value: 2, label: 'Две вноски' },
  { value: 3, label: 'Три вноски' },
  { value: 4, label: 'Четири вноски' },
]

const addMonths = (iso: string, months: number): string => {
  const d = new Date(iso + 'T00:00:00')
  d.setMonth(d.getMonth() + months)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const installmentDates = (n: number, baseDate: string): string[] => {
  const interval = Math.round(12 / n)
  return Array.from({ length: n }, (_, i) => addMonths(baseDate, i * interval))
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 1000
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.75))
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}

export function ExpenseForm({
  vehicleId,
  edit,
  mode,
  onClose,
}: {
  vehicleId: string
  edit: Expense | null
  mode: ExpenseKind
  onClose: () => void
}) {
  const addExpense = useStore((s) => s.addExpense)
  const updateExpense = useStore((s) => s.updateExpense)
  const removeExpense = useStore((s) => s.removeExpense)
  const addReminder = useStore((s) => s.addReminder)
  const removeReminder = useStore((s) => s.removeReminder)
  const reminders = useStore((s) => s.reminders)
  const serviceShops = useStore((s) => s.serviceShops)
  const addServiceShop = useStore((s) => s.addServiceShop)

  const kind: ExpenseKind = edit?.kind ?? mode
  const cats = EXPENSE_CATEGORIES.filter((c) => c.kind === kind)

  const [date, setDate] = useState((edit?.date ?? todayISO()).slice(0, 10))
  const [categoryId, setCategoryId] = useState(
    edit ? EXPENSE_CATEGORIES.find((c) => c.label === edit.category)?.id ?? '' : ''
  )
  const [cost, setCost] = useState(edit ? String(edit.cost) : '')
  const [odometer, setOdometer] = useState(edit?.odometer ? String(edit.odometer) : '')
  const [place, setPlace] = useState(edit?.place ?? '')
  const [notes, setNotes] = useState(edit?.notes ?? '')
  const [receiptImage, setReceiptImage] = useState(edit?.receiptImage ?? '')
  const [showLightbox, setShowLightbox] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Service shop dropdown
  const initShopPick = () => {
    if (!edit?.place) return ''
    return serviceShops.includes(edit.place) ? edit.place : '__new__'
  }
  const [shopPick, setShopPick] = useState(initShopPick)
  const [shopText, setShopText] = useState(
    edit?.place && !serviceShops.includes(edit.place) ? edit.place : ''
  )

  // Insurance specific
  const [insuranceType, setInsuranceType] = useState(edit?.insuranceType ?? INSURANCE_TYPES[0])
  const [insuranceInstallments, setInsuranceInstallments] = useState(edit?.insuranceInstallments ?? 1)
  const [insurerPick, setInsurerPick] = useState<string>(
    edit?.insuranceCompany
      ? (DEFAULT_INSURERS.includes(edit.insuranceCompany) ? edit.insuranceCompany : '__new__')
      : ''
  )
  const [insurerText, setInsurerText] = useState(
    edit?.insuranceCompany && !DEFAULT_INSURERS.includes(edit.insuranceCompany) ? edit.insuranceCompany : ''
  )
  const insuranceCompany = insurerPick === '__new__' ? insurerText : insurerPick

  interface InstallmentRow { amount: string; dueDate: string; paid: boolean }
  const initInstallments = (): InstallmentRow[] => {
    if (edit?.installments?.length) {
      return edit.installments.map((inst) => ({ amount: String(inst.amount), dueDate: inst.dueDate ?? '', paid: inst.paid }))
    }
    const n = typeof edit?.insuranceInstallments === 'number' ? edit.insuranceInstallments : 1
    const amt = edit ? (edit.cost / n).toFixed(2) : ''
    const dates = edit ? Array(n).fill('') : installmentDates(n, todayDateISO())
    return Array.from({ length: n }, (_, i) => ({ amount: amt, dueDate: dates[i], paid: false }))
  }
  const [installments, setInstallments] = useState<InstallmentRow[]>(initInstallments)
  const installmentTotal = installments.reduce((s, r) => s + (parseFloat(toNumStr(r.amount)) || 0), 0)

  const handleInstallmentsChange = (n: number) => {
    setInsuranceInstallments(n)
    setInstallments((prev) => {
      const baseDate = prev[0]?.dueDate || todayDateISO()
      const dates = installmentDates(n, baseDate)
      return Array.from({ length: n }, (_, i) => ({
        amount: prev[i]?.amount ?? '',
        dueDate: dates[i],
        paid: prev[i]?.paid ?? false,
      }))
    })
  }

  // Oil change specific
  const [oilType, setOilType] = useState(edit?.oilType ?? '')
  const [oilFilter, setOilFilter] = useState(edit?.oilFilterChanged ?? false)
  const [fuelFilter, setFuelFilter] = useState(edit?.fuelFilterChanged ?? false)
  const [airFilter, setAirFilter] = useState(edit?.airFilterChanged ?? false)

  // Inline reminder (само при нов запис)
  const [enableReminder, setEnableReminder] = useState(false)
  const [reminderBasis, setReminderBasis] = useState<ReminderBasis>('odometer')
  const [reminderDate, setReminderDate] = useState('')
  const [reminderOdo, setReminderOdo] = useState('')
  const [reminderMonths, setReminderMonths] = useState('')
  const [reminderKm, setReminderKm] = useState('')

  const cat = EXPENSE_CATEGORIES.find((c) => c.id === categoryId)
  const isOil = cat?.id === 'oil'
  const isInsurance = cat?.id === 'insurance'
  const showReminderDate = reminderBasis === 'date' || reminderBasis === 'both'
  const showReminderOdo = reminderBasis === 'odometer' || reminderBasis === 'both'

  const valid = !!cat && (isInsurance ? installmentTotal > 0 : Number(cost) > 0)

  const submit = () => {
    if (!cat || !valid) return

    const shopValue = mode === 'service'
      ? (shopPick === '__new__' ? shopText.trim() : shopPick)
      : place.trim()

    if (mode === 'service' && shopPick === '__new__' && shopText.trim()) {
      addServiceShop(shopText.trim())
    }

    const payload = {
      vehicleId,
      date: date,
      kind: cat.kind,
      category: cat.label,
      title: undefined,
      cost: isInsurance
        ? installments.reduce((s, r) => s + (r.paid ? parseFloat(toNumStr(r.amount)) || 0 : 0), 0)
        : Number(cost),
      odometer: Number(odometer) || undefined,
      place: shopValue || undefined,
      notes: notes.trim() || undefined,
      receiptImage: receiptImage || undefined,
      ...(isInsurance && {
        insuranceType,
        insuranceCompany: insuranceCompany.trim() || undefined,
        insuranceInstallments: installments.length,
        installments: installments.map((r) => ({
          amount: parseFloat(toNumStr(r.amount)) || 0,
          dueDate: r.dueDate || undefined,
          paid: r.paid,
        })),
      }),
      ...(isOil && {
        oilType: oilType.trim() || undefined,
        oilFilterChanged: oilFilter || undefined,
        fuelFilterChanged: fuelFilter || undefined,
        airFilterChanged: airFilter || undefined,
      }),
    }
    if (edit) updateExpense(edit.id, payload)
    else addExpense(payload)

    if (isInsurance && !edit) {
      const withDates = installments.filter((r) => !!r.dueDate && !r.paid)
      withDates.forEach((inst, i) => {
        const label = withDates.length === 1 ? 'Вноска' : `Вноска ${i + 1}`
        const company = insuranceCompany.trim()
        addReminder({
          vehicleId,
          title: `${label} по ${insuranceType}${company ? ` – ${company}` : ''}`,
          basis: 'date',
          dueDate: inst.dueDate,
          done: false,
        })
      })
    }

    if (isInsurance && edit) {
      const prevInst = edit.installments ?? []
      installments.forEach((inst, i) => {
        const wasPaid = prevInst[i]?.paid ?? false
        if (inst.paid && !wasPaid && inst.dueDate) {
          const match = reminders.find(
            (r) => r.vehicleId === vehicleId && r.dueDate === inst.dueDate && !r.done
          )
          if (match) removeReminder(match.id)
        }
      })
    }

    if (isOil && !edit && enableReminder) {
      addReminder({
        vehicleId,
        title: 'Смяна на масло',
        basis: reminderBasis,
        dueDate: showReminderDate ? reminderDate || undefined : undefined,
        dueOdometer: showReminderOdo ? Number(reminderOdo) || undefined : undefined,
        repeatMonths: Number(reminderMonths) || undefined,
        repeatKm: Number(reminderKm) || undefined,
        done: false,
      })
    }

    onClose()
  }

  const title0 = kind === 'service' ? 'услуга / сервиз' : 'разход'
  const formColor = kind === 'service' ? '#7a5c4a' : '#ec5b53'

  const receiptSection = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (file) setReceiptImage(await compressImage(file))
          e.target.value = ''
        }}
      />
      <div className={styles.receiptSection}>
        {receiptImage ? (
          <div className={styles.receiptPreview}>
            <img
              src={receiptImage}
              className={styles.receiptThumb}
              alt="Касова бележка"
              onClick={() => setShowLightbox(true)}
            />
            <button type="button" className={styles.receiptRemove} onClick={() => setReceiptImage('')}>✕</button>
            <button type="button" className={styles.receiptChange} onClick={() => fileInputRef.current?.click()}>Смени</button>
          </div>
        ) : (
          <button type="button" className={styles.receiptBtn} onClick={() => fileInputRef.current?.click()}>
            Прикачи бележка
          </button>
        )}
      </div>
      {showLightbox && <ImageLightbox src={receiptImage} onClose={() => setShowLightbox(false)} />}
    </>
  )

  return (
    <Modal
      open
      title={edit ? `Редакция на ${title0}` : `Нов ${title0}`}
      color={formColor}
      onClose={onClose}
      footer={<FormFooter valid={valid} edit={!!edit} onSubmit={submit} onDelete={edit ? () => { removeExpense(edit.id); onClose() } : undefined} deleteMsg="Изтриване на записа?" color={formColor} />}
    >
      {mode === 'service' ? (
        <>
          {/* 1. Дата + Километраж */}
          <Row>
            <Field label="Дата">
              <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Километраж (по избор)">
              <input className={inputClass} inputMode="numeric" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="0" />
            </Field>
          </Row>

          {/* 2. Вид услуга + Сума */}
          <Row>
            <Field label="Вид услуга">
              <select className={selectClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">— изберете —</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Сума (€)">
              <input className={inputClass} inputMode="decimal" value={cost} onChange={(e) => setCost(toNumStr(e.target.value))} placeholder="0.00" />
            </Field>
          </Row>

          {/* 3-5. Oil-specific */}
          {isOil && (
            <>
              <Field label="Вид масло (по избор)">
                <input
                  className={inputClass}
                  value={oilType}
                  onChange={(e) => setOilType(e.target.value)}
                  placeholder="напр. 5W-40 синтетично"
                />
              </Field>
              <Field label="Сменени филтри">
                <CheckGroup
                  items={[
                    { label: 'Маслен филтър', checked: oilFilter, onChange: setOilFilter },
                    { label: 'Горивен филтър', checked: fuelFilter, onChange: setFuelFilter },
                    { label: 'Въздушен филтър', checked: airFilter, onChange: setAirFilter },
                  ]}
                />
              </Field>
              {!edit && (
                <>
                  <Toggle checked={enableReminder} onChange={setEnableReminder} label="Добави напомняне" />
                  {enableReminder && (
                    <>
                      <Field label="Напомни по">
                        <Segmented
                          value={reminderBasis}
                          onChange={setReminderBasis}
                          options={[
                            { value: 'date', label: 'Дата' },
                            { value: 'odometer', label: 'Километраж' },
                            { value: 'both', label: 'И двете' },
                          ]}
                        />
                      </Field>
                      {showReminderDate && (
                        <Field label="Дата на следваща смяна">
                          <input className={inputClass} type="date" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} />
                        </Field>
                      )}
                      {showReminderOdo && (
                        <Field label="Километраж на следваща смяна">
                          <input className={inputClass} inputMode="numeric" value={reminderOdo} onChange={(e) => setReminderOdo(e.target.value)} placeholder="0" />
                        </Field>
                      )}
                      <Row>
                        <Field label="Повтаряй (месеци)" hint="по избор">
                          <input className={inputClass} inputMode="numeric" value={reminderMonths} onChange={(e) => setReminderMonths(e.target.value)} placeholder="12" />
                        </Field>
                        <Field label="Повтаряй (км)" hint="по избор">
                          <input className={inputClass} inputMode="numeric" value={reminderKm} onChange={(e) => setReminderKm(e.target.value)} placeholder="15000" />
                        </Field>
                      </Row>
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* 6. Сервиз */}
          <Field label="Сервиз (по избор)">
            {shopPick !== '__new__' ? (
              <select
                className={selectClass}
                value={shopPick}
                onChange={(e) => setShopPick(e.target.value)}
              >
                <option value="">— изберете или добавете —</option>
                {serviceShops.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
                <option value="__new__">+ Добави нов сервиз...</option>
              </select>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  className={inputClass}
                  style={{ flex: 1 }}
                  value={shopText}
                  onChange={(e) => setShopText(e.target.value)}
                  placeholder="напр. Автосервиз Иванов"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => { setShopPick(''); setShopText('') }}
                  style={{ fontSize: 18, color: 'var(--muted)', padding: '0 4px' }}
                >✕</button>
              </div>
            )}
          </Field>

          {/* 7. Бележка */}
          <Field label="Бележка (по избор)">
            <textarea className={textareaClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>

          {/* 8. Касова бележка */}
          {receiptSection}
        </>
      ) : (
        <>
          {/* 1. Дата + Километраж */}
          {!isInsurance ? (
            <Row>
              <Field label="Дата">
                <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Километраж (по избор)">
                <input className={inputClass} inputMode="numeric" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="0" />
              </Field>
            </Row>
          ) : (
            <Field label="Дата">
              <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          )}

          {/* 2. Категория */}
          <Field label="Категория">
            <select className={selectClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">— изберете —</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </Field>

          {/* 3. Сума (не за застраховка) */}
          {!isInsurance && (
            <Field label="Сума (€)">
              <input className={inputClass} inputMode="decimal" value={cost} onChange={(e) => setCost(toNumStr(e.target.value))} placeholder="0.00" />
            </Field>
          )}

          {/* Insurance specific */}
          {isInsurance && (
            <>
              <Row>
                <Field label="Вид застраховка">
                  <select className={selectClass} value={insuranceType} onChange={(e) => setInsuranceType(e.target.value)}>
                    {INSURANCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Застрахователна компания">
                  {insurerPick !== '__new__' ? (
                    <select className={selectClass} value={insurerPick} onChange={(e) => setInsurerPick(e.target.value)}>
                      <option value=""></option>
                      {DEFAULT_INSURERS.map((c) => <option key={c} value={c}>{c}</option>)}
                      <option value="__new__">+ Добави друга...</option>
                    </select>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input className={inputClass} style={{ flex: 1 }} value={insurerText}
                        onChange={(e) => setInsurerText(e.target.value)} placeholder="напр. Дженерали" autoFocus />
                      <button type="button" onClick={() => { setInsurerPick(''); setInsurerText('') }}
                        style={{ fontSize: 18, color: 'var(--muted)', padding: '0 4px' }}>✕</button>
                    </div>
                  )}
                </Field>
              </Row>
              <Row>
                <Field label="Брой вноски">
                  <select className={selectClass} value={insuranceInstallments}
                    onChange={(e) => handleInstallmentsChange(Number(e.target.value))}>
                    {INSTALLMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="Километраж (по избор)">
                  <input className={inputClass} inputMode="numeric" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="0" />
                </Field>
              </Row>
              {installments.map((inst, i) => (
                <Row key={i} cols="1fr 1fr auto">
                  <Field label={installments.length === 1 ? 'Сума (€)' : `Вноска ${i + 1} (€)`}>
                    <input
                      className={inputClass}
                      inputMode="decimal"
                      value={inst.amount}
                      onChange={(e) => { const next = [...installments]; next[i] = { ...next[i], amount: toNumStr(e.target.value) }; setInstallments(next) }}
                      placeholder="0.00"
                    />
                  </Field>
                  <Field label="Изтича на">
                    <input
                      className={inputClass}
                      type="date"
                      value={inst.dueDate}
                      onChange={(e) => { const next = [...installments]; next[i] = { ...next[i], dueDate: e.target.value }; setInstallments(next) }}
                    />
                  </Field>
                  <div className={styles.paidCell}>
                    <span className={styles.paidLabel}>Платено</span>
                    <Toggle
                      checked={inst.paid}
                      onChange={(v) => { const next = [...installments]; next[i] = { ...next[i], paid: v }; setInstallments(next) }}
                      label=""
                    />
                  </div>
                </Row>
              ))}
            </>
          )}

          <Field label="Място (по избор)">
            <input className={inputClass} value={place} onChange={(e) => setPlace(e.target.value)} />
          </Field>
          <Field label="Бележка (по избор)">
            <textarea className={textareaClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          {receiptSection}
        </>
      )}
    </Modal>
  )
}

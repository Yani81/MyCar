import { useState, useRef } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Field, Row, inputClass, selectClass, textareaClass, Toggle, Segmented, CheckGroup } from '../../components/ui/Field'
import { FormFooter } from '../../components/ui/FormFooter'
import { useStore } from '../../store/useStore'
import { todayISO, todayDateISO, toNumStr } from '../../lib/format'
import { advanceReminderPatch } from '../../lib/calculations'
import { EXPENSE_CATEGORIES, ENTRY_COLORS, TIRE_LABELS, type Expense, type ExpenseKind, type ReminderBasis, type TireType } from '../../types'
import { ImageLightbox } from '../../components/ui/ImageLightbox'
import { processReceipt } from '../../lib/image'
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

export function ExpenseForm({
  vehicleId,
  edit,
  draft,
  mode,
  onClose,
}: {
  vehicleId: string
  edit: Expense | null
  draft?: Partial<Expense>
  mode: ExpenseKind
  onClose: () => void
}) {
  const addExpense = useStore((s) => s.addExpense)
  const updateExpense = useStore((s) => s.updateExpense)
  const removeExpense = useStore((s) => s.removeExpense)
  const addReminder = useStore((s) => s.addReminder)
  const updateReminder = useStore((s) => s.updateReminder)
  const removeReminder = useStore((s) => s.removeReminder)
  const reminders = useStore((s) => s.reminders)
  const allRefuels = useStore((s) => s.refuels)
  const allReadings = useStore((s) => s.readings)
  const serviceShops = useStore((s) => s.serviceShops)
  const addServiceShop = useStore((s) => s.addServiceShop)
  const serviceCategories = useStore((s) => s.serviceCategories)
  const addServiceCategory = useStore((s) => s.addServiceCategory)

  const kind: ExpenseKind = edit?.kind ?? mode
  const cats = EXPENSE_CATEGORIES.filter((c) => c.kind === kind)

  const [date, setDate] = useState((edit?.date ?? todayISO()).slice(0, 10))
  const [categoryId, setCategoryId] = useState(() => {
    if (!edit) return draft?.category ? EXPENSE_CATEGORIES.find((c) => c.label === draft.category)?.id ?? '' : ''
    // Стари записи с преименувани категории сочат новите вградени
    const builtin = EXPENSE_CATEGORIES.find(
      (c) =>
        c.label === edit.category ||
        (c.id === 'service' && edit.category === 'Сервиз') ||
        (c.id === 'tax' && edit.category === 'Данък / винетка')
    )?.id
    if (builtin) return builtin
    return serviceCategories.includes(edit.category) ? `custom:${edit.category}` : '__newcat__'
  })
  const [newCatText, setNewCatText] = useState(
    edit && !EXPENSE_CATEGORIES.some((c) => c.label === edit.category) && !serviceCategories.includes(edit.category)
      ? edit.category
      : ''
  )
  const [title, setTitle] = useState(edit?.title ?? '')
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

  // Vignette specific
  const [vignetteValid, setVignetteValid] = useState(edit?.vignetteValidUntil ?? draft?.vignetteValidUntil ?? '')

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
  const [cabinFilter, setCabinFilter] = useState(edit?.cabinFilterChanged ?? false)

  // Tires specific
  const [tireType, setTireType] = useState<TireType>(edit?.tireType ?? 'summer')
  const [tireCondition, setTireCondition] = useState<'new' | 'used'>(edit?.tireCondition ?? 'new')
  const [tireBrand, setTireBrand] = useState(edit?.tireBrand ?? '')
  const [tireSize, setTireSize] = useState(edit?.tireSize ?? '')
  const [tireDot, setTireDot] = useState(edit?.tireDot ?? '')

  // Inline reminder (само при нов запис)
  const [enableReminder, setEnableReminder] = useState(false)
  const [reminderBasis, setReminderBasis] = useState<ReminderBasis>('odometer')
  const [reminderDate, setReminderDate] = useState('')
  const [reminderOdo, setReminderOdo] = useState('')
  const [reminderMonths, setReminderMonths] = useState('')
  const [reminderKm, setReminderKm] = useState('')

  const builtinCat = EXPENSE_CATEGORIES.find((c) => c.id === categoryId)
  const customLabel = categoryId.startsWith('custom:')
    ? categoryId.slice('custom:'.length)
    : categoryId === '__newcat__'
      ? newCatText.trim()
      : ''
  const cat = builtinCat ?? (customLabel ? { id: categoryId, label: customLabel, kind } : undefined)
  const isOil = cat?.id === 'oil'
  const isTires = cat?.id === 'tires'
  const isGenericRepair = cat?.id === 'service'
  const isInsurance = cat?.id === 'insurance'
  const isVignette = cat?.id === 'vignette'
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

    if (categoryId === '__newcat__' && cat.kind === 'service' && cat.label) {
      addServiceCategory(cat.label)
    }

    const payload = {
      vehicleId,
      date: date,
      kind: cat.kind,
      category: cat.label,
      title: isGenericRepair ? title.trim() || undefined : undefined,
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
        cabinFilterChanged: cabinFilter || undefined,
      }),
      ...(isTires && {
        tireType,
        tireCondition,
        tireBrand: tireBrand.trim() || undefined,
        tireSize: tireSize.trim() || undefined,
        tireDot: tireDot.trim() || undefined,
      }),
      ...(isVignette && {
        vignetteValidUntil: vignetteValid || undefined,
      }),
    }
    if (edit) updateExpense(edit.id, payload)
    else addExpense(payload)

    if (isVignette && !edit && vignetteValid) {
      addReminder({
        vehicleId,
        title: 'Винетката изтича',
        basis: 'date',
        dueDate: vignetteValid,
        done: false,
      })
    }

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
      // Платени вноски: махни напомнянията им (по нова ИЛИ стара дата), при всяко запазване —
      // идемпотентно, чисти и заседнали напомняния от предишни редакции
      installments.forEach((inst, i) => {
        if (!inst.paid) return
        const dates = [inst.dueDate, prevInst[i]?.dueDate].filter(Boolean) as string[]
        reminders
          .filter(
            (r) =>
              r.vehicleId === vehicleId &&
              !r.done &&
              r.title.startsWith('Вноска') &&
              r.title.includes(insuranceType) &&
              dates.includes(r.dueDate ?? '')
          )
          .forEach((r) => removeReminder(r.id))
      })
      // Неплатена вноска с дата без напомняне (нова/сменена дата при редакция) → създай
      const company = insuranceCompany.trim()
      const unpaid = installments.filter((r) => !!r.dueDate && !r.paid)
      unpaid.forEach((inst, i) => {
        const exists = reminders.some(
          (r) => r.vehicleId === vehicleId && !r.done && r.dueDate === inst.dueDate && r.title.startsWith('Вноска')
        )
        if (!exists) {
          addReminder({
            vehicleId,
            title: `${unpaid.length === 1 ? 'Вноска' : `Вноска ${i + 1}`} по ${insuranceType}${company ? ` – ${company}` : ''}`,
            basis: 'date',
            dueDate: inst.dueDate,
            done: false,
          })
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

    // Нова услуга, съвпадаща с активно напомняне → предложи да го приключим
    if (kind === 'service' && !edit) {
      const catLc = cat.label.toLowerCase()
      const match = reminders.find((r) => {
        if (r.vehicleId !== vehicleId || r.done) return false
        const t = r.title.toLowerCase()
        return t.includes(catLc) || catLc.includes(t)
      })
      if (match && confirm(`Да отбележа ли напомнянето „${match.title}" като изпълнено?`)) {
        const odos = [
          Number(odometer) || 0,
          ...allRefuels.filter((x) => x.vehicleId === vehicleId).map((x) => x.odometer),
          ...allReadings.filter((x) => x.vehicleId === vehicleId).map((x) => x.odometer),
        ]
        updateReminder(match.id, advanceReminderPatch(match, Math.max(...odos)))
      }
    }

    onClose()
  }

  const title0 = kind === 'service' ? 'ремонт' : 'разход'
  const formColor = kind === 'service' ? ENTRY_COLORS.service : ENTRY_COLORS.expense

  const receiptSection = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (file) setReceiptImage(await processReceipt(file))
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
            <Field label="Вид">
              <select className={selectClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">— изберете —</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
                {serviceCategories.map((c) => (
                  <option key={c} value={`custom:${c}`}>{c}</option>
                ))}
                <option value="__newcat__">+ Нова категория…</option>
              </select>
            </Field>
            <Field label="Сума (€)">
              <input className={inputClass} inputMode="decimal" value={cost} onChange={(e) => setCost(toNumStr(e.target.value))} placeholder="0.00" />
            </Field>
          </Row>

          {categoryId === '__newcat__' && (
            <Field label="Нова категория">
              <input className={inputClass} value={newCatText} onChange={(e) => setNewCatText(e.target.value)} placeholder="напр. Спирачки" />
            </Field>
          )}

          {isGenericRepair && (
            <Field label="Име">
              <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="напр. Смяна на съединител" />
            </Field>
          )}

          {/* Tires-specific */}
          {isTires && (
            <>
              <Field label="Вид гуми">
                <Segmented
                  value={tireType}
                  onChange={setTireType}
                  color={formColor}
                  options={(Object.keys(TIRE_LABELS) as TireType[]).map((t) => ({ value: t, label: TIRE_LABELS[t] }))}
                />
              </Field>
              <Field label="Състояние">
                <Segmented
                  value={tireCondition}
                  onChange={setTireCondition}
                  color={formColor}
                  options={[
                    { value: 'new', label: 'Нови' },
                    { value: 'used', label: 'Стари' },
                  ]}
                />
              </Field>
              <Row>
                <Field label="Марка гуми (по избор)">
                  <input className={inputClass} value={tireBrand} onChange={(e) => setTireBrand(e.target.value)} placeholder="напр. Michelin" />
                </Field>
                <Field label="Размер (по избор)">
                  <input className={inputClass} value={tireSize} onChange={(e) => setTireSize(e.target.value)} placeholder="205/55 R16" />
                </Field>
              </Row>
              <Field label="DOT (по избор)">
                <input className={inputClass} value={tireDot} onChange={(e) => setTireDot(e.target.value)} placeholder="напр. 2523" />
              </Field>
            </>
          )}

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
                    { label: 'Филтър на купето', checked: cabinFilter, onChange: setCabinFilter },
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
                          color={formColor}
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

          {/* Vignette specific */}
          {isVignette && (
            <Field label="Валидна до" hint="създава напомняне за изтичането">
              <input className={inputClass} type="date" value={vignetteValid} onChange={(e) => setVignetteValid(e.target.value)} />
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

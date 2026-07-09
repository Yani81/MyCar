import { useState, useRef, useMemo } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Field, Row, inputClass, selectClass, Toggle } from '../../components/ui/Field'
import { useStore } from '../../store/useStore'
import { todayISO, km, toNumStr } from '../../lib/format'
import { FUEL_LABELS, FUEL_UNITS, ENTRY_COLORS, type Refuel, type FuelType } from '../../types'
import { FormFooter } from '../../components/ui/FormFooter'
import { ImageLightbox } from '../../components/ui/ImageLightbox'
import { processReceipt } from '../../lib/image'
import styles from './RefuelForm.module.css'

const DEFAULT_STATIONS = [
  'BP', 'ЕКО', 'Газпром', 'Инса Ойл', 'Лукойл',
  'OMV', 'Петрол', 'Ромпетрол', 'Shell', 'Тера',
]

export function RefuelForm({ vehicleId, edit, onClose }: { vehicleId: string; edit: Refuel | null; onClose: () => void }) {
  const vehicle = useStore((s) => s.vehicles.find((v) => v.id === vehicleId))
  const addRefuel = useStore((s) => s.addRefuel)
  const updateRefuel = useStore((s) => s.updateRefuel)
  const removeRefuel = useStore((s) => s.removeRefuel)
  const allRefuels = useStore((s) => s.refuels)
  const allReadings = useStore((s) => s.readings)

  const lastOdo = useMemo(() => {
    const odos = [
      ...allRefuels.filter((r) => r.vehicleId === vehicleId && r.id !== edit?.id).map((r) => r.odometer),
      ...allReadings.filter((r) => r.vehicleId === vehicleId).map((r) => r.odometer),
    ]
    return odos.length ? Math.max(...odos) : null
  }, [allRefuels, allReadings, vehicleId, edit?.id])

  const stationOptions = useMemo(() => {
    const custom = allRefuels
      .filter((r) => r.vehicleId === vehicleId && r.station && !DEFAULT_STATIONS.includes(r.station))
      .map((r) => r.station!)
    return [...new Set([...DEFAULT_STATIONS, ...custom])].sort((a, b) => a.localeCompare(b, 'bg'))
  }, [allRefuels, vehicleId])

  const fuels = vehicle?.fuels ?? ['petrol']
  const [date, setDate] = useState((edit?.date ?? todayISO()).slice(0, 10))
  const [fuelType, setFuelType] = useState<FuelType>(edit?.fuelType ?? fuels[0])
  const [odometer, setOdometer] = useState(edit ? String(edit.odometer) : '')
  const [liters, setLiters] = useState(edit ? String(edit.liters) : '')
  const [price, setPrice] = useState(edit ? String(edit.pricePerLiter) : '')
  const [total, setTotal] = useState(edit ? String(edit.total) : '')
  const [fullTank, setFullTank] = useState(edit?.fullTank ?? true)
  const [missedFill, setMissedFill] = useState(edit?.missedFill ?? false)
  const [stationPick, setStationPick] = useState<string>(
    edit?.station ? (stationOptions.includes(edit.station) ? edit.station : '__new__') : ''
  )
  const [stationText, setStationText] = useState(
    edit?.station && !stationOptions.includes(edit.station) ? edit.station : ''
  )
  const station = stationPick === '__new__' ? stationText : stationPick
  const [notes, setNotes] = useState(edit?.notes ?? '')
  const [receiptImage, setReceiptImage] = useState(edit?.receiptImage ?? '')
  const [location, setLocation] = useState(edit?.location ?? '')
  const [locLoading, setLocLoading] = useState(false)
  const [locError, setLocError] = useState('')
  const [showLightbox, setShowLightbox] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const detectLocation = () => {
    if (!navigator.geolocation) { setLocError('GPS не се поддържа'); return }
    setLocLoading(true); setLocError('')
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&accept-language=bg`,
            { headers: { Accept: 'application/json' } }
          )
          const data = await res.json()
          const a = data.address ?? {}
          const parts = [a.road, a.house_number, a.city || a.town || a.village || a.county].filter(Boolean)
          setLocation(parts.join(', ') || data.display_name || '')
        } catch {
          setLocError('Грешка при геокодиране')
        } finally {
          setLocLoading(false)
        }
      },
      () => { setLocError('Достъпът до GPS е отказан'); setLocLoading(false) },
      { timeout: 10000 }
    )
  }

  const onLiters = (val: string) => {
    val = toNumStr(val)
    setLiters(val)
    const p = parseFloat(price)
    if (val && !isNaN(p)) setTotal((parseFloat(val) * p).toFixed(2))
  }
  const onPrice = (val: string) => {
    val = toNumStr(val)
    setPrice(val)
    const l = parseFloat(liters)
    if (val && !isNaN(l)) setTotal((parseFloat(val) * l).toFixed(2))
  }
  const onTotal = (val: string) => {
    val = toNumStr(val)
    setTotal(val)
    const l = parseFloat(liters)
    if (val && l > 0) setPrice((parseFloat(val) / l).toFixed(3))
  }

  const valid = Number(odometer) > 0 && Number(liters) > 0 && Number(total) > 0
  const submit = () => {
    if (!valid) return
    const payload = {
      vehicleId,
      date,
      fuelType,
      odometer: Number(odometer),
      liters: Number(liters),
      pricePerLiter: Number(price) || Number(total) / Number(liters),
      total: Number(total),
      fullTank,
      missedFill,
      station: station.trim() || undefined,
      notes: notes.trim() || undefined,
      receiptImage: receiptImage || undefined,
      location: location.trim() || undefined,
    }
    if (edit) updateRefuel(edit.id, payload)
    else addRefuel(payload)
    onClose()
  }

  return (
    <Modal
      open
      title={edit ? 'Редакция на зареждане' : 'Ново зареждане'}
      color={ENTRY_COLORS.refuel}
      onClose={onClose}
      footer={<FormFooter valid={valid} edit={!!edit} color={ENTRY_COLORS.refuel} onSubmit={submit} onDelete={edit ? () => { removeRefuel(edit.id); onClose() } : undefined} deleteMsg="Изтриване на зареждането?" />}
    >
      <Row>
        <Field label="Дата">
          <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Километраж" hint={lastOdo ? `Последно: ${km(lastOdo)}` : undefined}>
          <input className={inputClass} inputMode="numeric" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="0" />
        </Field>
      </Row>
      {fuels.length > 1 && (
        <Field label="Гориво">
          <select className={selectClass} value={fuelType} onChange={(e) => setFuelType(e.target.value as FuelType)}>
            {fuels.map((f) => (
              <option key={f} value={f}>{FUEL_LABELS[f]}</option>
            ))}
          </select>
        </Field>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label={fuelType === 'electric' ? 'kWh' : 'Литри'}>
          <input className={inputClass} inputMode="decimal" value={liters} onChange={(e) => onLiters(e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Сума (€)">
          <input className={inputClass} inputMode="decimal" value={total} onChange={(e) => onTotal(e.target.value)} placeholder="0.00" />
        </Field>
        <Field label={`Цена/${FUEL_UNITS[fuelType]}`}>
          <input className={inputClass} inputMode="decimal" value={price} onChange={(e) => onPrice(e.target.value)} placeholder="0.000" />
        </Field>
      </div>
      <Toggle checked={fullTank} onChange={setFullTank} label={fuelType === 'electric' ? 'Заредих до пълно (100%)' : 'Заредих догоре (пълен резервоар)'} />
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
      <Field label="Бележка">
        <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <Field label="Бензиностанция">
        {stationPick !== '__new__' ? (
          <select className={selectClass} value={stationPick} onChange={(e) => setStationPick(e.target.value)}>
            <option value=""></option>
            {stationOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            <option value="__new__">+ Добави нова...</option>
          </select>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input className={inputClass} style={{ flex: 1 }} value={stationText} onChange={(e) => setStationText(e.target.value)} placeholder="Напр. Тифон" autoFocus />
            <button type="button" onClick={() => { setStationPick(''); setStationText('') }} style={{ fontSize: 18, color: 'var(--muted)', padding: '0 4px' }}>✕</button>
          </div>
        )}
      </Field>
      <Field label="Локация">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className={inputClass}
            style={{ flex: 1 }}
            value={locLoading ? 'Засича...' : location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="напр. бул. Витоша 45, София"
            readOnly={locLoading}
          />
          <button
            type="button"
            onClick={detectLocation}
            disabled={locLoading}
            style={{ fontSize: 20, padding: '0 6px', color: locLoading ? 'var(--faint)' : 'var(--accent)', lineHeight: 1 }}
            title="Засечи текуща локация"
          >📍</button>
        </div>
        {locError && <span style={{ fontSize: 11, color: 'var(--red)' }}>{locError}</span>}
      </Field>
      <Toggle checked={missedFill} onChange={setMissedFill} label="Пропуснах предходно зареждане" />
    </Modal>
  )
}

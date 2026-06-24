import { useState, useRef } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Field, Row, inputClass, selectClass, Toggle } from '../../components/ui/Field'
import { useStore } from '../../store/useStore'
import { todayISO } from '../../lib/format'
import { FUEL_LABELS, type Refuel, type FuelType } from '../../types'
import { FormFooter } from '../../components/ui/FormFooter'
import styles from './RefuelForm.module.css'

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

export function RefuelForm({ vehicleId, edit, onClose }: { vehicleId: string; edit: Refuel | null; onClose: () => void }) {
  const vehicle = useStore((s) => s.vehicles.find((v) => v.id === vehicleId))
  const addRefuel = useStore((s) => s.addRefuel)
  const updateRefuel = useStore((s) => s.updateRefuel)
  const removeRefuel = useStore((s) => s.removeRefuel)

  const fuels = vehicle?.fuels ?? ['petrol']
  const [date, setDate] = useState(edit?.date ?? todayISO())
  const [fuelType, setFuelType] = useState<FuelType>(edit?.fuelType ?? fuels[0])
  const [odometer, setOdometer] = useState(edit ? String(edit.odometer) : '')
  const [liters, setLiters] = useState(edit ? String(edit.liters) : '')
  const [price, setPrice] = useState(edit ? String(edit.pricePerLiter) : '')
  const [total, setTotal] = useState(edit ? String(edit.total) : '')
  const [fullTank, setFullTank] = useState(edit?.fullTank ?? true)
  const [missedFill, setMissedFill] = useState(edit?.missedFill ?? false)
  const [station, setStation] = useState(edit?.station ?? '')
  const [driver, setDriver] = useState(edit?.driver ?? '')
  const [notes, setNotes] = useState(edit?.notes ?? '')
  const [receiptImage, setReceiptImage] = useState(edit?.receiptImage ?? '')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onLiters = (val: string) => {
    setLiters(val)
    const p = parseFloat(price)
    if (val && !isNaN(p)) setTotal((parseFloat(val) * p).toFixed(2))
  }
  const onPrice = (val: string) => {
    setPrice(val)
    const l = parseFloat(liters)
    if (val && !isNaN(l)) setTotal((parseFloat(val) * l).toFixed(2))
  }
  const onTotal = (val: string) => {
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
      driver: driver.trim() || undefined,
      notes: notes.trim() || undefined,
      receiptImage: receiptImage || undefined,
    }
    if (edit) updateRefuel(edit.id, payload)
    else addRefuel(payload)
    onClose()
  }

  return (
    <Modal
      open
      title={edit ? 'Редакция на зареждане' : 'Ново зареждане'}
      color="#f5821f"
      onClose={onClose}
      footer={<FormFooter valid={valid} edit={!!edit} color="#f5821f" onSubmit={submit} onDelete={edit ? () => { removeRefuel(edit.id); onClose() } : undefined} deleteMsg="Изтриване на зареждането?" />}
    >
      {fuels.length > 1 && (
        <Field label="Резервоар / гориво">
          <select className={selectClass} value={fuelType} onChange={(e) => setFuelType(e.target.value as FuelType)}>
            {fuels.map((f) => (
              <option key={f} value={f}>{FUEL_LABELS[f]}</option>
            ))}
          </select>
        </Field>
      )}
      <Row>
        <Field label="Дата">
          <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Километраж">
          <input className={inputClass} inputMode="numeric" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="0" />
        </Field>
      </Row>
      <Row>
        <Field label="Литри">
          <input className={inputClass} inputMode="decimal" value={liters} onChange={(e) => onLiters(e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Цена / литър">
          <input className={inputClass} inputMode="decimal" value={price} onChange={(e) => onPrice(e.target.value)} placeholder="0.000" />
        </Field>
      </Row>
      <Field label="Обща стойност (лв.)" hint="смята се автоматично, но може да се коригира">
        <input className={inputClass} inputMode="decimal" value={total} onChange={(e) => onTotal(e.target.value)} placeholder="0.00" />
      </Field>
      <Toggle checked={fullTank} onChange={setFullTank} label="Заредих догоре (пълен резервоар)" />
      <Toggle checked={missedFill} onChange={setMissedFill} label="Пропуснах предходно зареждане" />
      <Row>
        <Field label="Бензиностанция">
          <input className={inputClass} value={station} onChange={(e) => setStation(e.target.value)} placeholder="напр. OMV" />
        </Field>
        <Field label="Шофьор">
          <input className={inputClass} value={driver} onChange={(e) => setDriver(e.target.value)} />
        </Field>
      </Row>
      <Field label="Бележка (по избор)">
        <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
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
              onClick={() => fileInputRef.current?.click()}
            />
            <button type="button" className={styles.receiptRemove} onClick={() => setReceiptImage('')}>✕</button>
          </div>
        ) : (
          <button type="button" className={styles.receiptBtn} onClick={() => fileInputRef.current?.click()}>
            Прикачи бележка
          </button>
        )}
      </div>
    </Modal>
  )
}

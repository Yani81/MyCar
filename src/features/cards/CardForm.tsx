import { useRef, useState } from 'react'
import styles from './CardForm.module.css'
import { Modal } from '../../components/ui/Modal'
import { Field, inputClass, textareaClass, Segmented } from '../../components/ui/Field'
import { FormFooter } from '../../components/ui/FormFooter'
import { ImageLightbox } from '../../components/ui/ImageLightbox'
import { useStore } from '../../store/useStore'
import { processReceipt } from '../../lib/image'
import type { BarcodeFormat, DiscountCard } from '../../types'

export function CardForm({ edit, onClose }: { edit: DiscountCard | null; onClose: () => void }) {
  const addDiscountCard = useStore((s) => s.addDiscountCard)
  const updateDiscountCard = useStore((s) => s.updateDiscountCard)
  const removeDiscountCard = useStore((s) => s.removeDiscountCard)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(edit?.name ?? '')
  const [code, setCode] = useState(edit?.code ?? '')
  const [format, setFormat] = useState<BarcodeFormat>(edit?.format ?? 'code128')
  const [photo, setPhoto] = useState(edit?.photo ?? '')
  const [showLightbox, setShowLightbox] = useState(false)
  const [notes, setNotes] = useState(edit?.notes ?? '')

  const valid = !!name.trim() && !!code.trim()

  const submit = () => {
    if (!valid) return
    const payload = { name: name.trim(), code: code.trim(), format, photo: photo || undefined, notes: notes.trim() || undefined }
    if (edit) updateDiscountCard(edit.id, payload)
    else addDiscountCard(payload)
    onClose()
  }

  return (
    <Modal
      open
      title={edit ? 'Редакция на карта' : 'Нова карта'}
      color="var(--brand)"
      onClose={onClose}
      footer={
        <FormFooter
          valid={valid}
          edit={!!edit}
          onSubmit={submit}
          onDelete={edit ? () => { removeDiscountCard(edit.id); onClose() } : undefined}
          deleteMsg="Изтриване на картата?"
        />
      }
    >
      <Field label="Име">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="напр. Fantastico" />
      </Field>
      <Field label="Номер/код">
        <input className={inputClass} value={code} onChange={(e) => setCode(e.target.value)} placeholder="номер на картата" />
      </Field>
      <Field label="Формат">
        <Segmented
          value={format}
          onChange={setFormat}
          options={[
            { value: 'code128', label: 'Баркод' },
            { value: 'qr', label: 'QR код' },
          ]}
        />
      </Field>
      <Field label="Снимка на картата" hint="по избор">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (file) setPhoto(await processReceipt(file))
            e.target.value = ''
          }}
        />
        <div className={styles.photoSection}>
          {photo ? (
            <div className={styles.photoPreview}>
              <img src={photo} className={styles.photoThumb} alt="Карта" onClick={() => setShowLightbox(true)} />
              <button type="button" className={styles.photoRemove} onClick={() => setPhoto('')}>✕</button>
              <button type="button" className={styles.photoChange} onClick={() => fileInputRef.current?.click()}>Смени</button>
            </div>
          ) : (
            <button type="button" className={styles.photoBtn} onClick={() => fileInputRef.current?.click()}>
              Прикачи снимка
            </button>
          )}
        </div>
        {showLightbox && <ImageLightbox src={photo} onClose={() => setShowLightbox(false)} />}
      </Field>
      <Field label="Бележки" hint="по избор">
        <textarea className={textareaClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Modal>
  )
}

import { useState } from 'react'
import styles from './CardsPage.module.css'
import { Modal } from '../../components/ui/Modal'
import { useStore } from '../../store/useStore'
import type { DiscountCard } from '../../types'
import { ENTRY_COLORS } from '../../types'
import { Barcode } from './Barcode'
import { QRCode } from './QRCode'
import { CardForm } from './CardForm'

type View = 'list' | 'barcode' | 'form'

const FALLBACK_COLORS = [
  ENTRY_COLORS.refuel, ENTRY_COLORS.trip, ENTRY_COLORS.income,
  ENTRY_COLORS.expense, ENTRY_COLORS.reminder, ENTRY_COLORS.odometer, ENTRY_COLORS.service,
]

function fallbackColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash += id.charCodeAt(i)
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length]
}

export function CardsPage({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cards = useStore((s) => s.discountCards)
  const [view, setView] = useState<View>('list')
  const [selected, setSelected] = useState<DiscountCard | null>(null)

  const close = () => {
    setView('list')
    setSelected(null)
    onClose()
  }

  return (
    <>
      <Modal open={open && view === 'list'} title="Карти за отстъпки" onClose={close}>
        {cards.length === 0 && (
          <div className={styles.empty}>Няма добавени карти. Добави лоялна/отстъпкова карта, за да я показваш на каса.</div>
        )}
        <div className={styles.grid}>
          {cards.map((c) => (
            <button
              key={c.id}
              className={styles.tile}
              onClick={() => { setSelected(c); setView('barcode') }}
            >
              {c.photo ? (
                <img src={c.photo} className={styles.tileImg} alt={c.name} />
              ) : (
                <div className={styles.tileFallback} style={{ background: fallbackColor(c.id) }}>{c.name}</div>
              )}
            </button>
          ))}
          <button className={styles.addTile} onClick={() => { setSelected(null); setView('form') }}>
            + Нова карта
          </button>
        </div>
      </Modal>

      <Modal open={open && view === 'barcode'} title={selected?.name ?? ''} onClose={() => setView('list')}>
        {selected && (
          <div className={styles.barcodeWrap}>
            <div className={styles.barcodeCard}>
              {selected.format === 'qr' ? <QRCode value={selected.code} /> : <Barcode value={selected.code} />}
            </div>
            <div className={styles.barcodeCode}>{selected.code}</div>
            {selected.notes && <div className={styles.barcodeNotes}>{selected.notes}</div>}
            <button className={styles.editBtn} onClick={() => setView('form')}>Редактирай</button>
          </div>
        )}
      </Modal>

      {open && view === 'form' && (
        <CardForm
          edit={selected}
          onClose={() => {
            setSelected(null)
            setView('list')
          }}
        />
      )}
    </>
  )
}

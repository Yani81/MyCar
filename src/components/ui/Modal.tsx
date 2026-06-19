import { type ReactNode, useEffect } from 'react'
import styles from './Modal.module.css'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  color?: string
}

export function Modal({ open, title, onClose, children, footer, color }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.grip} />
        <div className={styles.head} style={color ? { background: color, color: '#fff', margin: '-8px -18px 16px', padding: '16px 18px', borderRadius: '0' } : undefined}>
          <h2>{title}</h2>
          <button className={styles.close} style={color ? { color: 'rgba(255,255,255,0.92)' } : undefined} onClick={onClose} aria-label="Затвори">×</button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  )
}

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
        {!color && <div className={styles.grip} />}
        <div className={styles.head} style={color ? { background: color, color: '#fff', margin: '0 -18px 16px', padding: '8px 18px 14px', borderRadius: '24px 24px 0 0', flexDirection: 'column', alignItems: 'stretch' } : undefined}>
          {color && <div className={styles.grip} style={{ background: 'rgba(255,255,255,0.45)', margin: '4px auto 10px' }} />}
          {color ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2>{title}</h2>
              <button className={styles.close} style={{ color: 'rgba(255,255,255,0.92)' }} onClick={onClose} aria-label="Затвори">×</button>
            </div>
          ) : (
            <>
              <h2>{title}</h2>
              <button className={styles.close} onClick={onClose} aria-label="Затвори">×</button>
            </>
          )}
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  )
}

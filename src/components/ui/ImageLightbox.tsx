import { useEffect } from 'react'
import styles from './ImageLightbox.module.css'

export function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={styles.overlay} onClick={onClose}>
      <button className={styles.close} onClick={onClose} aria-label="Затвори">×</button>
      <img
        src={src}
        alt="Касова бележка"
        className={styles.img}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

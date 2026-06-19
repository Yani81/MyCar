import { type ReactNode } from 'react'
import styles from './Field.module.css'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {children}
      {hint && <span className={styles.hint}>{hint}</span>}
    </label>
  )
}

export function Row({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>
}

export const inputClass = styles.input
export const selectClass = styles.input
export const textareaClass = `${styles.input} ${styles.textarea}`

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.knob} />
      <span>{label}</span>
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className={styles.segmented}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={value === o.value ? styles.segActive : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

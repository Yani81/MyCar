import { type ReactNode, type ChangeEvent } from 'react'
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

export function Row({ children, cols }: { children: ReactNode; cols?: string }) {
  return <div className={styles.row} style={cols ? { gridTemplateColumns: cols } : undefined}>{children}</div>
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

export function CheckGroup({
  items,
}: {
  items: { label: string; checked: boolean; onChange: (v: boolean) => void }[]
}) {
  return (
    <div className={styles.checkGroup}>
      {items.map((item) => (
        <label key={item.label} className={styles.checkItem}>
          <input
            type="checkbox"
            checked={item.checked}
            onChange={(e: ChangeEvent<HTMLInputElement>) => item.onChange(e.target.checked)}
          />
          <span>{item.label}</span>
        </label>
      ))}
    </div>
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

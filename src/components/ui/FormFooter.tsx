export function FormFooter({
  valid,
  edit,
  onSubmit,
  onDelete,
  deleteMsg,
  submitLabel,
  color,
}: {
  valid: boolean
  edit: boolean
  onSubmit: () => void
  onDelete?: () => void
  deleteMsg?: string
  submitLabel?: string
  color?: string
}) {
  const c = color ?? 'var(--brand)'
  return (
    <>
      {edit && onDelete && (
        <button
          style={{ flex: 1, padding: 15, borderRadius: 14, color: 'var(--red)', border: '1px solid var(--border)', fontWeight: 700 }}
          onClick={() => {
            if (confirm(deleteMsg ?? 'Изтриване на записа?')) onDelete()
          }}
        >
          Изтрий
        </button>
      )}
      <button
        style={{ flex: 2, padding: 15, borderRadius: 14, background: valid ? c : 'var(--surface-3)', color: valid ? '#fff' : 'var(--faint)', fontWeight: 700, letterSpacing: '0.03em' }}
        onClick={onSubmit}
      >
        {submitLabel ?? (edit ? 'ЗАПАЗИ' : 'ЗАПИС')}
      </button>
    </>
  )
}

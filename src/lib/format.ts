const BG = 'bg-BG'

export const money = (n: number): string =>
  new Intl.NumberFormat(BG, { style: 'currency', currency: 'EUR' }).format(n)

export const num = (n: number, digits = 1): string =>
  new Intl.NumberFormat(BG, { minimumFractionDigits: 0, maximumFractionDigits: digits }).format(n)

export const numFixed = (n: number, digits = 2): string =>
  new Intl.NumberFormat(BG, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n)

export const km = (n: number): string => num(n, 0) + ' км'

export const liters = (n: number): string => num(n, 2) + ' л'

/** „YYYY-MM-DD" директно; „DD.MM.YYYY" (по избор с час след датата, напр.
 *  „02.07.2027г. 23:59:59ч.") → ISO. Държавните edge функции (ГО/ГТП/винетка)
 *  връщат validUntil в българския формат, не ISO. */
export const toISODate = (s: string | undefined | null): string | undefined => {
  if (!s) return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return undefined
}

export const dateShort = (iso: string): string => {
  const normalized = toISODate(iso) ?? iso
  const [y, m, d] = normalized.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString(BG, { day: '2-digit', month: 'short', year: 'numeric' })
}

export const timeShort = (iso: string): string =>
  iso.length > 10 ? iso.slice(11, 16) : ''

export const monthKey = (iso: string): string => iso.slice(0, 7)

export const monthLabel = (key: string): string => {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(BG, { month: 'short', year: '2-digit' })
}

export const todayISO = (): string => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export const todayDateISO = (): string => todayISO().slice(0, 10)
export const todayTimeISO = (): string => todayISO().slice(11, 16)

export const toDateTimeLocal = (iso: string): string =>
  iso.length === 10 ? iso + 'T00:00' : iso.slice(0, 16)

export const toNumStr = (s: string): string => s.replace(',', '.')

const BG = 'bg-BG'

export const money = (n: number): string =>
  new Intl.NumberFormat(BG, { style: 'currency', currency: 'EUR' }).format(n)

export const num = (n: number, digits = 1): string =>
  new Intl.NumberFormat(BG, { minimumFractionDigits: 0, maximumFractionDigits: digits }).format(n)

export const km = (n: number): string => num(n, 0) + ' км'

export const liters = (n: number): string => num(n, 2) + ' л'

export const dateShort = (iso: string): string =>
  new Date(iso).toLocaleDateString(BG, { day: '2-digit', month: 'short', year: 'numeric' })

export const monthKey = (iso: string): string => iso.slice(0, 7)

export const monthLabel = (key: string): string => {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(BG, { month: 'short', year: '2-digit' })
}

export const todayISO = (): string => new Date().toISOString().slice(0, 10)

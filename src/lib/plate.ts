/** Кирилски букви, визуално еднакви с латинските, ползвани в БГ регистрационни номера. */
const PLATE_MAP: Record<string, string> = {
  'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M',
  'Н': 'H', 'О': 'O', 'Р': 'P', 'С': 'C', 'Т': 'T', 'У': 'U', 'Х': 'X',
}

/** Нормализира номер за въвеждане: главни букви, кирилица → латиница (запазва интервалите). */
export function normalizePlate(val: string): string {
  return val.toUpperCase().replace(/./gu, (c) => PLATE_MAP[c] ?? c)
}

/** Номер за официалните проверки (БГТол, РТА, ГФ): нормализиран и без интервали. */
export function plateForApi(val: string): string {
  return normalizePlate(val).replace(/\s+/g, '')
}

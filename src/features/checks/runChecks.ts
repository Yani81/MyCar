import { FunctionRegion } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { plateForApi } from '../../lib/plate'
import type { VehicleCheckResult } from '../../types'

/** МВР блокира някои Supabase региони (напр. Цюрих, където edge функцията се
 *  изпълнява по подразбиране за част от клиентите) — Франкфурт минава. */
export const CHECK_REGION = FunctionRegion.EuCentral1

export const CHECK_ERROR_MESSAGE = 'Грешка при проверката.'

/** Резултат с днешна дата и съобщение „Грешка…" — и МВР/РТА отговорите с
 *  „Грешка: …" се броят за неуспешни, за да се пробва пак при следващо отваряне. */
export const isCheckError = (r: VehicleCheckResult) => r.message.startsWith('Грешка')

const today = () => new Date().toISOString().slice(0, 10)

/** Глоби КАТ (МВР) — изисква ЕГН и номер на СУМПС. */
export async function runKatCheck(egn: string, license: string): Promise<VehicleCheckResult> {
  try {
    const { data, error } = await supabase.functions.invoke('check-kat', {
      body: { egn, license },
      region: CHECK_REGION,
    })
    if (error) throw error
    const d = data as { hasObligations: boolean; count: number; message: string }
    return { valid: !d.hasObligations, checkedAt: today(), message: d.message }
  } catch {
    return { valid: false, checkedAt: today(), message: CHECK_ERROR_MESSAGE }
  }
}

/** Глоби BGToll — изисква рег. номер и ЕГН/ЕИК на собственика. */
export async function runDelictCheck(plate: string, egn: string): Promise<VehicleCheckResult> {
  try {
    const { data, error } = await supabase.functions.invoke('check-delict', {
      body: { plate: plateForApi(plate), egn, country: 'BG' },
      region: CHECK_REGION,
    })
    if (error) throw error
    const d = data as { hasDelicts: boolean; count: number; message: string }
    return { valid: !d.hasDelicts, checkedAt: today(), message: d.message }
  } catch {
    return { valid: false, checkedAt: today(), message: CHECK_ERROR_MESSAGE }
  }
}

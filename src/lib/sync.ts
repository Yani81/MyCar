import { supabase } from './supabase'
import type { Vehicle, Refuel, Expense, Income, Trip, OdometerReading, Reminder } from '../types'

export type StoreData = {
  vehicles: Vehicle[]
  refuels: Refuel[]
  expenses: Expense[]
  incomes: Income[]
  trips: Trip[]
  readings: OdometerReading[]
  reminders: Reminder[]
  activeVehicleId: string | null
  theme: 'auto' | 'light' | 'dark'
}

/** updated_at на последната версия, която този клиент е чел или записал. */
let lastSeenUpdatedAt: string | null = null

const LIST_KEYS = ['vehicles', 'refuels', 'expenses', 'incomes', 'trips', 'readings', 'reminders'] as const

/**
 * Слива remote и local при конфликт: union по id, при съвпадение печели локалният запис.
 * Компромис: запис, изтрит на другото устройство, се връща.
 */
function mergeData(remote: StoreData, local: StoreData): StoreData {
  const merged: StoreData = { ...local }
  for (const key of LIST_KEYS) {
    const localList = local[key] as { id: string }[]
    const ids = new Set(localList.map((x) => x.id))
    const remoteOnly = ((remote[key] ?? []) as { id: string }[]).filter((x) => !ids.has(x.id))
    ;(merged[key] as { id: string }[]) = [...localList, ...remoteOnly]
  }
  return merged
}

export async function loadFromCloud(): Promise<StoreData | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('user_data')
    .select('data, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) return null
  lastSeenUpdatedAt = data.updated_at
  return data.data as StoreData
}

export async function saveToCloud(state: StoreData): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Друг клиент е записал след последното ни четене → слей, за да не изгубим негови записи
  const { data: remote } = await supabase
    .from('user_data')
    .select('data, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  let toSave = state
  if (remote && lastSeenUpdatedAt && remote.updated_at > lastSeenUpdatedAt) {
    toSave = mergeData(remote.data as StoreData, state)
    const { useStore } = await import('../store/useStore')
    useStore.getState().loadCloudData(toSave)
  }

  const now = new Date().toISOString()
  await supabase
    .from('user_data')
    .upsert({ user_id: user.id, data: toSave, updated_at: now }, { onConflict: 'user_id' })
  lastSeenUpdatedAt = now
}

/** При връщане към приложението: ако облакът е по-нов, приложи го локално. */
export async function refreshFromCloudIfNewer(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data } = await supabase
    .from('user_data')
    .select('data, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data || (lastSeenUpdatedAt && data.updated_at <= lastSeenUpdatedAt)) return
  lastSeenUpdatedAt = data.updated_at

  const { useStore } = await import('../store/useStore')
  const s = useStore.getState()
  const local: StoreData = {
    vehicles: s.vehicles, refuels: s.refuels, expenses: s.expenses, incomes: s.incomes,
    trips: s.trips, readings: s.readings, reminders: s.reminders,
    activeVehicleId: s.activeVehicleId, theme: s.theme,
  }
  // Идентични данни (напр. нашият собствен запис) → не пипай store-а, за да не тръгне нов save
  if (JSON.stringify(local) === JSON.stringify(data.data)) return
  s.loadCloudData(data.data as StoreData)
}

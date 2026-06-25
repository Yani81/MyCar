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

export async function loadFromCloud(): Promise<StoreData | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('user_data')
    .select('data')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) return null
  return data.data as StoreData
}

export async function saveToCloud(state: StoreData): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('user_data')
    .upsert(
      { user_id: user.id, data: state, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
}

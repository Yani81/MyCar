import type {
  Vehicle,
  Refuel,
  Expense,
  Income,
  Trip,
  OdometerReading,
  Reminder,
  VehicleChecks,
} from '../types'
import type { Theme } from '../store/useStore'

/** Пълен бекъп на всички данни (без katCredentials — съдържа ЕГН). */
export interface BackupData {
  version: 1
  exportedAt: string
  vehicles: Vehicle[]
  refuels: Refuel[]
  expenses: Expense[]
  incomes: Income[]
  trips: Trip[]
  readings: OdometerReading[]
  reminders: Reminder[]
  activeVehicleId: string | null
  theme: Theme
  vehicleChecks: Record<string, VehicleChecks>
  serviceShops: string[]
}

export function downloadBackupJSON(data: Omit<BackupData, 'version' | 'exportedAt'>) {
  const backup: BackupData = { version: 1, exportedAt: new Date().toISOString(), ...data }
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mycar-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function parseBackupJSON(text: string): BackupData {
  const data = JSON.parse(text)
  const lists = ['vehicles', 'refuels', 'expenses', 'incomes', 'trips', 'readings', 'reminders']
  for (const key of lists) {
    if (!Array.isArray(data[key])) throw new Error(`Невалиден бекъп: липсва „${key}"`)
  }
  if (data.vehicles.length === 0) throw new Error('Невалиден бекъп: няма автомобили')
  return {
    version: 1,
    exportedAt: String(data.exportedAt ?? ''),
    vehicles: data.vehicles,
    refuels: data.refuels,
    expenses: data.expenses,
    incomes: data.incomes,
    trips: data.trips,
    readings: data.readings,
    reminders: data.reminders,
    activeVehicleId: typeof data.activeVehicleId === 'string' ? data.activeVehicleId : null,
    theme: data.theme === 'dark' || data.theme === 'auto' ? data.theme : 'light',
    vehicleChecks: data.vehicleChecks && typeof data.vehicleChecks === 'object' ? data.vehicleChecks : {},
    serviceShops: Array.isArray(data.serviceShops) ? data.serviceShops : [],
  }
}

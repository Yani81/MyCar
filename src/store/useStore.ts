import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Vehicle,
  Refuel,
  Expense,
  Income,
  Trip,
  OdometerReading,
  Reminder,
  FuelType,
} from '../types'
import { uid } from '../lib/id'

export type Theme = 'auto' | 'light' | 'dark'

interface State {
  vehicles: Vehicle[]
  refuels: Refuel[]
  expenses: Expense[]
  incomes: Income[]
  trips: Trip[]
  readings: OdometerReading[]
  reminders: Reminder[]
  activeVehicleId: string | null
  theme: Theme

  setTheme: (t: Theme) => void
  setActiveVehicle: (id: string) => void

  addVehicle: (v: Omit<Vehicle, 'id' | 'createdAt'>) => string
  updateVehicle: (id: string, patch: Partial<Vehicle>) => void
  removeVehicle: (id: string) => void

  addRefuel: (r: Omit<Refuel, 'id'>) => void
  updateRefuel: (id: string, patch: Partial<Refuel>) => void
  removeRefuel: (id: string) => void

  addExpense: (e: Omit<Expense, 'id'>) => void
  updateExpense: (id: string, patch: Partial<Expense>) => void
  removeExpense: (id: string) => void

  addIncome: (i: Omit<Income, 'id'>) => void
  updateIncome: (id: string, patch: Partial<Income>) => void
  removeIncome: (id: string) => void

  addTrip: (t: Omit<Trip, 'id'>) => void
  updateTrip: (id: string, patch: Partial<Trip>) => void
  removeTrip: (id: string) => void

  addReading: (r: Omit<OdometerReading, 'id'>) => void
  updateReading: (id: string, patch: Partial<OdometerReading>) => void
  removeReading: (id: string) => void

  addReminder: (r: Omit<Reminder, 'id'>) => void
  updateReminder: (id: string, patch: Partial<Reminder>) => void
  removeReminder: (id: string) => void
}

const defaultVehicle = (): Vehicle => ({
  id: uid(),
  name: 'Моят автомобил',
  fuels: ['petrol'] as FuelType[],
  initialOdometer: 0,
  createdAt: new Date().toISOString(),
})

type Identified = { id: string }
type ListKeys = 'vehicles' | 'refuels' | 'expenses' | 'incomes' | 'trips' | 'readings' | 'reminders'

export const useStore = create<State>()(
  persist(
    (set) => {
      const upd =
        (key: ListKeys) =>
        (id: string, patch: object) =>
          set((s) => ({
            [key]: (s[key] as Identified[]).map((x) => (x.id === id ? { ...x, ...patch } : x)),
          }) as unknown as Partial<State>)
      const del =
        (key: ListKeys) =>
        (id: string) =>
          set((s) => ({
            [key]: (s[key] as Identified[]).filter((x) => x.id !== id),
          }) as unknown as Partial<State>)

      const v0 = defaultVehicle()
      return {
        vehicles: [v0],
        refuels: [],
        expenses: [],
        incomes: [],
        trips: [],
        readings: [],
        reminders: [],
        activeVehicleId: v0.id,
        theme: 'light',

        setTheme: (theme) => set({ theme }),
        setActiveVehicle: (id) => set({ activeVehicleId: id }),

        addVehicle: (v) => {
          const id = uid()
          const vehicle: Vehicle = { ...v, id, createdAt: new Date().toISOString() }
          set((s) => ({ vehicles: [...s.vehicles, vehicle], activeVehicleId: id }))
          return id
        },
        updateVehicle: upd('vehicles'),
        removeVehicle: (id) =>
          set((s) => {
            // Премахва МПС-то от списъка
            const vehicles = s.vehicles.filter((v) => v.id !== id)
            // Помощна функция: изтрива всички записи, свързани с това МПС
            const byV = <T extends { vehicleId: string }>(arr: T[]) => arr.filter((x) => x.vehicleId !== id)
            return {
              vehicles,
              // Каскадно изтриване на всички свързани данни
              refuels: byV(s.refuels),
              expenses: byV(s.expenses),
              incomes: byV(s.incomes),
              trips: byV(s.trips),
              readings: byV(s.readings),
              reminders: byV(s.reminders),
              // Ако изтритото МПС е било активно — избира следващото, или null ако няма
              activeVehicleId: s.activeVehicleId === id ? vehicles[0]?.id ?? null : s.activeVehicleId,
            }
          }),

        addRefuel: (r) => set((s) => ({ refuels: [...s.refuels, { ...r, id: uid() }] })),
        updateRefuel: upd('refuels'),
        removeRefuel: del('refuels'),

        addExpense: (e) => set((s) => ({ expenses: [...s.expenses, { ...e, id: uid() }] })),
        updateExpense: upd('expenses'),
        removeExpense: del('expenses'),

        addIncome: (i) => set((s) => ({ incomes: [...s.incomes, { ...i, id: uid() }] })),
        updateIncome: upd('incomes'),
        removeIncome: del('incomes'),

        addTrip: (t) => set((s) => ({ trips: [...s.trips, { ...t, id: uid() }] })),
        updateTrip: upd('trips'),
        removeTrip: del('trips'),

        addReading: (r) => set((s) => ({ readings: [...s.readings, { ...r, id: uid() }] })),
        updateReading: upd('readings'),
        removeReading: del('readings'),

        addReminder: (r) => set((s) => ({ reminders: [...s.reminders, { ...r, id: uid() }] })),
        updateReminder: upd('reminders'),
        removeReminder: del('reminders'),
      }
    },
    {
      name: 'mycar-store-v2',
      onRehydrateStorage: () => (state) => {
        if (!state) return
        if (state.vehicles.length === 0) {
          const v = defaultVehicle()
          state.vehicles = [v]
          state.activeVehicleId = v.id
        } else if (!state.vehicles.some((v) => v.id === state.activeVehicleId)) {
          state.activeVehicleId = state.vehicles[0].id
        }
        state.vehicles.forEach((v) => {
          if (!v.fuels || v.fuels.length === 0) v.fuels = ['petrol']
        })
      },
    }
  )
)

export const useActiveVehicle = () =>
  useStore((s) => s.vehicles.find((v) => v.id === s.activeVehicleId) ?? s.vehicles[0] ?? null)

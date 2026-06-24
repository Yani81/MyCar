import { create } from 'zustand'
import type { Refuel, Expense, Income, Trip, OdometerReading, Reminder } from '../types'

export type FormOpen =
  | { type: 'refuel'; entry: Refuel | null }
  | { type: 'expense'; entry: Expense | null }
  | { type: 'service'; entry: Expense | null }
  | { type: 'income'; entry: Income | null }
  | { type: 'trip'; entry: Trip | null }
  | { type: 'odometer'; entry: OdometerReading | null }
  | { type: 'reminder'; entry: Reminder | null }

export type HistoryFilter = 'refuel' | 'expense' | 'service' | 'income' | 'trip' | 'odometer'

interface UI {
  form: FormOpen | null
  menuOpen: boolean
  historyFilter: HistoryFilter | null
  openForm: (f: FormOpen) => void
  closeForm: () => void
  setMenu: (v: boolean) => void
  setHistoryFilter: (f: HistoryFilter | null) => void
}

export const useUI = create<UI>((set) => ({
  form: null,
  menuOpen: false,
  historyFilter: null,
  openForm: (form) => set({ form, menuOpen: false }),
  closeForm: () => set({ form: null }),
  setMenu: (menuOpen) => set({ menuOpen }),
  setHistoryFilter: (historyFilter) => set({ historyFilter }),
}))

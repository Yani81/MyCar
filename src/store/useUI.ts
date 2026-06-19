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

interface UI {
  form: FormOpen | null
  menuOpen: boolean
  openForm: (f: FormOpen) => void
  closeForm: () => void
  setMenu: (v: boolean) => void
}

export const useUI = create<UI>((set) => ({
  form: null,
  menuOpen: false,
  openForm: (form) => set({ form, menuOpen: false }),
  closeForm: () => set({ form: null }),
  setMenu: (menuOpen) => set({ menuOpen }),
}))

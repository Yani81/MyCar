export type FuelType = 'petrol' | 'diesel' | 'lpg' | 'cng' | 'electric'

export interface Vehicle {
  id: string
  name: string
  make?: string
  model?: string
  plate?: string
  /** Горива на колата (1 за моногориво, 2 за двугоривна напр. бензин+газ) */
  fuels: FuelType[]
  initialOdometer: number
  createdAt: string
}

export interface Refuel {
  id: string
  vehicleId: string
  date: string
  odometer: number
  fuelType: FuelType
  liters: number
  pricePerLiter: number
  total: number
  fullTank: boolean
  /** Предходно зареждане е пропуснато → разходът за периода е недостоверен */
  missedFill: boolean
  station?: string
  notes?: string
  receiptImage?: string
  location?: string
}

export type ExpenseKind = 'service' | 'expense'

export interface InsuranceInstallment {
  amount: number
  dueDate?: string
  paid: boolean
}

export interface Expense {
  id: string
  vehicleId: string
  date: string
  odometer?: number
  kind: ExpenseKind
  category: string
  title?: string
  cost: number
  place?: string
  notes?: string
  receiptImage?: string
  insuranceType?: string
  insuranceCompany?: string
  insuranceInstallments?: number
  installments?: InsuranceInstallment[]
  oilType?: string
  oilFilterChanged?: boolean
  fuelFilterChanged?: boolean
  airFilterChanged?: boolean
  cabinFilterChanged?: boolean
  tireType?: TireType
  tireCondition?: 'new' | 'used'
  tireBrand?: string
  tireSize?: string
  tireDot?: string
}

export type TireType = 'summer' | 'winter' | 'allseason'

export const TIRE_LABELS: Record<TireType, string> = {
  summer: 'Летни',
  winter: 'Зимни',
  allseason: 'Всесезонни',
}

export interface Income {
  id: string
  vehicleId: string
  date: string
  odometer?: number
  category: string
  amount: number
  notes?: string
}

export interface Trip {
  id: string
  vehicleId: string
  origin: string
  destination: string
  date: string
  startOdometer: number
  endOdometer: number
  /** Двупосочен маршрут (отиване и връщане до началната точка) */
  roundTrip?: boolean
  costPerKm?: number
  total: number
  reason?: string
  notes?: string
}

export interface OdometerReading {
  id: string
  vehicleId: string
  date: string
  odometer: number
  notes?: string
}

export type ReminderBasis = 'date' | 'odometer' | 'both'

export interface Reminder {
  id: string
  vehicleId: string
  title: string
  basis: ReminderBasis
  dueDate?: string
  dueOdometer?: number
  repeatMonths?: number
  repeatKm?: number
  done: boolean
  notes?: string
}

export const FUEL_LABELS: Record<FuelType, string> = {
  petrol: 'Бензин',
  diesel: 'Дизел',
  lpg: 'Газ (LPG)',
  cng: 'Метан (CNG)',
  electric: 'Ток',
}

/** Мерна единица за количество по вид гориво (литри / киловатчаса). */
export const FUEL_UNITS: Record<FuelType, string> = {
  petrol: 'л',
  diesel: 'л',
  lpg: 'л',
  cng: 'л',
  electric: 'kWh',
}

/** Единица за разход: л/100км или kWh/100км. */
export const consUnitLabel = (fuel: FuelType): string => `${FUEL_UNITS[fuel]}/100км`

export const EXPENSE_CATEGORIES: { id: string; label: string; kind: ExpenseKind }[] = [
  { id: 'service', label: 'Ремонт', kind: 'service' },
  { id: 'oil', label: 'Смяна на масло', kind: 'service' },
  { id: 'tires', label: 'Гуми', kind: 'service' },
  { id: 'parts', label: 'Части', kind: 'service' },
  { id: 'suspension', label: 'Окачване', kind: 'service' },
  { id: 'belts', label: 'Ремъци', kind: 'service' },
  { id: 'wipers', label: 'Чистачки', kind: 'service' },
  { id: 'insurance', label: 'Застраховка', kind: 'expense' },
  { id: 'tax', label: 'Данък', kind: 'expense' },
  { id: 'vignette', label: 'Винетка', kind: 'expense' },
  { id: 'inspection', label: 'Технически преглед', kind: 'expense' },
  { id: 'wash', label: 'Автомивка', kind: 'expense' },
  { id: 'parking', label: 'Паркинг', kind: 'expense' },
  { id: 'fine', label: 'Глоба', kind: 'expense' },
  { id: 'other', label: 'Друго', kind: 'expense' },
]

export const INCOME_CATEGORIES = ['Превоз', 'Споделено пътуване', 'Продажба на части', 'Възстановяване', 'Друго']

/** Типове записи за централното меню и историята */
export type EntryType = 'refuel' | 'expense' | 'income' | 'service' | 'trip' | 'odometer' | 'reminder'

/** Цветове по тип запис (палитра „Индиго", еднакви за двете теми) */
export const ENTRY_COLORS: Record<EntryType, string> = {
  refuel: '#d97706',
  expense: '#e11d48',
  service: '#78716c',
  income: '#059669',
  trip: '#0284c7',
  odometer: '#db2777',
  reminder: '#7c3aed',
}

export interface VehicleCheckResult {
  valid: boolean
  validUntil?: string
  checkedAt: string
  message: string
}

export interface VehicleChecks {
  go?: VehicleCheckResult
  gtp?: VehicleCheckResult
  vignette?: VehicleCheckResult
  delict?: VehicleCheckResult
  kat?: VehicleCheckResult
}

# MyCar — CLAUDE.md

PWA приложение за проследяване на разходи, гориво и поддръжка на автомобил. Без бекенд — всичко е в localStorage.

## Технологичен стек

- **React 18** + **TypeScript 5**
- **Vite 5** — bundler, `base: './'` за относителни пътища при deploy
- **Zustand 4** — state management с `persist` middleware
- **Recharts 2** — графики в ReportsPage
- **CSS Modules** — без CSS framework
- **PWA** — `public/sw.js` + `public/manifest.webmanifest`

## Структура на кода

```
src/
├── types.ts              # Всички TypeScript типове и константи (единствено място)
├── App.tsx               # Root компонент, tab routing чрез useState
├── main.tsx              # Entry point
├── index.css             # Глобални CSS променливи и reset
├── components/
│   ├── Layout/           # Header, BottomNav, AddMenu, icons
│   └── ui/               # Примитиви: Field, Modal, FormFooter
├── features/
│   ├── dashboard/        # Главен екран
│   ├── fuel/             # RefuelForm
│   ├── expenses/         # ExpenseForm
│   ├── income/           # IncomeForm
│   ├── trips/            # TripForm
│   ├── odometer/         # OdometerForm
│   ├── reminders/        # ReminderForm + RemindersPage
│   ├── history/          # HistoryPage
│   ├── reports/          # ReportsPage
│   └── Forms.tsx         # Форм-рутер (превключва между формите)
├── store/
│   ├── useStore.ts       # Основен store (данни, persist: 'mycar-store-v2')
│   └── useUI.ts          # UI state (отворена форма, AddMenu)
└── lib/
    ├── calculations.ts   # Чисти функции за изчисления
    ├── format.ts         # Форматиране (bg-BG локал навсякъде)
    └── id.ts             # uid() генератор
```

## Конвенции за именуване

| Какво | Конвенция | Пример |
|---|---|---|
| Компоненти | PascalCase | `Header.tsx`, `Dashboard.tsx` |
| CSS Modules | `Name.module.css`, до компонента | `Header.module.css` |
| Hooks | `use` prefix | `useStore`, `useUI`, `useActiveVehicle` |
| Типове / интерфейси | PascalCase | `Vehicle`, `Refuel`, `FuelType` |
| Константи | UPPER_SNAKE_CASE | `FUEL_LABELS`, `EXPENSE_CATEGORIES` |
| Helper функции | camelCase | `computeStats`, `monthlySpend` |
| Store actions | `add/update/remove` + тип | `addRefuel`, `updateExpense` |

## Важни правила

- **Всички типове живеят в `src/types.ts`** — не ги разпръсквай по файловете.
- **Без routing библиотека** — навигацията е `useState<Tab>` в `App.tsx`.
- **Локал е `bg-BG` навсякъде** — `Intl.NumberFormat`, `toLocaleDateString`, всички формати.
- **Дати се пазят като ISO string** (`YYYY-MM-DD`), не като Date обект.
- **ID-та се генерират с `uid()`** от `src/lib/id.ts`.
- **Каскадно изтриване** — при изтриване на МПС се изтриват всички свързани записи (вж. `removeVehicle` в useStore).
- **Разход гориво** се изчислява само „пълен до пълен" (`fullTank: true`); пропуснато зареждане (`missedFill`) прекъсва серията.
- **Два store-а**: `useStore` за данни (persist), `useUI` за временно UI state (без persist).
- **Няма тестове** — при промени проверявай ръчно в браузъра.
- **Commit/push** — питай потребителя преди всяко `git commit` или `git push`.

## Дизайн

**Brand цвят (teal):**
- light тема: `#1bb3bf` (primary), `#149aa5` (darker)
- dark тема: `#12a3ad` (primary), `#0d8c95` (darker)
- CSS var: `var(--brand)` / `var(--brand-2)` / `var(--brand-soft)`

**Default тема:** `light` (задава се в `useStore`, ключ `theme`).

**Цветове на modal header-ите по тип запис:**

| Тип | Цвят |
|---|---|
| Гориво (`refuel`) | `#f5821f` (оранжево) |
| Разход (`expense`) | `#ec5b53` (червено) |
| Услуга / сервиз (`service`) | `#7a5c4a` (кафяво) |
| Приход (`income`) | `#3f9c35` (зелено) |
| Маршрут (`trip`) | `#5f7079` (сиво-синьо) |
| Километраж (`odometer`) | `#c2185b` (малина) |
| Напомняне (`reminder`) | `#7e57c2` (лилаво) |

Цветът се подава като `color` prop на `<Modal>` и `<FormFooter>`.

## Критични версии — внимавай при промяна

- **Zustand persist key:** `mycar-store-v2` — при смяна старите данни на потребителите се губят
- **SW cache key:** `mycar-v3` (в `public/sw.js`) — при смяна старият кеш се изчиства автоматично, но версията трябва да се увеличи съзнателно

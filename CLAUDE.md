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

**Brand цвят (индиго, палитра „Индиго"):**
- light тема: `#5b5bd6` (primary), `#4a4ac0` (darker)
- dark тема: `#7375f0` (primary), `#5b5de0` (darker)
- CSS var: `var(--brand)` / `var(--brand-2)` / `var(--brand-soft)`

**Default тема:** `light` (задава се в `useStore`, ключ `theme`).

**Цветове по тип запис** — централизирани в `ENTRY_COLORS` (`src/types.ts`), еднакви за двете теми; в CSS модули са достъпни като `var(--c-refuel)` … `var(--c-reminder)` (дефинирани в `index.css`):

| Тип | Цвят |
|---|---|
| Гориво (`refuel`) | `#d97706` (кехлибар) |
| Разход (`expense`) | `#e11d48` (червено) |
| Услуга / сервиз (`service`) | `#78716c` (топло сиво) |
| Приход (`income`) | `#059669` (зелено) |
| Маршрут (`trip`) | `#0284c7` (синьо) |
| Километраж (`odometer`) | `#db2777` (малина) |
| Напомняне (`reminder`) | `#7c3aed` (лилаво) |

Цветът се подава като `color` prop на `<Modal>` и `<FormFooter>` — винаги през `ENTRY_COLORS`, без хардкоднати hex-ове.

## Критични версии — внимавай при промяна

- **Zustand persist key:** `mycar-store-v2` — при смяна старите данни на потребителите се губят
- **SW cache key:** `mycar-v6` (в `public/sw.js`) — при смяна старият кеш се изчиства автоматично, но версията трябва да се увеличи съзнателно

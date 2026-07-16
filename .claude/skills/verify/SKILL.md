---
name: verify
description: Как да пуснеш и провериш MyCar end-to-end в headless браузър (vite + playwright-core, заобикаляне на Supabase login).
---

# Проверка на MyCar в браузър

## Стартиране

```bash
npm run dev -- --port 5199 --strictPort   # в background
```

Приложението е на `http://localhost:5199/` (vite base './' — работи и на /).

## Headless браузър

Playwright не е dependency на проекта. В scratchpad: `npm i playwright-core` и ползвай кеширания Chromium:

```js
executablePath: '~/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
```

Viewport 390×844 (мобилен PWA изглед).

## Gotcha: Supabase login екран

Приложението гейтва всичко зад Supabase auth (`src/store/useAuth.ts`). За офлайн проверка:

1. Блокирай мрежата: `page.route('**/*.supabase.co/**', r => r.abort())` — sync-ът гърми тихо в конзолата, приложението работи (данните са в localStorage).
2. Seed-ни фалшива сесия ПРЕДИ зареждане (`page.addInitScript`), ключ `sb-rsagjrioxztnauaiudiv-auth-token` (ref-ът е от `VITE_SUPABASE_URL` в `.env`):

```js
{ access_token: 'fake.fake.fake', refresh_token: 'fake', token_type: 'bearer',
  expires_in: 3600, expires_at: <unix след 24ч>,
  user: { id: '<uuid>', aud: 'authenticated', role: 'authenticated', email: 'verify@test.bg', app_metadata: {}, user_metadata: {}, created_at: '<iso>' } }
```

При чист localStorage store-ът създава default МПС „Моят автомобил" — не трябва onboarding.

## Полезни селектори

- Бутон „+": `page.getByLabel('Добави запис')`
- Submit в модалите: текстът е `ЗАПИС` (нов) / `ЗАПАЗИ` (редакция), от `FormFooter`. Бутонът НЕ е disabled при невалидна форма — кликът просто не прави нищо; проверявай дали модалът остава отворен.
- Навигация: текстовете в BottomNav — Табло / История / Напомняния / Справки (ползвай `.last()`, текстът се среща и другаде).

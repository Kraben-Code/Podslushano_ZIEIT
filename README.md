# Подслушано ЗІЕІТ

Студентська спільнота ЗІЕІТ. Поточний етап — **Foundation**: адаптивна головна сторінка, вхід, захищений профіль і основа для PostgreSQL, Supabase Storage та Telegram-реєстрації.

## Стек

- Next.js App Router, React, TypeScript
- Tailwind CSS 4, shadcn/ui, Lucide
- Supabase PostgreSQL, Drizzle ORM
- Supabase Storage (server-side service key)
- Деплой: GitHub → Vercel

## Локальний запуск

Потрібні Node.js 20.9+ та npm.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Відкрий <http://localhost:3000>. Головна сторінка працює і без налаштованої бази; у development вона показує чітко позначені демонстраційні публікації. Ці дані не передаються в production.

Щоб увімкнути вхід і профіль, налаштуй development-проєкт Supabase та задай у `.env.local`:

```dotenv
DATABASE_URL=postgresql://...
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-only-secret>
SUPABASE_STORAGE_BUCKET=zieit-media
ALLOW_LOCAL_TEST_ACCOUNTS=true
```

У Vercel використовуй окремий production-проєкт/базу Supabase. Не копіюй локальні тестові дані в production. Service-role key ніколи не додавай до `NEXT_PUBLIC_*`, Git, issue, повідомлень або вихідного коду.

## База даних

`src/lib/db/schema.ts` містить початкові сутності користувача, профілю, ролей, сесій, Telegram-зв’язку та лімітів входу.

```powershell
npm run db:generate
npm run db:migrate
```

Для локального тестового користувача після застосування міграцій:

```powershell
npm run db:create-local-user
```

Команда попросить логін, ім’я та пароль (ввод пароля прихований), створитиме лише звичайний USER-акаунт і відмовиться працювати в production або Vercel. Використовуй її тільки з development-базою й `ALLOW_LOCAL_TEST_ACCOUNTS=true`. На сайті немає публічної реєстрації.

`src/lib/storage.ts` надає лише серверний клієнт Supabase Storage. Завантаження файлів, bucket policies та API для медіа будуть реалізовані на відповідному етапі з валідацією MIME-типу, розміру й прав доступу.

## Авторизація

- Вхід — тільки за унікальним логіном і паролем.
- Реєстрація та відновлення доступу мають виконуватися через Telegram-бота; цей етап не створює сайт-реєстрацію.
- Пароль хешується Argon2id.
- Браузер отримує випадкову HttpOnly cookie; у PostgreSQL зберігається лише SHA-256-хеш токена сесії.
- Перевірка origin захищає змінювальні auth-запити від CSRF; таблиця `login_attempts` забезпечує обмеження невдалих входів без зберігання IP-адрес у відкритому вигляді.
- `GET /api/users/me` повертає тільки мінімальні профільні дані. Пароль, Telegram ID та приховані поля не повертаються.

## Перевірки

```powershell
npm run typecheck
npm run lint
npm run build
```

## GitHub Pages / Vercel

Для статичного прев’ю на GitHub Pages проєкт налаштований на `output: "export"`. У production для логіну, бази даних, Telegram-sync і реальних публікацій рекомендується Vercel, бо GitHub Pages не підтримує серверні API routes, PostgreSQL і авторизацію.

Для GitHub Pages:

```powershell
npm run build:github-pages
```

Готовий статичний сайт збирається в `out/` і може деплоїтися через GitHub Pages Actions. У репозиторії вже є workflow `.github/workflows/deploy-pages.yml`.

Для повної функціональності (Supabase, API, Telegram-to-site handoff): імпортуй цей GitHub-репозиторій у Vercel і додай production-змінні середовища. Після підключення Git кожен push запускає Vercel build/deploy; push-и до інших гілок можуть створювати preview deployments.

## Telegram handoff

Промт для наступного екземпляра розробника, межі інтеграції та список потрібних уточнень: [docs/telegram-bot-handoff.md](./docs/telegram-bot-handoff.md).

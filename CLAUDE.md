# CLAUDE.md — НАБ ТехОблік (Telegram Mini App обліку техніки)

Цей файл Claude Code читає автоматично на початку кожної сесії в цій папці.
Тут — **правила роботи, карта коду, пастки і поточний стан**. Детальна
бізнес-логіка, схема бази й історія — у папці `docs/` (вона **не**
потрапляє в GitHub, див. розділ 12).

> Актуалізовано: **2026-10-22**. Останній коміт коду на цю дату:
> `6717c36` (22.10, export-1c). **З 20.10 у базі увімкнено RLS (з 22.10 — запис за ролями);
> є 👑 власник системи (USR-001), журнал змін, запити доступу, канал для 1С.**

---

## 0. Перше, що робити на початку КОЖНОЇ сесії

1. `git status` і `git pull` — користувач міг щось змінити напряму через
   веб-редактор GitHub (раніше він так і працював). Ніколи не працюй зі
   застарілою копією.
2. Прочитай `docs/TODO.md` — там поточні незавершені кроки й те, що треба
   перевірити.
3. Перед будь-якою зміною логіки — звірся з `docs/Automation_Logic_Overview.md`
   (бізнес-логіка) і `docs/DB_Schema_Document.md` (структура БД).
4. Якщо задача стосується файлу, якого ти ще не читав у цій сесії, —
   прочитай його повністю перед правкою (файли великі: `operator.js`
   ~1900 рядків, `admin.js` ~1900).

---

## 1. Хто користувач і як з ним спілкуватись

- **Андрій Квич** — розробник і адміністратор системи, тестує все сам
  разом з відповідальними людьми на виробництві. Не професійний
  програміст: пояснюй простими словами, без зайвого жаргону.
- **Мова спілкування — українська.** Коментарі в коді, тексти інтерфейсу,
  повідомлення комітів — українською.
- Користувач часто пише з телефона, коротко. Якщо прохання неоднозначне —
  **спершу уточни** (див. правила нижче).

---

## 2. Правила роботи (ОБОВ'ЯЗКОВІ — встановлені користувачем)

1. **Нічого не генерувати і не змінювати без прямої команди.** Спершу
   опиши, що саме і в яких файлах збираєшся змінити, — і дочекайся "так" /
   "роби" / "давай".
2. **Будь-яка неоднозначність → уточнювальні питання ДО роботи.** Краще
   2–3 короткі питання, ніж переробка.
3. **Рухаємось по одному кроку**, з тестом між кроками. Не роби п'ять
   змін одразу. Після кожного кроку — користувач перевіряє в Telegram.
4. **Працюючу систему не ламати.** Mini App щодня використовують реальні
   оператори й відповідальні. Будь-яка зміна, що може вплинути на подання
   звітів, — особливо обережно.
5. **Міграції в Supabase Claude виконує сам** (з 2026-10-14, дозвіл
   користувача) — через Supabase CLI, див. розділ 7. Спершу показати
   користувачу текст міграції й що вона робить. **Видалення даних,
   `drop`, `truncate`, масові `update`/`delete` — лише з явного дозволу
   на конкретну дію.** Після виконання — перевірочний запит і звіт
   користувачу.
5а. **Працювати ЛИШЕ з НАБ ТехОблік** (вимога користувача 14.10): ця
   папка + Supabase-проєкт `ypnfujxcwgfjmewrsqus` ("автоматизація
   обліку"). В акаунті Supabase є й інший проєкт (`work-planner-xxi`),
   на диску — папка `work-planner-XXI`:
   **їх не читати, не змінювати, команди до них не запускати.** Кожна
   команда CLI — лише з `--project-ref ypnfujxcwgfjmewrsqus`.
6. **Зміни в Make** — лише за погодженням. Перед будь-якою діагностикою
   Make (навіть перегляд історії запусків) — спершу спитай, що саме й
   навіщо перевіряємо.
7. **Секрети (токен бота, токен Wialon) — НІКОЛИ в коді, комітах і
   документах.** Supabase publishable key у `js/config.js` — публічний за
   призначенням, це нормально.
8. **Дипломний проєкт** (Telegram-бот + Apps Script + Google Sheets) і
   його сценарії в Make ("диплом 1", "диплом 2 сповіщення") — не чіпати.
9. **Спільна база з VS Group / ХХІ століття плюс** (розділ 14) — таблиці,
   функції й сценарії НАБ не перейменовувати й не видаляти без явного
   погодження.
10. Після завершеної зміни — **онови документацію** в `docs/` (розділ 12).

---

## 3. Git і публікація (ВАЖЛИВО)

- **Гілка `main` = робоча система.** GitHub Pages публікує Mini App прямо
  з `main`. Будь-який push у `main` через 1–10 хв бачать усі оператори.
- **Перед кожним `git push` — показати користувачу, що саме змінено
  (`git diff --stat` + коротко суть), і дочекатися явного дозволу.**
- Для великих або ризикованих змін — пропонуй окрему гілку + Pull Request
  (користувач мержить кнопкою на GitHub). Для дрібних правок користувач
  може дозволити push у `main` напряму — питай.
- Ніколи: `git push --force`, `git reset --hard` на опублікованих комітах,
  переписування історії, видалення гілок — без прямого прохання.
- Повідомлення комітів — українською, змістовні: що і навіщо
  ("Адмін: видалення об'єкта назавжди", а не "Update responsible.js").
- `docs/` у `.gitignore` — не додавай ці файли в коміт (`git add -A`
  безпечний лише тому, що вони ігноруються; перевір `git status` перед
  комітом).
- **Кеш Telegram:** після публікації GitHub Pages оновлюється 1–10 хв
  (вкладка Actions → "pages build and deployment"). Telegram може ще
  показувати стару версію — користувачу треба **повністю закрити** Mini
  App (на телефоні — закрити Telegram з фону; на ПК — "Reload" у
  контекстному меню Mini App). Нагадуй про це після кожного push.

---

## 4. Що це за система (коротко)

**НАБ ТехОблік** — облік роботи будівельної техніки Надвірнянської
автобази (НАБ). Оператор щодня подає звіт (мотогодини, км, час роботи,
дорога, перебазування, перевезення людей, простій, заправка, поломки) →
**відповідальний за об'єкт** підтверджує або повертає на коригування →
при підтвердженні оновлюються "офіційні" мотогодини/км техніки. Дані
щодня звіряються з GPS Wialon. Адмін і обліковець бачать усе, роблять
Excel-звіти (файл приходить у Telegram-бот).

```
Користувач (Telegram) ──► Mini App (GitHub Pages, vanilla JS)
                              │ REST (PostgREST), пропуск від Edge Function tg-auth (RLS)
                              ▼
                          Supabase (PostgreSQL) — єдине джерело правди
                              │ Database Webhooks (INSERT/UPDATE)
                              ▼
                          Make (сценарії) ──► Telegram Bot API (сповіщення)
                                         └──► Wialon API (GPS-звірка)
```

**Головний архітектурний принцип:** Mini App **лише читає й пише в
Supabase**. Вона ніколи не викликає Telegram API і не знає про Make.
Сповіщення робить Make, реагуючи на зміни в базі (Database Webhook).
Не порушуй цей принцип.

- Mini App: `https://chyvk96-svg.github.io/nab-oblik-miniapp/`
- Репозиторій: `https://github.com/chyvk96-svg/nab-oblik-miniapp` (публічний)
- Бот: `@nadvirna_avtobaza_bot` ("Надвірна Автобаза бот"), з'єднання Make `10750930`
- Supabase: `https://ypnfujxcwgfjmewrsqus.supabase.co`

---

## 5. Ролі (визначаються за `users.role`, вибору ролі в UI немає)

| Роль | Основне | Файл |
|---|---|---|
| Оператор / Водій | "Внести дані" (звіт, чернетки з автозбереженням), "Мої записи", "Мої години". Водій = позначка, працює як оператор | `operator.js` |
| Відповідальний | "Мої підтвердження" (Підтвердити / На коригування), "Історія", "Об'єкти" (з "+ Додати об'єкт" угорі) | `responsible.js` |
| Адміністратор | Усе відповідального + довідники, непідтверджені/закриті звіти (редагування, видалення), звірка Wialon, "Де техніка", звіт по об'єкту, години оператора, **видалення об'єкта назавжди** | `admin.js`, `admin-manage.js`, `responsible.js` |
| Обліковець | Перегляд непідтверджених/закритих звітів, звіт по об'єкту (кілька об'єктів) + Excel | `accountant.js` (+ екрани з `admin.js`) |

Погодження **однорівневе**: ролі "Логіст" немає. Адмін погоджує лише
звіти об'єктів, де сам призначений відповідальним.

---

## 6. Карта коду

Без збирача і бандлера: звичайні `<script src>` у `index.html`, **усі
функції глобальні** й доступні між файлами. **Порядок підключення
важливий:**

```
index.html
  telegram-web-app.js (CDN Telegram)
  css/style.css            — жовто-асфальтова тема, шрифти Oswald / Inter / Space Mono
  js/config.js             — SUPABASE_URL, SUPABASE_KEY (publishable)
  js/supabase-client.js    — supaGet / supaInsert / supaUpdate / supaDelete / supaRpc / supaStorageUpload + пропуск (сесія tg-auth)
  js/utils.js              — app, renderMessage, topbarHtml, formatDateUA/TimeUA/DateTimeUA, statusChipClass, пошук у списках
  js/operator.js
  js/responsible.js
  js/admin.js
  js/admin-manage.js
  js/accountant.js
  js/owner.js              — 👑 лише власник: "📜 Журнал" (зміни / входи, Excel) і "📨 Запити доступу" (з 20.10)
  js/router.js             — точка входу: tg.ready(), вхід через tg-auth (2 спроби, кнопка "Спробувати ще раз"), маршрут за роллю
supabase/functions/tg-auth/   — Edge Function входу (index.ts, verify.ts); також створює запит доступу; НЕ частина Mini App
supabase/functions/export-1c/ — Edge Function для 1С (з 20.10): лише читання фінально підтверджених звітів, токен X-Api-Key
```

### 👑 Власник системи (з 2026-10-20)

- `users.is_owner` — лише **USR-001 "Andriy Kvych"** (власник і розробник).
  Через API позначку не змінити нікому (тригер `nab_protect_owner_flag`) —
  лише через CLI на прохання користувача. Тестовий запис USR-029 "Квич
  Андрій" — звичайний (ним перевіряти, що інший адмін не бачить функцій власника).
- `tg-auth` повертає `is_owner` → кнопки в `renderAdminHome` лише при `user.is_owner`.
- Лише власник (у базі, не лише кнопками): керувати адмінами (тригер
  `nab_protect_admins`), видаляти users/equipment/customers/objects (правило
  `nab_active_delete` = `nab_is_owner()`; `nab_delete_unused` — лише
  невикористані; `delete_object_completely` перевіряє за пропуском), журнал
  змін (`change_log`, тригери на 15 таблицях, 1 рік, без чернеток), входи
  (`nab_owner_logins`), запити доступу (`access_requests`), Excel "Журнал змін".
  Звіти-дублі, як і раніше, видаляють усі адміни.
- **Запити доступу:** людини немає в users → `tg-auth` створює/оновлює запит;
  "Схвалити" → `renderAddUser(user, {fullName, telegramId, onBack})`; запит
  стає "Схвалено" тригером `nab_access_request_approved`, щойно створено users
  з цим telegram_id. Сповіщення в Telegram не потрібне (рішення користувача).
- **1С:** `export-1c` (`GET ?from&to[&object_code]`; у відповіді лише коди 1С —
  «Код / номер» об'єкта/техніки/оператора, ЄДРПОУ замовника, без OBJ-/EQ-/
  USR-/CST-; ключ звіту `report_id`), заголовок `X-Api-Key` =
  секрет `ONEC_API_TOKEN`; не publishable і НЕ ключ Make); звернення — у
  `api_access_log` (видно в "Журнал" → "Входи"). Інструкція —
  `docs/1C_export_API.md` і `.docx`. Розгортання — як tg-auth, з копії в scratchpad.

### Вхід із пропуском (з 2026-10-19)

- **`tg-auth`** (Edge Function, `--no-verify-jwt`): підпис Telegram
  `initData` + вік ≤ 24 год → активний `users` за `telegram_id` → запис
  Supabase Auth `tg<telegram_id>@nab-oblik.local` (`app_metadata.nab_user_id`
  = `users.id`) → сесія. Відповіді: 401 підпис, 403 `not_found`/`inactive`.
  Роль у пропуск не вшита — береться з `users` наживо. Розгортання — з копії в
  scratchpad (щоб CLI не створював `supabase/.temp` у репо):
  `functions deploy tg-auth --project-ref ypnfujxcwgfjmewrsqus --no-verify-jwt --use-api`.
- **`supabase-client.js`**: `authSignIn`, `supaFetch` (усі `supa*` і
  `supaStorageUpload` ідуть з пропуском), оновлення за 5 хв до кінця
  (`authRenew` — одне на всі запити; refresh → не вийшло → повторний вхід),
  401 → оновлення + 1 повтор. **Запасного шляху немає** (з 20.10, RLS):
  немає пропуску → помилка "Сесія завершилась — закрий і відкрий Mini App
  знову". Ліміт `tg-auth` 20 с; `router.js` — 2 спроби, потім кнопка.
  Збої входу пише в `errors` сам `tg-auth` (`action_id = 'TG_AUTH'`,
  `source = 'tg-auth'`).
- Прямих `fetch` до Supabase в інших файлах **не писати** — лише через
  `supa*` / `supaStorageUpload`, інакше запит піде без пропуску.

### Ключові функції за файлами

- **`operator.js`** — `renderOperatorHome`, `loadDraftsBanner`,
  `renderMyReports`, **`renderOperatorForm(user, report, draft, draftId, adminCtx)`**
  (одна форма для оператора І для редагування адміном — гілка `adminCtx`),
  `renderReportPreview`, чернетки (`draftSaveChain`, `flushDraft`,
  `draftTimeValue`, `timeInputValue`, `draftSaveErrorText`), захист від
  дублів (`findMatchingDraftId`, `deleteLeftoverDrafts`,
  `findSimilarSubmittedReports`, `sameReportFilter`), виправлення адміна
  (`EDIT_DIFF_FIELDS`, `fetchAdminEdits`, `adminEditsHtml`), "Мої години"
  (`renderMyHours` → `renderHoursScreen({viewer, subject, onBack})`,
  `loadMyHours`, `paidRepairHours`, `reportTotalHours`, `buildHoursWorkbook`,
  `sendHoursToTelegram`), `escHtml`, `round2`.
- **`responsible.js`** — `roleSubtitle`, `goToRoleHome`,
  `renderResponsibleHome`, лічильники (`pendingBadgeHtml`,
  `loadPendingBadge`, `companyPendingBadgeHtml`, `loadCompanyPendingBadge`,
  `fillCountBadge`), `renderAddObject`, `renderManageObjects`,
  `renderEditObject` (+ блок "🗑 Видалити назавжди" лише для адміна),
  **`deleteObjectCompletely`** (12.10), `reportDetailsHtml`,
  `REPORT_SELECT_FIELDS`, `renderPendingApprovals`, `confirmReport`,
  `rejectReport`, `renderApprovalHistory`.
- **`admin.js`** — `renderAdminHome`, `renderAddUser`,
  `renderAdminPendingReports`, `renderAdminClosedReports(user, filters)`,
  `adminReportCardHtml`, `wireAdminReportActions`, `deleteReportCompletely`,
  `findDuplicateIds`, "Де техніка" (`renderEquipmentLocations`,
  `reportLocation`, `travelDestination`, `LOC_DAYS=60`,
  `LOC_HISTORY_DAYS=14`), звірка Wialon (`renderWialonCheck`,
  `loadWialonSummary`, `toggleWialonDaily`, пороги
  `WIALON_MOTO_THRESHOLD=0.5`, `WIALON_FUEL_THRESHOLD=10`), звіт по
  об'єкту (`renderObjectReport`, `loadObjectReportPeriod`,
  `groupObjectReportRows`), `renderOperatorHoursPick`, спільні
  `periodPickerHtml`/`wirePeriodPicker`, `fmtNum`/`fmtDiff`,
  `isoDateLocal`, **Excel** (`loadExcelJsLib`, `xlNewSheet`, `xlTable`,
  `xlFinishSheet`, `xlStyledSheet`, `xlSectionTitle`,
  `sendXlsxBufferToBot`, `XLSX_MIME`).
- **`admin-manage.js`** — користувачі (`renderUserList`, `renderEditUser`,
  `renderUserEquipment`), техніка (`renderEquipmentList`,
  `renderAddEquipment`, `renderEditEquipment`, `parseWialonUnitId`),
  замовники (`renderCustomersList`, `renderAddCustomer`,
  `renderEditCustomer`), спільні (з 14.10, використовує й `responsible.js`):
  `codeValue` ("Код / номер": порожньо → NULL), `parseEdrpou`,
  `edrpouDuplicateError`, `customerSaveErrorText`; 👑 лише власнику (з 22.10):
  `ownerDeleteSectionHtml` + `wireOwnerDelete` (→ `nab_delete_unused`), «⛔ Заблокувати
  негайно» в `renderEditUser`.
- **Пошук у списках довідників** (`utils.js`, з 14.10): `listSearchHtml(key,
  placeholder)` над списком + `wireListSearch(key, listEl)` після рендеру;
  картка має `data-search="${searchAttr(...поля)}"`.
- **`accountant.js`** — `renderAccountantHome`, `backToRoleMenu`,
  `renderMultiObjectReport`, `loadMultiObjectPeriod`,
  `buildMultiObjectWorkbook`.

### Стиль коду (дотримуйся існуючого)

- Vanilla JS, `async/await`, шаблонні рядки для HTML, `app.innerHTML = ...`.
- Користувацький текст у HTML — через `escHtml(...)`.
- ID записів — через `supaRpc('next_id', { p_prefix: 'XXX' })` (розділ 8).
- Помилки — `alert('Помилка: ' + e.message)` або `error-text` блок на формі.
- Підтвердження небезпечних дій — `confirm(...)` з чітким текстом.
- Підказки в формі оператора — на "ти".
- Коментарі в коді — українською, з датою важливих рішень
  (`// (з 2026-10-12) ...`).

---

## 7. Supabase — як працювати з базою

- **Доступ до бази — через Supabase CLI** (з 2026-10-14). Вхід
  `supabase login` уже зроблено на цьому ПК (акаунт користувача), ключі
  ніде не вводяться і не зберігаються в папці. Запуск — **лише з
  тимчасової папки (scratchpad), SQL — лише з файлу** (текст запиту в
  аргументі ламається на Windows через пробіли):
  ```bash
  npx.cmd --yes supabase@2.119.0 db query --linked --project-ref ypnfujxcwgfjmewrsqus -f <файл.sql>
  ```
  `supabase link` / `init` / `db push` у цій папці **не** робити (не
  створювати `supabase/` у публічному репо і схему історії міграцій у
  живій базі). **Лише `--project-ref ypnfujxcwgfjmewrsqus`** — інший
  проєкт акаунта не чіпати (правило 5а). Структура — також у
  `docs/supabase_schema.sql` і `docs/DB_Schema_Document.md`; при сумніві —
  перевірочний `select` через CLI.
- **RLS увімкнено на всіх 18 таблицях (з 2026-10-20).** Правила
  `nab_active_select/insert/update/delete` для `authenticated`: лише
  `(select public.nab_is_active_user())` — пропуск tg-auth належить
  активному `users`. **`anon` не має жодних прав** (publishable key сам по
  собі нічого не відкриває). Make і `tg-auth` — секретний ключ
  (`service_role`), оминають RLS. Відкат — `docs/migrations/2026-10-20_rls_whitelist_ROLLBACK.sql`.
- **Запис — за ролями (з 2026-10-22,** `2026-10-22_rls_roles_write.sql`**):**
  `nab_my_id()`, `nab_my_role()`, `nab_is_admin()`, `nab_is_responsible()`.
  Адмін — усе; відповідальний — лише «Очікує» → підтверджено/повернено на
  своїх звітах, approvals від себе, об'єкти/відповідальні/додати замовника;
  оператор — свої звіти (чернетка, подання, виправлення поверненого), свої
  чернетки видаляє; обліковець — лише `export_files`; `export_files.user_id` = я.
  Тригери-охоронці: `nab_guard_report_update` (переходи статусів, відповідальний
  не змінює дані, `final_closed_at` = час сервера), `nab_guard_equipment_update`
  (не-адмін: лише confirmed_hours/km = «кінець» щойно підтвердженого ним звіту).
  `next_id` — security definer. **Нова функція Mini App, що пише в базу, —
  перевір, чи її дозволяють ці правила** (інакше «row-level security» або
  тихо 0 рядків).
- **Читання — за ролями (з 2026-10-22,** `2026-10-22_rls_roles_read.sql`**):**
  звіти — адмін/обліковець усі (`nab_sees_all_reports()`), відповідальний —
  `responsible_id` = я, оператор — свої + подані звіти напарника на його
  техніці «на двох операторів» (`nab_my_shared_equipment()`); approvals і
  report_edit_log — до видимих звітів; export_files — свої; errors, events,
  incidents, maintenance, wialon_check, id_counters — лише адмін; довідники —
  усім. **Новий екран, що читає чужі звіти/службові таблиці, — перевір правила**
  (RLS не дає помилки, просто поверне порожньо).
- **Контакти (з 2026-10-22):** Mini App читає `users` лише (id, full_name, role,
  status, created_at, code, is_owner); phone, telegram_id, note — лише адмін через
  `supaRpc('nab_admin_users', { p_user_id })`. `approvals.telegram_id` — не
  читається. Тому запис у `users` / `approvals` — **лише з `{ returnRows: false }`**
  (`supaInsert(t, data, { returnRows: false })`, `supaUpdate(t, f, data, { returnRows: false })`),
  і **ніколи `select=*` з users**. **Нова колонка в users/approvals** — окремий
  `grant select (колонка) on … to authenticated`, інакше Mini App її не побачить.
  TRUNCATE для authenticated відібрано.
- **Сховища (з 2026-10-22) приватні** (`exports`, `incident-media`): Mini App лише
  завантажує в `exports`; Make 7567518 бере файл через `/storage/v1/object/exports/…`
  із з'єднанням 11946171. Публічних посилань на файли більше немає.
- **Перевірити як користувач** (сухий прогін, без змін): у транзакції
  `set_config('request.jwt.claims', '{"role":"authenticated","app_metadata":{"nab_user_id":"USR-…"}}', true)`
  + `set local role authenticated`, у кінці `raise exception` з результатами —
  транзакція скасовується (так перевірено міграцію RLS 19.10).
- **Міграції:** створюй файл `docs/migrations/РРРР-ММ-ДД_назва.sql`:
  - лише `create or replace`, `add column if not exists`,
    `create index if not exists` — щоб повторний запуск був безпечним;
  - **нові таблиці (з 2026-10-20, RLS) — GRANT + RLS + 4 правила**, інакше
    API поверне `permission denied` або порожньо. **`anon` — НІКОЛИ:**
    ```sql
    grant select, insert, update, delete on public.<таблиця> to authenticated, service_role;
    alter table public.<таблиця> enable row level security;
    create policy nab_active_select on public.<таблиця> for select to authenticated using ((select public.nab_is_active_user()));
    create policy nab_active_insert on public.<таблиця> for insert to authenticated with check ((select public.nab_is_active_user()));
    create policy nab_active_update on public.<таблиця> for update to authenticated using ((select public.nab_is_active_user())) with check ((select public.nab_is_active_user()));
    create policy nab_active_delete on public.<таблиця> for delete to authenticated using ((select public.nab_is_active_user()));
    ```
  - нові функції, які викликає Mini App, — `grant execute on function ... to authenticated, service_role;`
    (+ `revoke execute ... from public, anon` — за замовчуванням Postgres дає всім)
  - у кінці файлу — закоментовані **тестові запити**, щоб користувач
    перевірив результат;
  - попередь користувача: Supabase показує "Potential issue detected /
    destructive operations", якщо в тексті є `delete`/`drop` — пояснюй,
    чи це реально щось видаляє;
  - після виконання (перевірочний запит → ОК) — у файлі міграції познач
    "СТАТУС: ВИКОНАНО <дата>", онови `docs/supabase_schema.sql`,
    `docs/DB_Schema_Document.md` (таблиця "Міграції, виконані в живій
    базі").
- `daily_reports.status` — вільний текст без CHECK: `Чернетка` →
  `Очікує відповідального` → `Фінально підтверджено` | `Повернено на коригування`.
- "duplicate key … already exists" при новому ID → лічильник відстав:
  `docs/migrations/sync_id_counters.sql` (якщо файлу немає — функція
  піднімає `id_counters.next_value` до max+1 по кожному префіксу; безпечно
  повторювати).
- Make викликає RPC з параметрами **за назвою** (`{"payload": …}`);
  заголовок `Prefer: params=single-object` поточний PostgREST ігнорує → 404.

---

## 8. Ключові бізнес-правила (не порушувати)

1. **`equipment.confirmed_hours` / `confirmed_km` змінюються лише при
   фінальному підтвердженні звіту** (= `end_hours` / `end_km`). Виняток:
   адмін вручну у формі техніки.
2. **Відхилення завжди з коментарем.** Розбіжність підставлених мотогодин
   (> 0,05) — завжди з причиною (`start_hours_note`).
3. **Години (схема з 2026-10-03):**
   - "Час роботи" = **лише робота на об'єкті**.
   - `total_person_hours` (робота на об'єкті) = (кінець − початок) − обід
     − ремонт (якщо ремонт > 0,5 год). Через північ +24 год. < 0 — форма не пускає.
   - Дорога на роботу (`commute_hours`), перебазування (`travel_hours`),
     перевезення людей (`transport_hours`) — вказуються **окремо** і
     **НЕ віднімаються**.
   - **Усього за звіт** (`reportTotalHours`) = робота + дорога +
     перебазування + перевезення + ремонт (лише якщо > 0,5).
   - Простій (`downtime_hours`) — лише для інформації, ніде не додається.
   - Перебазування: маршрут обов'язковий; години 0/порожньо = техніку
     перевіз **трал без оператора**.
   - **Другий оператор** (з 2026-10-14, лише техніка з
     `equipment.allows_two_operators` — укладач, фреза):
     `daily_reports.is_second_operator = true`, м/г і км `NULL` (веде
     основний), заправка — вносить хтось один, години повні. Тому м/г у
     підсумках рахуються один раз, людиногодини — обох.
4. **Довідники не видаляються — лише деактивуються.** Винятки (фізичне
   видалення): чернетка звіту; неактивний запис відповідального об'єкта;
   звіт — адміном (`deleteReportCompletely`, для дублів); **об'єкт без
   жодного поданого звіту — лише адміном** (`delete_object_completely`, з 12.10).
5. **Чернетки** ніде не показуються, крім банера оператора, і не
   викликають сповіщень (Make фільтрує).
6. **Форма оператора** — лише активна закріплена техніка (`user_equipment`)
   і лише активні об'єкти. **Форма адміна (редагування звіту)** — вся
   активна техніка + техніка звіту; лише активні об'єкти + об'єкт звіту
   з позначкою "— закритий/неактивний" (з 14.10).
7. **Конвенція ID** (`next_id(prefix)` → `PREFIX-001`): `USR` users, `EQ`
   equipment, `UE` user_equipment, `CST` customers, `OBJ` objects,
   `ASSIGN` object_responsible, `REP` daily_reports, `EDIT`
   report_edit_log, `APR` approvals, `RESP` код підтвердження, `CMP`
   wialon_check, `INC` incidents, `MNT` maintenance, `EVT` events, `ERR`
   errors, `EXP` export_files (дефолт у таблиці).

---

## 9. Make (автоматизації)

Організація `7949213`, команда `1882942`, тека "Автобаза 2.0 (Mini App)"
(`393598`), зона `eu1.make.com`.

| ID | Сценарій | Тригер | Що робить |
|---|---|---|---|
| `7498033` | Звіт: новий / зміна статусу → сповіщення | Webhook `3750374` ← Supabase webhook `new_daily_report` (daily_reports Insert+Update) | 🆕 новий звіт → відповідальному; ✅/🔧 → оператору; 🔄 повторна подача → відповідальному |
| `7533271` | Нагадування відповідальному | Розклад 21:00 / 08:00 / 09:00 щодня | ⏰ нагадування (лише активним відповідальним), 🔴 ескалація активним адмінам; дедуплікація через `events` |
| `7558328` | Звірка з Wialon | Пн–сб 09:30 | Збір даних Wialon по техніці → `wialon_check` |
| `7567518` | Вивантаження → файл у Telegram | Webhook `3774758` ← INSERT `export_files` | Надсилає Excel у бот, статус Надіслано/Помилка |

Знімки блюпринтів (стан 12.10) — `docs/make/`.

**Доступ Make до Supabase (з 14.10):** HTTP-модулі ходять у базу через
з'єднання **"Supabase НАБ (make)"** (HTTP v4 "API key", id `11946171`,
заголовок `apikey`, дозволено лише адресу бази) із секретним ключем `make`
— значення ключа знає лише користувач. У модулі: `"parameters":
{"authenticationType": "apiKeyConnection", "apiKeyAccount": 11946171}`,
без заголовків `apikey`/`Authorization`. Переведено **всі 4** сценарії (з 14.10): `7567518`, `7558328`, `7533271`,
`7498033` — publishable key у Make більше не використовується.
Нові HTTP-модулі до бази — **лише через це з'єднання**.

**Вебхуки Make вимагають ключ (з 22.10):** обидва вебхуки (3750374, 3774758) —
«API Key authentication», заголовок `x-make-apikey`; у Supabase (Integrations →
Database Webhooks) цей заголовок доданий у `new_daily_report` і
`export_files_to_make`. Значення знає лише користувач. **Новий Database Webhook
до Make — теж із цим заголовком**, інакше Make відповість 401 і подія загубиться
(видно в `net._http_response`).

**Пастки Make (усі знайдені на практиці):**
1. **Кожен Telegram-модуль МУСИТЬ мати обробник помилок** (з 12.10):
   HTTP `rpc/next_id` (`ERR`) → HTTP POST `errors` → `Ignore`. Без цього
   одна людина з неправильним Telegram ID (або яка не натиснула Start у
   боті — помилка `[400] chat not found`) **вимикає весь сценарій**
   (вебхукові сценарії Make деактивує після першої помилки).
2. Фільтр блокує весь подальший шлях, а не один модуль → взаємовиключні
   варіанти — завжди **Router** з гілками.
3. Статус порівнювати з даними події (`{{1.record.status}}`,
   `{{1.old_record.status}}`), а не з повторним HTTP-запитом.
4. HTTP-модулі (`http:MakeRequest` v4), створені через API, мають містити
   `"parameters": {"authenticationType": "noAuth"}` і в mapper
   `allowRedirects`, `shareCookies`, `requestCompressedContent` — інакше
   BundleValidationError і Make вимикає сценарій.
5. Embed одного довідника двічі — аліаси:
   `operator:users!daily_reports_operator_id_fkey(...)`,
   `responsible:users!daily_reports_responsible_id_fkey(...)`.
6. Масиви з HTTP індексуються з 1: `{{2.data[1].field}}`.
7. Фільтри часу: не порівнювати `"HH:mm"` числовими операторами; у
   `7533271` — `formatDate(now; "HHmm"; "Europe/Kyiv")` числом у діапазоні
   (2100–2105 / 0800–0805 / 0900–0905).
8. **`interval` розкладу не змінювати без погодження** — це кількість
   запусків і кредити.
9. `scenarios_update` через API **повністю замінює** блюпринт — спершу
   отримати поточний, змінити, відправити повністю.

**Доступ до Make з Claude Code:** якщо в цій сесії немає інструментів
Make (MCP) — давай користувачу покрокові інструкції для UI Make.
Користувач часто хоче змінювати Make сам через UI.

---

## 10. Wialon (GPS)

- API `https://hst-api.wialon.com/wialon/ajax.html`, акаунт `avtobazabeton`.
- Токен додатка "AvtobazaMiniApp" — лише в Make (і в майбутньому в
  секретах Supabase Edge Functions). **Ніколи не в коді й не в docs.**
- Шаблон звіту "Звіт (Пальне)": ресурс `799055`, шаблон `1`. Поля беруться
  за назвою: "Моточасы", "Заправлено", "Слито", "Пробег".
- Довідник 68 юнітів з ID — `docs/Wialon_units.md`.
- Звірка — по техніці за добу, не по окремому звіту (у техніки може бути
  кілька звітів за день).

---

## 11. Як перевіряти зміни (до push)

1. **Синтаксис кожного зміненого JS:** `node --check js/<файл>.js`.
2. **Логіка** — для нетривіальних функцій напиши швидкий тест у тимчасовій
   папці поза репозиторієм: завантаж файл у `vm` з заглушками `supaGet` /
   `supaRpc` / `alert` / `confirm` і перевір гілки (успіх / помилка / блокування).
3. **Перевір, що не зачепив інше:** `git diff` — лише очікувані рядки.
4. **Сценарій ручної перевірки для користувача** — напиши коротко: яку
   роль відкрити, куди натиснути, що має з'явитися. Користувач тестує в
   Telegram після push і повного перезапуску Mini App.
5. Нічого не вважай "готовим", доки користувач не підтвердив, що працює.

---

## 12. Документація (`docs/`, не в GitHub)

Репозиторій публічний, тому внутрішні документи (структура бази, ID
сценаріїв Make, Wialon) лежать лише локально в `docs/` (у `.gitignore`).
Копія цих документів є і в проєкті на claude.ai — користувач оновлює її
сам, коли вважає за потрібне. **Не нагадувати про це** (вимога
користувача 14.10).

| Файл | Що в ньому |
|---|---|
| `docs/TODO.md` | **Поточні незавершені кроки, що перевірити, наступні задачі** |
| `docs/CHANGELOG.md` | Хронологія змін по датах |
| `docs/Automation_Logic_Overview.md` | Уся бізнес-логіка: процеси, екрани, Make, Wialon, плани |
| `docs/DB_Schema_Document.md` | Таблиці й поля з поясненнями, функції, міграції |
| `docs/supabase_schema.sql` | Повна схема БД (довідка; на живій базі НЕ запускати) |
| `docs/Repository_and_workflow.md` | Робочий процес з кодом, Make, Supabase |
| `docs/Wialon_units.md` | 68 юнітів Wialon з ID |
| `docs/migrations/` | SQL-міграції (готові й виконані) |
| `docs/make/` | Знімки блюпринтів Make |
| `docs/related/` | Контекст VS Group / ХХІ століття плюс і план розвитку |

**Після кожної завершеної зміни:**
1. онови відповідні розділи `docs/Automation_Logic_Overview.md` (і дату
   "Актуалізовано"), `docs/DB_Schema_Document.md` / `docs/supabase_schema.sql`
   (якщо змінювалась база);
2. додай запис у `docs/CHANGELOG.md`, онови `docs/TODO.md`;
3. онови дату й останній коміт у шапці цього `CLAUDE.md`, якщо змінилось
   щось із розділів 6–9.

`CLAUDE.md` і `.gitignore` комітяться в репозиторій (у них немає
секретів).

---

## 13. Типові проблеми й рішення

| Симптом | Причина / рішення |
|---|---|
| Сповіщення в Telegram перестали приходити | Перевір, чи сценарій `7498033` активний (Make вимикає вебхуковий сценарій після помилки). Подивись таблицю `errors` (`action_id = 'TELEGRAM_SEND'`). Після ввімкнення Make сам обробить накопичену чергу |
| `[400] Bad Request: chat not found` | Людина не натиснула Start у `@nadvirna_avtobaza_bot` або неправильний `users.telegram_id` (звірити через `@userinfobot`). Або людина помилково стоїть відповідальним/роллю |
| Зміни не видно в Mini App | Кеш Telegram / GitHub Pages ще не оновився (розділ 3) |
| `duplicate key … already exists` | Лічильник `id_counters` відстав → `sync_id_counters.sql` |
| `permission denied` на новій таблиці | Немає GRANT для `authenticated` або RLS-правил (розділ 7) |
| "Не вдалося увійти" / "Сесія завершилась" | Дивись `errors` з `action_id = 'TG_AUTH'` (пише `tg-auth`): `403 not_found` — немає в `users` / неправильний `telegram_id`; `inactive`; `401 expired` — старий initData (закрити й відкрити Mini App); таймаут — слабкий інтернет |
| `invalid input syntax for type time` | У поле часу пішло "—" або неповний час; лише `ГГ:ХВ` або NULL |
| Excel "відновлення книги" | Апостроф `'` у назві аркуша → `xlNewSheet` замінює на `’` |
| Дублі звітів | Захист з 25.09 (черга чернеток + пошук дублів); старі дублі адмін видаляє ("⚠ СХОЖЕ НА ДУБЛЬ") |

---

## 14. Пов'язані проєкти (контекст)

- **VS Group** — група підприємств: **НАБ** (ця система), **ХХІ століття
  плюс** (дорожній підрядник, орендує всю техніку в НАБ), Кар'єр. Планується
  спільна оболонка Mini App + **спільна база Supabase**, окремі боти.
  ХХІ проєктується в окремому проєкті claude.ai "VS GROUP". **НАБ
  підключається до VS Group пізніше, без змін у своїй роботі** — тож не
  перейменовуй і не видаляй таблиці/функції НАБ. Деталі —
  `docs/related/XXI_Start_Context.md`, `docs/related/VS_Group_development_plan.md`.
- **Дипломний проєкт** (бот + Apps Script + Google Sheets) — окремо, не
  чіпати.

---

## 15. Поточний стан і найближчі кроки

Див. **`docs/TODO.md`** — там актуальний перелік. Коротко на 20.10 (вечір):
1. 🔐 **Захист даних:** ✅ Make на секретному ключі, ✅ `tg-auth`, ✅ Mini App
   з пропуском, ✅ **RLS** (anon без прав), ✅ 👑 власник (кроки 1–4: позначка,
   журнал змін, захист у базі, екран "Журнал"), ✅ запити доступу, ✅ канал 1С.
   **21.10 вранці** — перевірити перші реальні звіти, Make (🆕/✅, нагадування,
   Wialon), `errors`, записи в журналі.
   ✅ **22.10 права за ролями — ЗАПИС** і **ЧИТАННЯ крок А** (⏳ перевірка в Telegram).
   ✅ **Крок Б** — телефони/Telegram ID лише адмінам (код `985cf97` + база, 22.10).
   **Лишилось (порядок):** ✅ секрет у вебхуках Make і ✅ приватні сховища (22.10); (3) власник кроки 5–6 (UI
   "🗑 Видалити назавжди", приховати роль "Адміністратор" для не-власника,
   "⛔ Заблокувати негайно") — ✅ 22.10; (4) ✅ `escHtml` (22.10);
   (5) ⏸ токен Wialon у Make — пауза (рішення користувача 22.10).
2. 🔌 **1С:** з 22.10 `ONEC_API_TOKEN` — власний токен користувача (значення
   знає лише він; тестовий більше не діє); колонки уточнить (тоді прибрати
   зайві в `toOut`).
2. ✅ Перевірено 14.10: "основний + другий оператор"; ЄДРПОУ / "Код /
   номер" / пошук у довідниках.
3. Відкладено (за рішенням користувача): формат номерів об'єктів/техніки/
   користувачів (повідомлять пізніше); перевірка фільтра об'єктів в адміна і
   видалення об'єкта. Не потрібно: підказка "Start у боті".
4. Далі: паливо з Wialon для оператора, оновлення інструкцій .docx.

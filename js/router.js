// ---------- Точка входу: ідентифікація користувача і роутинг за роллю ----------

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const MSG_NOT_FOUND = 'Тебе не знайдено в системі. Зверніться до адміністратора.';
// (з 2026-10-20) 📨 tg-auth сам створює запит доступу для нової людини
const MSG_REQUEST_SENT = 'Тебе ще немає в системі. Запит на доступ надіслано адміністратору — щойно його схвалять, закрий і відкрий Mini App знову.';
const MSG_REQUEST_REJECTED = 'Доступ не надано. Якщо це помилка — зверніться до адміністратора.';
const MSG_INACTIVE = 'Твій обліковий запис неактивний. Зверніться до адміністратора.';
const MSG_LOGIN_FAILED = 'Не вдалося увійти. Натисни «Спробувати ще раз» або закрий Mini App повністю і відкрий знову. Якщо повторюється — напиши адміністратору.';
const MSG_LOGIN_EXPIRED = 'Дані входу від Telegram застаріли. Закрий Mini App повністю і відкрий знову. Якщо повторюється — напиши адміністратору.';

// (з 2026-10-20) На телефонах зі слабким інтернетом перша спроба входу буває
// не встигає (20.10: двоє людей — відповідь не дійшла за 8 с) — тому друга
// спроба автоматично, а потім кнопка "Спробувати ще раз".
const LOGIN_ATTEMPTS = 2;
const LOGIN_RETRY_PAUSE_MS = 1000;

// Вхід через tg-auth з повтором. Повертає { user } | { message } | { failed: true, expired }
async function signInWithRetry() {
  for (let attempt = 1; attempt <= LOGIN_ATTEMPTS; attempt++) {
    try {
      const r = await authSignIn(tg.initData || '');
      if (r.ok) return { user: r.user };
      if (r.status === 403 && r.error === 'not_found') {
        if (r.request === 'created' || r.request === 'pending') return { message: MSG_REQUEST_SENT };
        if (r.request === 'rejected') return { message: MSG_REQUEST_REJECTED };
        return { message: MSG_NOT_FOUND };
      }
      if (r.status === 403 && r.error === 'inactive') return { message: MSG_INACTIVE };
      // Поганий підпис / застарілий initData — повтор з тими самими даними не допоможе
      if (r.status === 401) return { failed: true, expired: true };
    } catch (e) {
      // таймаут або немає мережі — пробуємо ще раз
    }
    if (attempt < LOGIN_ATTEMPTS) {
      renderMessage('Вхід… (ще одна спроба)');
      await new Promise(resolve => setTimeout(resolve, LOGIN_RETRY_PAUSE_MS));
    }
  }
  return { failed: true, expired: false };
}

function renderLoginFailed() {
  app.innerHTML = `
    <div class="msg">
      ${MSG_LOGIN_FAILED}
      <div style="margin-top: 20px;">
        <button class="btn-confirm" id="login-retry" style="flex: none; padding: 12px 24px;">🔄 Спробувати ще раз</button>
      </div>
    </div>`;
  document.getElementById('login-retry').onclick = () => main();
}

async function main() {
  const tgUser = tg.initDataUnsafe?.user;

  if (!tgUser) {
    renderMessage('Не вдалося визначити користувача. Відкрий цю сторінку через кнопку меню бота в Telegram.');
    return;
  }

  // (з 2026-10-19) Вхід із пропуском: tg-auth перевіряє підпис Telegram, білий
  // список users і видає сесію — далі всі запити supa* ідуть з нею
  // (supabase-client.js). З 2026-10-20 (RLS) запасного шляху немає: база без
  // пропуску не відповідає. Збої входу записує в errors сам tg-auth.
  renderMessage('Вхід…');
  const login = await signInWithRetry();

  if (login.message) {
    renderMessage(login.message);
    return;
  }
  if (login.failed) {
    if (login.expired) renderMessage(MSG_LOGIN_EXPIRED);
    else renderLoginFailed();
    return;
  }

  const currentUser = login.user;

  // "Водій" — не окрема роль, а лише позначка в списку користувачів:
  // у Mini App працює так само, як Оператор (те саме меню і форма звіту).
  if (currentUser.role === 'Оператор' || currentUser.role === 'Водій') {
    renderOperatorHome(currentUser);
  } else if (currentUser.role === 'Відповідальний') {
    renderResponsibleHome(currentUser);
  } else if (currentUser.role === 'Адміністратор') {
    renderAdminHome(currentUser);
  } else if (currentUser.role === 'Обліковець') {
    renderAccountantHome(currentUser);
  } else {
    renderMessage(`Роль "${currentUser.role}" поки не реалізована в цій версії Mini App. Скоро буде.`);
  }
}

main();

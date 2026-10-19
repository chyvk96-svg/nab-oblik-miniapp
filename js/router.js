// ---------- Точка входу: ідентифікація користувача і роутинг за роллю ----------

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const MSG_NOT_FOUND = 'Тебе не знайдено в системі. Зверніться до адміністратора.';
const MSG_INACTIVE = 'Твій обліковий запис неактивний. Зверніться до адміністратора.';

async function main() {
  const tgUser = tg.initDataUnsafe?.user;

  if (!tgUser) {
    renderMessage('Не вдалося визначити користувача. Відкрий цю сторінку через кнопку меню бота в Telegram.');
    return;
  }

  // (з 2026-10-19) Вхід із пропуском: tg-auth перевіряє підпис Telegram і видає
  // сесію — далі всі запити supa* ідуть з нею (supabase-client.js).
  let currentUser = null;
  let authFail = '';
  try {
    const r = await authSignIn(tg.initData || '');
    if (r.ok) {
      currentUser = r.user;
    } else if (r.status === 403 && r.error === 'not_found') {
      renderMessage(MSG_NOT_FOUND);
      return;
    } else if (r.status === 403 && r.error === 'inactive') {
      renderMessage(MSG_INACTIVE);
      return;
    } else {
      authFail = `HTTP ${r.status}: ${r.error}${r.reason ? ' / ' + r.reason : ''}`;
    }
  } catch (e) {
    authFail = e?.name === 'AbortError' ? 'timeout' : `network: ${e?.message || e}`;
  }

  // Запасний шлях (поки RLS вимкнено): як було до 19.10 — пошук у users з publishable key
  if (!currentUser) {
    let users;
    try {
      users = await supaGet('users', `telegram_id=eq.${tgUser.id}&select=id,full_name,role,status`);
    } catch (e) {
      renderMessage('Помилка з\'єднання з базою даних: ' + e.message);
      return;
    }

    if (!users || users.length === 0) {
      renderMessage(MSG_NOT_FOUND);
      return;
    }

    currentUser = users[0];

    if (currentUser.status !== 'Активний') {
      renderMessage(MSG_INACTIVE);
      return;
    }
  }

  authSetUserInfo(tgUser.id, currentUser);
  if (authFail) authLogFallback(`вхід: ${authFail} — запасний шлях`);

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

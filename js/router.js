// ---------- Точка входу: ідентифікація користувача і роутинг за роллю ----------

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// ---------- Тіньова перевірка входу з пропуском (з 2026-10-19, тимчасово) ----------
// У фоні викликає Edge Function tg-auth і пробує пропуском прочитати свій рядок
// users. На роботу Mini App НЕ впливає: результат не використовується, пропуск
// ніде не зберігається, користувач нічого не бачить. Збій пишеться в errors
// (action_id = 'TG_AUTH_SHADOW'), успіх видно в Supabase Auth.
// Прибрати, коли Mini App перейде на пропуск.
const TG_AUTH_TIMEOUT_MS = 10000;

async function shadowTgAuth(currentUser, tgUser) {
  let reason = '';
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TG_AUTH_TIMEOUT_MS);
    let res, body;
    try {
      res = await fetch(`${SUPABASE_URL}/functions/v1/tg-auth`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData || '' }),
        signal: ctrl.signal
      });
      body = await res.json().catch(() => ({}));
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok || !body.access_token) {
      reason = `HTTP ${res.status}: ${body.error || '?'}${body.reason ? ' / ' + body.reason : ''}`;
    } else if (body.user?.id !== currentUser.id) {
      reason = `інший користувач: ${body.user?.id || '?'}`;
    } else {
      // Пробний запит пропуском — чи приймає його база
      const check = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(currentUser.id)}&select=id`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${body.access_token}` }
      });
      if (!check.ok) reason = `token_rejected: HTTP ${check.status}`;
    }
  } catch (e) {
    reason = e?.name === 'AbortError' ? 'timeout' : `network: ${e?.message || e}`;
  }

  if (!reason) return;
  try {
    const errId = await supaRpc('next_id', { p_prefix: 'ERR' });
    await supaInsert('errors', {
      id: errId,
      telegram_id: tgUser.id,
      user_name: `${currentUser.full_name} (${currentUser.role})`,
      action_id: 'TG_AUTH_SHADOW',
      description: String(reason).slice(0, 500),
      source: 'Mini App'
    });
  } catch (e) {
    // Тихо: тіньова перевірка не має заважати роботі
  }
}

async function main() {
  const tgUser = tg.initDataUnsafe?.user;

  if (!tgUser) {
    renderMessage('Не вдалося визначити користувача. Відкрий цю сторінку через кнопку меню бота в Telegram.');
    return;
  }

  let users;
  try {
    users = await supaGet('users', `telegram_id=eq.${tgUser.id}&select=id,full_name,role,status`);
  } catch (e) {
    renderMessage('Помилка з\'єднання з базою даних: ' + e.message);
    return;
  }

  if (!users || users.length === 0) {
    renderMessage('Тебе не знайдено в системі. Зверніться до адміністратора.');
    return;
  }

  const currentUser = users[0];

  if (currentUser.status !== 'Активний') {
    renderMessage('Твій обліковий запис неактивний. Зверніться до адміністратора.');
    return;
  }

  // У фоні, без await — меню відкривається одразу, як і раніше
  shadowTgAuth(currentUser, tgUser).catch(() => {});

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

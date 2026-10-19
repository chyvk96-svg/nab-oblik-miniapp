// ---------- Supabase REST API helpers ----------
// Ці функції не міняються при додаванні нових екранів —
// це базовий шар зв'язку з базою даних, спільний для всіх ролей.

// ---------- Пропуск (сесія Supabase Auth від Edge Function tg-auth), з 2026-10-19 ----------
// router.js при відкритті викликає authSignIn(initData) → усі запити нижче йдуть
// з пропуском (роль authenticated) замість publishable key. Пропуск діє ~1 год:
// перед запитом, якщо до кінця < 5 хв, — оновлення (refresh_token), не вийшло —
// повторний вхід через tg-auth (initData дійсний 24 год).
// ЗАПАСНИЙ ШЛЯХ (поки RLS вимкнено): немає пропуску → запит з publishable key,
// як раніше, збій пишеться в errors (action_id = 'TG_AUTH'). Після вмикання RLS
// запасний шлях перестане працювати — тоді замінити на повідомлення "перезапусти".
const AUTH_REFRESH_MARGIN_SEC = 300;
const TG_AUTH_TIMEOUT_MS = 8000;

let authSession = null;       // { access_token, refresh_token, expires_at }
let authRenewPromise = null;  // одне оновлення на всі одночасні запити
let authUserInfo = null;      // для запису збою в errors
let authFallbackLogged = false;

function authNowSec() {
  return Math.floor(Date.now() / 1000);
}

async function fetchWithTimeout(url, init, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

function authSetSession(body) {
  authSession = {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: Number(body.expires_at) || (authNowSec() + (Number(body.expires_in) || 3600))
  };
}

// Вхід через tg-auth. Повертає { ok: true, user } або { ok: false, status, error, reason }.
// Таймаут і обрив мережі — виняток (обробляє той, хто викликав).
async function authSignIn(initData) {
  const res = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/tg-auth`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData: initData || '' })
  }, TG_AUTH_TIMEOUT_MS);
  const body = await res.json().catch(() => ({}));
  if (res.ok && body.access_token) {
    authSetSession(body);
    return { ok: true, user: body.user };
  }
  return { ok: false, status: res.status, error: body.error || '?', reason: body.reason || '' };
}

async function authRefresh() {
  const res = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: authSession.refresh_token })
  }, TG_AUTH_TIMEOUT_MS);
  if (!res.ok) return false;
  const body = await res.json().catch(() => ({}));
  if (!body.access_token) return false;
  authSetSession(body);
  return true;
}

function authRenew() {
  if (!authRenewPromise) {
    authRenewPromise = (async () => {
      try {
        if (authSession?.refresh_token && await authRefresh()) return true;
      } catch (e) { /* далі — повторний вхід */ }
      try {
        const r = await authSignIn(window.Telegram?.WebApp?.initData || '');
        if (r.ok) return true;
      } catch (e) { /* далі — запасний шлях */ }
      authSession = null;
      authLogFallback('не вдалося оновити пропуск — запасний шлях');
      return false;
    })().finally(() => { authRenewPromise = null; });
  }
  return authRenewPromise;
}

async function authBearer() {
  if (!authSession) return SUPABASE_KEY;
  if (authNowSec() >= authSession.expires_at - AUTH_REFRESH_MARGIN_SEC) await authRenew();
  return authSession ? authSession.access_token : SUPABASE_KEY;
}

function authSetUserInfo(telegramId, user) {
  authUserInfo = { telegram_id: telegramId, user_name: `${user.full_name} (${user.role})` };
}

// Запис збою пропуску в errors — один раз за відкриття Mini App, тихо
async function authLogFallback(reason) {
  if (authFallbackLogged) return;
  authFallbackLogged = true;
  try {
    const errId = await supaRpc('next_id', { p_prefix: 'ERR' });
    await supaInsert('errors', {
      id: errId,
      telegram_id: authUserInfo?.telegram_id ?? null,
      user_name: authUserInfo?.user_name ?? null,
      action_id: 'TG_AUTH',
      description: String(reason).slice(0, 500),
      source: 'Mini App'
    });
  } catch (e) {
    // Тихо: запис збою не має заважати роботі
  }
}

// Спільний запит до Supabase: пропуск (або publishable key) + один повтор після 401
async function supaFetch(url, init = {}) {
  const send = bearer => fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${bearer}` }
  });
  const bearer = await authBearer();
  let res = await send(bearer);
  if (res.status === 401 && bearer !== SUPABASE_KEY) {
    await authRenew();
    res = await send(authSession ? authSession.access_token : SUPABASE_KEY);
  }
  return res;
}

async function supaGet(table, query) {
  const res = await supaFetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`);
  if (!res.ok) throw new Error(`Помилка запиту до ${table}: ${res.status}`);
  return res.json();
}

async function supaInsert(table, data) {
  const res = await supaFetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Помилка запису в ${table}: ${errText}`);
  }
  return res.json();
}

async function supaUpdate(table, filterQuery, data) {
  const res = await supaFetch(`${SUPABASE_URL}/rest/v1/${table}?${filterQuery}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Помилка оновлення ${table}: ${errText}`);
  }
  return res.json();
}

async function supaDelete(table, filterQuery) {
  const res = await supaFetch(`${SUPABASE_URL}/rest/v1/${table}?${filterQuery}`, {
    method: 'DELETE',
    headers: {
      'Prefer': 'return=representation'
    }
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Помилка видалення з ${table}: ${errText}`);
  }
  return res.json();
}

async function supaRpc(fnName, params) {
  const res = await supaFetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });
  if (!res.ok) throw new Error(`Помилка виклику функції ${fnName}`);
  return res.json();
}

// Завантаження файлу в Storage (з 2026-10-19 — спільне для admin.js і operator.js)
async function supaStorageUpload(bucket, path, blob, contentType) {
  const res = await supaFetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'x-upsert': 'false'
    },
    body: blob
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error('не вдалося зберегти файл у сховище: ' + errText);
  }
}

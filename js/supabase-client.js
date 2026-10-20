// ---------- Supabase REST API helpers ----------
// Ці функції не міняються при додаванні нових екранів —
// це базовий шар зв'язку з базою даних, спільний для всіх ролей.

// ---------- Пропуск (сесія Supabase Auth від Edge Function tg-auth), з 2026-10-19 ----------
// router.js при відкритті викликає authSignIn(initData) → усі запити нижче йдуть
// з пропуском (роль authenticated) замість publishable key. Пропуск діє ~1 год:
// перед запитом, якщо до кінця < 5 хв, — оновлення (refresh_token), не вийшло —
// повторний вхід через tg-auth (initData дійсний 24 год).
// (з 2026-10-20, RLS) Запасного шляху з publishable key більше немає — база
// його не пускає. Немає пропуску → помилка MSG_SESSION_ENDED (показують ті, хто
// викликав supa*, як будь-яку іншу помилку). Збої входу пише в errors сам tg-auth.
const AUTH_REFRESH_MARGIN_SEC = 300;
const TG_AUTH_TIMEOUT_MS = 20000; // (з 2026-10-20; було 8 с — замало для слабкого інтернету)
const MSG_SESSION_ENDED = 'Сесія завершилась — закрий і відкрий Mini App знову';

let authSession = null;       // { access_token, refresh_token, expires_at }
let authRenewPromise = null;  // одне оновлення на всі одночасні запити

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
      } catch (e) { /* пропуску немає */ }
      authSession = null;
      return false;
    })().finally(() => { authRenewPromise = null; });
  }
  return authRenewPromise;
}

async function authBearer() {
  if (authSession && authNowSec() >= authSession.expires_at - AUTH_REFRESH_MARGIN_SEC) await authRenew();
  if (!authSession) throw new Error(MSG_SESSION_ENDED);
  return authSession.access_token;
}

// Спільний запит до Supabase: пропуск + один повтор після 401 (пропуск протух)
async function supaFetch(url, init = {}) {
  const send = bearer => fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${bearer}` }
  });
  let res = await send(await authBearer());
  if (res.status === 401) {
    await authRenew();
    res = await send(await authBearer());
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

// Edge Function tg-auth — вхід у Mini App із "пропуском" (з 2026-10-19).
//
// Mini App надсилає сирий рядок Telegram initData → функція:
//   1) перевіряє підпис токеном бота і вік (≤ 24 год) — verify.ts;
//   2) шукає активного користувача в users за telegram_id (білий список);
//   3) створює (лише при першому вході) запис у Supabase Auth зі службовою
//      адресою tg<telegram_id>@nab-oblik.local і nab_user_id в app_metadata;
//   4) видає сесію Supabase Auth (access_token ~1 год + refresh_token).
// Підпис JWT проєкту ES256, тож власний JWT не підписати — сесію видає Auth.
// Самостійна реєстрація в Auth вимкнена: записи створює лише ця функція.
//
// Розгортання — з --no-verify-jwt (функцію викликають ДО входу).
// Секрети: TELEGRAM_BOT_TOKEN (Supabase → Edge Functions → Secrets).
// Ключі Supabase функція отримує з оточення автоматично.

import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import { verifyInitData } from './verify.ts';

const ALLOWED_ORIGINS = ['https://chyvk96-svg.github.io'];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Vary': 'Origin',
  };
}

function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

// Нові ключі Supabase (SUPABASE_SECRET_KEYS / SUPABASE_PUBLISHABLE_KEYS — JSON
// {"default": "..."}) мають пріоритет; старі (service_role / anon) — запасний варіант.
function envKey(newName: string, legacyName: string): string {
  const raw = Deno.env.get(newName);
  if (raw) {
    try {
      const obj = JSON.parse(raw);
      const k = obj?.default ?? Object.values(obj ?? {})[0];
      if (typeof k === 'string' && k) return k;
    } catch { /* не JSON — пробуємо старий ключ */ }
  }
  return Deno.env.get(legacyName) || '';
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SECRET_KEY = envKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');
const PUBLIC_KEY = envKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

type Admin = ReturnType<typeof createClient>;

// (з 2026-10-20) Збої входу пише сама функція (секретним ключем): після RLS
// Mini App без пропуску записати в errors уже не зможе. Тихо — помилка запису
// не впливає на відповідь.
async function logFail(admin: Admin, telegramId: number | null, userName: string | null, description: string) {
  try {
    const { data: errId, error } = await admin.rpc('next_id', { p_prefix: 'ERR' });
    if (error || !errId) return;
    await admin.from('errors').insert({
      id: errId,
      telegram_id: telegramId,
      user_name: userName,
      action_id: 'TG_AUTH',
      description: description.slice(0, 500),
      source: 'tg-auth',
    });
  } catch (e) {
    console.error('tg-auth: logFail', (e as Error)?.message);
  }
}

// Telegram ID з НЕперевіреного initData — лише для запису збою підпису/віку
function claimedTelegramId(initData: string): number | null {
  try {
    const id = Number(JSON.parse(new URLSearchParams(initData).get('user') || '{}')?.id);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, 405, { error: 'method_not_allowed' });

  if (!SUPABASE_URL || !SECRET_KEY || !PUBLIC_KEY || !BOT_TOKEN) {
    console.error('tg-auth: бракує налаштувань', {
      url: !!SUPABASE_URL, secret: !!SECRET_KEY, public: !!PUBLIC_KEY, bot: !!BOT_TOKEN,
    });
    return json(req, 500, { error: 'server_misconfigured' });
  }

  let initData = '';
  try {
    initData = (await req.json())?.initData || '';
  } catch {
    return json(req, 400, { error: 'bad_request' });
  }

  const admin = createClient(SUPABASE_URL, SECRET_KEY, noSession);

  // 1) Підпис і вік. Порожні/безглузді запити не пишемо (щоб не засмічувати errors) —
  // лише ті, де є Telegram ID: поганий підпис, прострочений initData тощо.
  const check = await verifyInitData(initData, BOT_TOKEN);
  if (!check.ok) {
    const claimed = claimedTelegramId(initData);
    if (claimed) await logFail(admin, claimed, null, `401 ${check.reason} (Telegram ID не перевірено)`);
    return json(req, 401, { error: 'invalid_init_data', reason: check.reason });
  }

  // 2) Білий список — так само, як router.js: перший запис з цим telegram_id
  const { data: rows, error: usersErr } = await admin
    .from('users')
    .select('id,full_name,role,status')
    .eq('telegram_id', check.telegramId)
    .limit(1);
  const tgId = check.telegramId;
  const tgName = [check.user.first_name, check.user.last_name].filter(Boolean).join(' ')
    + (check.user.username ? ` @${check.user.username}` : '');

  if (usersErr) {
    console.error('tg-auth: users', usersErr.message);
    await logFail(admin, tgId, tgName, `500 db_error: ${usersErr.message}`);
    return json(req, 500, { error: 'db_error' });
  }
  const nabUser = rows?.[0];
  if (!nabUser) {
    await logFail(admin, tgId, `${tgName} (немає в users)`, '403 not_found');
    return json(req, 403, { error: 'not_found' });
  }
  const nabName = `${nabUser.full_name} (${nabUser.role})`;
  if (nabUser.status !== 'Активний') {
    await logFail(admin, tgId, nabName, `403 inactive (статус: ${nabUser.status})`);
    return json(req, 403, { error: 'inactive' });
  }

  // Технічний збій видачі пропуску — записати і відповісти 500
  const fail500 = async (error: string, msg?: string) => {
    console.error(`tg-auth: ${error}`, msg);
    await logFail(admin, tgId, nabName, `500 ${error}${msg ? ': ' + msg : ''}`);
    return json(req, 500, { error });
  };

  // 3) Запис у Supabase Auth (створюється один раз; повторно — "уже існує", це нормально)
  const email = `tg${check.telegramId}@nab-oblik.local`;
  const appMeta = { nab_user_id: nabUser.id, telegram_id: check.telegramId };
  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: appMeta,
    user_metadata: { full_name: nabUser.full_name },
  });
  if (createErr && createErr.status !== 422 && (createErr as { code?: string }).code !== 'email_exists') {
    return await fail500('auth_create_failed', createErr.message);
  }

  // 4) Сесія: одноразове посилання (лист не надсилається) → обмін на сесію
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (linkErr || !link?.properties?.hashed_token) {
    return await fail500('auth_link_failed', linkErr?.message);
  }

  // Якщо telegram_id перейшов до іншого запису users — оновити прив'язку ДО видачі сесії
  const authUser = link.user;
  if (authUser && authUser.app_metadata?.nab_user_id !== nabUser.id) {
    const { error: updErr } = await admin.auth.admin.updateUserById(authUser.id, { app_metadata: appMeta });
    if (updErr) return await fail500('auth_update_failed', updErr.message);
  }

  const pub = createClient(SUPABASE_URL, PUBLIC_KEY, noSession);
  const { data: otp, error: otpErr } = await pub.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: 'email',
  });
  if (otpErr || !otp?.session) return await fail500('auth_session_failed', otpErr?.message);

  return json(req, 200, {
    access_token: otp.session.access_token,
    refresh_token: otp.session.refresh_token,
    expires_at: otp.session.expires_at,
    user: nabUser,
  });
});

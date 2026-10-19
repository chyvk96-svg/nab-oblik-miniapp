// Перевірка підпису Telegram initData (з 2026-10-19, крок "захист даних").
// Алгоритм — з документації Telegram Mini Apps:
//   secret_key = HMAC_SHA256(ключ "WebAppData", дані = токен бота)
//   hash       = hex(HMAC_SHA256(ключ secret_key, дані = data_check_string))
// data_check_string — усі поля, крім hash, відсортовані за назвою, "назва=значення"
// через перенос рядка. Підробити без токена бота неможливо.
// Без залежностей: працює і в Supabase Edge Functions (Deno), і в Node для тестів.

export const INIT_DATA_MAX_AGE_SEC = 24 * 60 * 60; // 24 год — погоджено користувачем 19.10

export type InitDataResult =
  | { ok: true; telegramId: number; user: Record<string, unknown>; authDate: number }
  | { ok: false; reason: string };

const enc = new TextEncoder();

async function hmac(key: Uint8Array, data: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(data)));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

// Порівняння без витоку часу (щоб не підбирали підпис по символу)
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyInitData(
  initData: string,
  botToken: string,
  nowSec: number = Math.floor(Date.now() / 1000),
  maxAgeSec: number = INIT_DATA_MAX_AGE_SEC,
): Promise<InitDataResult> {
  if (!initData || typeof initData !== 'string') return { ok: false, reason: 'no_init_data' };
  if (!botToken) return { ok: false, reason: 'no_bot_token' };

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return { ok: false, reason: 'no_hash' };
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = await hmac(enc.encode('WebAppData'), botToken);
  const expected = toHex(await hmac(secretKey, dataCheckString));
  if (!safeEqual(expected, hash.toLowerCase())) return { ok: false, reason: 'bad_signature' };

  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || authDate <= 0) return { ok: false, reason: 'no_auth_date' };
  if (nowSec - authDate > maxAgeSec) return { ok: false, reason: 'expired' };
  if (authDate - nowSec > 300) return { ok: false, reason: 'future_auth_date' }; // годинник уперед > 5 хв

  let user: Record<string, unknown>;
  try {
    user = JSON.parse(params.get('user') || '');
  } catch {
    return { ok: false, reason: 'no_user' };
  }
  const telegramId = Number(user?.id);
  if (!Number.isSafeInteger(telegramId) || telegramId <= 0) return { ok: false, reason: 'no_user' };

  return { ok: true, telegramId, user, authDate };
}

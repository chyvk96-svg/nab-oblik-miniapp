// Edge Function export-1c — звіти по об'єктах для 1С (з 2026-10-20).
//
// 1С сама звертається за розкладом і забирає ФІНАЛЬНО ПІДТВЕРДЖЕНІ звіти за
// період (як аркуш "Звіти" у Excel "Звіт по об'єкту"). Лише читання, лише
// потрібні поля — без телефонів, Telegram ID, Wialon, журналу.
//
//   GET /functions/v1/export-1c?from=2026-10-01&to=2026-10-31[&object_code=000000130]
//
// (з 2026-10-20) Об'єкт, техніка, оператор — лише "Код / номер" з довідників
// (= код у 1С) і назва; замовник — ЄДРПОУ і назва. Внутрішніх номерів НАБ
// (OBJ-/EQ-/USR-/CST-) у відповіді немає — на вимогу користувача. Лишається
// report_id (REP-…) — унікальний ключ звіту для оновлення в 1С.
//   Заголовок: X-Api-Key: <токен 1С>
//
// Токен — секрет ONEC_API_TOKEN (Supabase → Edge Functions → Secrets); його
// знає лише користувач і програміст 1С. Це НЕ publishable key і НЕ ключ Make:
// замінити токен можна будь-коли, нічого іншого не зачіпаючи.
// Кожне звернення (і невдале) пишеться в api_access_log — видно в "📜 Журнал".
// Розгортання — з --no-verify-jwt (1С не має пропуску Supabase).

import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const MAX_DAYS = 92;           // за один запит — до ~3 місяців
const STATUS_FINAL = 'Фінально підтверджено';

function envKey(newName: string, legacyName: string): string {
  const raw = Deno.env.get(newName);
  if (raw) {
    try {
      const obj = JSON.parse(raw);
      const k = obj?.default ?? Object.values(obj ?? {})[0];
      if (typeof k === 'string' && k) return k;
    } catch { /* не JSON */ }
  }
  return Deno.env.get(legacyName) || '';
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SECRET_KEY = envKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');
const API_TOKEN = Deno.env.get('ONEC_API_TOKEN') || '';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const isDate = (s: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T00:00:00Z'));
const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));
const time5 = (v: unknown) => (typeof v === 'string' && v ? v.slice(0, 5) : null);

// deno-lint-ignore no-explicit-any
type Row = any;

function toOut(r: Row) {
  const obj = r.objects || {};
  const cust = obj.customers || {};
  return {
    report_id: r.id,
    work_date: r.work_date,
    status: r.status,
    object: { code: obj.code ?? null, name: obj.name ?? null },
    customer: { edrpou: cust.edrpou ?? null, name: cust.name ?? null },
    customer_name_in_report: r.customer_name ?? null,
    equipment: { code: r.equipment?.code ?? null, name: r.equipment?.name ?? null },
    operator: { code: r.operator?.code ?? null, full_name: r.operator?.full_name ?? null },
    is_second_operator: !!r.is_second_operator,
    start_hours: num(r.start_hours),
    end_hours: num(r.end_hours),
    moto_hours: num(r.total_moto_hours),
    start_km: num(r.start_km),
    end_km: num(r.end_km),
    km: num(r.total_km),
    start_time: time5(r.start_time),
    end_time: time5(r.end_time),
    lunch_hours: num(r.lunch_hours),
    person_hours: num(r.total_person_hours),
    commute_hours: num(r.commute_hours),
    commute_route: r.commute_route ?? null,
    travel_hours: num(r.travel_hours),
    travel_route: r.travel_route ?? null,
    transport_hours: num(r.transport_hours),
    transport_route: r.transport_route ?? null,
    downtime_hours: num(r.downtime_hours),
    downtime_reason: r.downtime_reason ?? null,
    fueling_liters: num(r.fueling_liters),
    fueling_source: r.fueling_source ?? null,
    has_breakdown: !!r.has_breakdown,
    breakdown_description: r.breakdown_description ?? null,
    repair_hours: num(r.repair_hours),
    operator_note: r.operator_note ?? null,
  };
}

const SELECT =
  'id,work_date,status,object_id,objects(name,code,customers(name,edrpou)),customer_name,' +
  'equipment_id,equipment(name,code),operator_id,operator:users!daily_reports_operator_id_fkey(full_name,code),' +
  'is_second_operator,start_hours,end_hours,total_moto_hours,start_km,end_km,total_km,start_time,end_time,' +
  'lunch_hours,total_person_hours,commute_hours,commute_route,travel_hours,travel_route,transport_hours,' +
  'transport_route,downtime_hours,downtime_reason,fueling_liters,fueling_source,has_breakdown,' +
  'breakdown_description,repair_hours,operator_note';

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') return json(405, { error: 'method_not_allowed', message: 'Лише GET' });
  if (!SUPABASE_URL || !SECRET_KEY || !API_TOKEN) {
    console.error('export-1c: бракує налаштувань', { url: !!SUPABASE_URL, secret: !!SECRET_KEY, token: !!API_TOKEN });
    return json(500, { error: 'server_misconfigured' });
  }

  const admin = createClient(SUPABASE_URL, SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;

  const log = async (status: number, rows: number | null, note: string | null) => {
    try {
      await admin.from('api_access_log').insert({ client: '1С', status, rows, params, ip, note: note?.slice(0, 300) ?? null });
    } catch (e) {
      console.error('export-1c: log', (e as Error)?.message);
    }
  };

  if (!safeEqual(req.headers.get('x-api-key') || '', API_TOKEN)) {
    await log(401, null, 'неправильний або відсутній X-Api-Key');
    return json(401, { error: 'unauthorized', message: 'Неправильний або відсутній X-Api-Key' });
  }

  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const objectCode = url.searchParams.get('object_code');
  if (!isDate(from) || !isDate(to) || from! > to!) {
    await log(400, null, 'bad period');
    return json(400, { error: 'bad_period', message: 'Потрібні from і to у форматі РРРР-ММ-ДД, from ≤ to' });
  }
  const days = (Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000 + 1;
  if (days > MAX_DAYS) {
    await log(400, null, `period ${days} days`);
    return json(400, { error: 'period_too_long', message: `Період — не більше ${MAX_DAYS} днів за запит` });
  }
  if (objectCode !== null && !/^[0-9A-Za-zА-Яа-яІіЇїЄєҐґ._\/-]{1,50}$/.test(objectCode)) {
    await log(400, null, 'bad object_code');
    return json(400, { error: 'bad_object_code', message: 'object_code — "Код / номер" об\'єкта (до 50 символів)' });
  }

  // Код об'єкта → внутрішні номери (код теоретично може повторюватись)
  let objectIds: string[] | null = null;
  if (objectCode) {
    const { data: objs, error: objErr } = await admin.from('objects').select('id').eq('code', objectCode);
    if (objErr) {
      console.error('export-1c: objects', objErr.message);
      await log(500, null, 'db error: ' + objErr.message);
      return json(500, { error: 'db_error' });
    }
    objectIds = (objs || []).map((o: Row) => o.id);
    if (objectIds.length === 0) {
      await log(200, 0, 'object_code не знайдено');
      return json(200, { from, to, object_code: objectCode, status: STATUS_FINAL, count: 0, generated_at: new Date().toISOString(), reports: [] });
    }
  }

  let q = admin.from('daily_reports').select(SELECT)
    .eq('status', STATUS_FINAL)
    .gte('work_date', from!)
    .lte('work_date', to!)
    .order('work_date', { ascending: true })
    .order('id', { ascending: true })
    .limit(10000);
  if (objectIds) q = q.in('object_id', objectIds);

  const { data, error } = await q;
  if (error) {
    console.error('export-1c: query', error.message);
    await log(500, null, 'db error: ' + error.message);
    return json(500, { error: 'db_error' });
  }

  const reports = (data || []).map(toOut);
  await log(200, reports.length, null);
  return json(200, {
    from,
    to,
    object_code: objectCode,
    status: STATUS_FINAL,
    count: reports.length,
    generated_at: new Date().toISOString(),
    reports,
  });
});

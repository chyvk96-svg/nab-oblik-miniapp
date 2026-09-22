// ---------- Supabase REST API helpers ----------
// Ці функції не міняються при додаванні нових екранів —
// це базовий шар зв'язку з базою даних, спільний для всіх ролей.

async function supaGet(table, query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  if (!res.ok) throw new Error(`Помилка запиту до ${table}: ${res.status}`);
  return res.json();
}

async function supaInsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
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
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filterQuery}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
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
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filterQuery}`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=minimal'
    }
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Помилка видалення з ${table}: ${errText}`);
  }
}

async function supaRpc(fnName, params) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });
  if (!res.ok) throw new Error(`Помилка виклику функції ${fnName}`);
  return res.json();
}

// ---------- Спільні допоміжні функції ----------
// Форматування, повідомлення, топбар — використовується екранами всіх ролей.

const app = document.getElementById('app');

function renderMessage(text) {
  app.innerHTML = `<div class="msg">${text}</div>`;
}

function topbarHtml(title, subtitle) {
  return `
    <div class="topbar">
      <div class="brand">НАБ ТехОблік</div>
      <h1>${title}</h1>
      <div class="who">${subtitle}</div>
    </div>
    <div class="chevron"></div>
  `;
}

function formatDateUA(isoDate) {
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}

function formatTimeUA(timeStr) {
  if (!timeStr) return '—';
  return timeStr.slice(0, 5); // "08:00:00" -> "08:00"
}

function formatDateTimeUA(isoTimestamp) {
  const d = new Date(isoTimestamp);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------- Пошук у списках довідників (з 2026-10-14) ----------
// Замовники, об'єкти, техніка, користувачі: рядок пошуку над списком
// фільтрує картки одразу під час набору (у межах уже завантаженого списку,
// без запитів до бази). Кожна картка має data-search — текст, по якому
// шукаємо. Кілька слів — картка має містити кожне. Останній запит
// пам'ятається, поки відкрито Mini App (після "Деактивувати" / "Назад до
// списку" пошук не скидається).
const listSearchQueries = {};

function normSearch(v) {
  return String(v ?? '').toLowerCase().replace(/[’ʼ`]/g, "'").replace(/\s+/g, ' ').trim();
}

// Значення для атрибута data-search картки
function searchAttr(...values) {
  return escHtml(normSearch(values.filter(v => v !== null && v !== undefined).join(' ')));
}

function listSearchHtml(key, placeholder) {
  return `
    <input type="search" id="list-search-${key}" autocomplete="off" placeholder="🔍 ${placeholder}" value="${escHtml(listSearchQueries[key] || '')}" style="margin-bottom:12px">
    <div class="msg hidden" id="list-search-empty-${key}" style="padding:24px 10px">Нічого не знайдено</div>
  `;
}

// Викликати після того, як картки списку вже намальовані
function wireListSearch(key, listEl) {
  const input = document.getElementById(`list-search-${key}`);
  const emptyEl = document.getElementById(`list-search-empty-${key}`);
  if (!input || !listEl) return;
  const apply = () => {
    listSearchQueries[key] = input.value;
    const words = normSearch(input.value).split(' ').filter(Boolean);
    let shown = 0;
    listEl.querySelectorAll('[data-search]').forEach(card => {
      const text = card.getAttribute('data-search');
      const match = words.every(w => text.includes(w));
      card.classList.toggle('hidden', !match);
      if (match) shown++;
    });
    if (emptyEl) emptyEl.classList.toggle('hidden', shown > 0 || words.length === 0);
  };
  input.addEventListener('input', apply);
  apply();
}

function statusChipClass(status) {
  if (status === 'Фінально підтверджено') return 'status-final';
  if (status === 'Підтверджено відповідальним') return 'status-resp-ok';
  if (status === 'Повернено на коригування') return 'status-corr';
  return 'status-wait';
}

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

function formatDateTimeUA(isoTimestamp) {
  const d = new Date(isoTimestamp);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusChipClass(status) {
  if (status === 'Фінально підтверджено') return 'status-final';
  if (status === 'Підтверджено відповідальним') return 'status-resp-ok';
  if (status === 'Повернено на коригування') return 'status-corr';
  return 'status-wait';
}

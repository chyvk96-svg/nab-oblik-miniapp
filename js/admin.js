// ---------- Екран ролі "Адміністратор" ----------
// Наразі лише перегляд фінально підтверджених звітів, без дій.
// Використовує спільні reportDetailsHtml(), REPORT_SELECT_FIELDS, statusChipClass()
// з responsible.js (той самий файл вже завантажений у сторінку).

function adminSubtitle(user) {
  return `Адміністратор: ${user.full_name}`;
}

async function renderAdminHome(user) {
  app.innerHTML = `
    ${topbarHtml('Закриті звіти', adminSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div id="admin-list" class="msg">Завантаження...</div>
    </div>
  `;

  let reports;
  try {
    reports = await supaGet(
      'daily_reports',
      `status=eq.Фінально підтверджено&select=${REPORT_SELECT_FIELDS}&order=work_date.desc`
    );
  } catch (e) {
    document.getElementById('admin-list').textContent = 'Помилка завантаження: ' + e.message;
    return;
  }

  const listEl = document.getElementById('admin-list');

  if (!reports || reports.length === 0) {
    listEl.textContent = 'Фінально підтверджених звітів ще немає.';
    return;
  }

  listEl.className = '';
  listEl.innerHTML = reports.map(r => `
    <div class="report-card">
      <div class="top-row">
        <span class="date">${formatDateUA(r.work_date)}</span>
        <span class="status-chip ${statusChipClass(r.status)}">${r.status}</span>
      </div>
      ${reportDetailsHtml(r)}
    </div>
  `).join('');
}

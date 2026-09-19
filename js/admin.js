// ---------- Екран ролі "Адміністратор" ----------
// Використовує спільні reportDetailsHtml(), REPORT_SELECT_FIELDS, roleSubtitle(),
// goToRoleHome(), renderPendingApprovals(), renderApprovalHistory(), renderAddObject(),
// renderManageObjects() з responsible.js (той самий файл вже завантажений у сторінку).
// Адміністратор може бути призначений відповідальним за окремі (зазвичай приватні)
// об'єкти — тоді "Мої підтвердження"/"Історія" показують саме ці звіти.

function adminSubtitle(user) {
  return roleSubtitle(user);
}

// ---------- Головне меню адміністратора ----------

function renderAdminHome(user) {
  app.innerHTML = `
    ${topbarHtml('Головне меню', roleSubtitle(user))}
    <div class="menu-list">
      <button class="menu-btn" id="btn-pending">
        <span class="emoji">✅</span>
        <span>
          Мої підтвердження
          <span class="sub">Звіти по об'єктах, де я відповідальний</span>
        </span>
      </button>
      <button class="menu-btn" id="btn-history">
        <span class="emoji">📋</span>
        <span>
          Історія
          <span class="sub">Уже опрацьовані мною звіти</span>
        </span>
      </button>
      <button class="menu-btn" id="btn-add-object">
        <span class="emoji">➕</span>
        <span>
          Додати об'єкт
          <span class="sub">Новий об'єкт, якого ще немає в базі</span>
        </span>
      </button>
      <button class="menu-btn" id="btn-manage-objects">
        <span class="emoji">🗂️</span>
        <span>
          Об'єкти
          <span class="sub">Закрити/відкрити існуючі об'єкти</span>
        </span>
      </button>
      <button class="menu-btn" id="btn-closed-reports">
        <span class="emoji">📊</span>
        <span>
          Усі закриті звіти
          <span class="sub">Повний огляд по всій компанії</span>
        </span>
      </button>
    </div>
  `;
  document.getElementById('btn-pending').addEventListener('click', () => renderPendingApprovals(user));
  document.getElementById('btn-history').addEventListener('click', () => renderApprovalHistory(user));
  document.getElementById('btn-add-object').addEventListener('click', () => renderAddObject(user));
  document.getElementById('btn-manage-objects').addEventListener('click', () => renderManageObjects(user));
  document.getElementById('btn-closed-reports').addEventListener('click', () => renderAdminClosedReports(user));
}

// ---------- Усі закриті звіти по всій компанії (тільки перегляд) ----------

async function renderAdminClosedReports(user) {
  app.innerHTML = `
    ${topbarHtml('Усі закриті звіти', roleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-menu-closed" style="padding:0 0 14px">← Назад до меню</div>
      <div id="admin-list" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-menu-closed').addEventListener('click', () => renderAdminHome(user));

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

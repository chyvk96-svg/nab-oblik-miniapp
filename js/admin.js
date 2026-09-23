// ---------- Екран ролі "Адміністратор" ----------
// Використовує спільні reportDetailsHtml(), REPORT_SELECT_FIELDS, roleSubtitle(),
// goToRoleHome(), renderPendingApprovals(), renderApprovalHistory(), renderAddObject(),
// renderManageObjects() з responsible.js, а також renderUserList(), renderEquipmentList(),
// renderCustomersList() з admin-manage.js (усі файли вже завантажені у сторінку).
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
          <span class="sub">Додати / редагувати / закрити-відкрити</span>
        </span>
      </button>
      <button class="menu-btn" id="btn-users">
        <span class="emoji">👤</span>
        <span>
          Користувачі
          <span class="sub">Додати / редагувати / деактивувати</span>
        </span>
      </button>
      <button class="menu-btn" id="btn-equipment">
        <span class="emoji">🚜</span>
        <span>
          Техніка
          <span class="sub">Додати / редагувати / деактивувати</span>
        </span>
      </button>
      <button class="menu-btn" id="btn-customers">
        <span class="emoji">🏢</span>
        <span>
          Замовники
          <span class="sub">Додати / редагувати / деактивувати</span>
        </span>
      </button>
      <button class="menu-btn" id="btn-pending-reports">
        <span class="emoji">⏳</span>
        <span>
          Непідтверджені звіти
          <span class="sub">По всій компанії, лише перегляд</span>
        </span>
      </button>
      <button class="menu-btn" id="btn-closed-reports">
        <span class="emoji">📊</span>
        <span>
          Усі закриті звіти
          <span class="sub">Повний огляд по всій компанії</span>
        </span>
      </button>
      <button class="menu-btn" id="btn-wialon-check">
        <span class="emoji">🛰️</span>
        <span>
          Звірка з Wialon
          <span class="sub">Звіти операторів проти GPS за період</span>
        </span>
      </button>
      <button class="menu-btn" id="btn-object-report">
        <span class="emoji">🏗️</span>
        <span>
          Звіт по об'єкту
          <span class="sub">Техніка й оператори на об'єкті за період</span>
        </span>
      </button>
    </div>
  `;
  document.getElementById('btn-pending').addEventListener('click', () => renderPendingApprovals(user));
  document.getElementById('btn-history').addEventListener('click', () => renderApprovalHistory(user));
  document.getElementById('btn-add-object').addEventListener('click', () => renderAddObject(user));
  document.getElementById('btn-manage-objects').addEventListener('click', () => renderManageObjects(user));
  document.getElementById('btn-users').addEventListener('click', () => renderUserList(user));
  document.getElementById('btn-equipment').addEventListener('click', () => renderEquipmentList(user));
  document.getElementById('btn-customers').addEventListener('click', () => renderCustomersList(user));
  document.getElementById('btn-pending-reports').addEventListener('click', () => renderAdminPendingReports(user));
  document.getElementById('btn-closed-reports').addEventListener('click', () => renderAdminClosedReports(user));
  document.getElementById('btn-wialon-check').addEventListener('click', () => renderWialonCheck(user));
  document.getElementById('btn-object-report').addEventListener('click', () => renderObjectReport(user));
}

// ---------- Додати нового користувача ----------

async function renderAddUser(user) {
  app.innerHTML = `
    ${topbarHtml('Додати користувача', roleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-menu-adduser" style="margin:0 0 14px">← Назад до меню</div>
      <div id="add-user-body" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-menu-adduser').addEventListener('click', () => renderAdminHome(user));

  const bodyEl = document.getElementById('add-user-body');

  let rolesList, equipmentList;
  try {
    rolesList = await supaGet('roles', `status=eq.Активна&select=name&order=name.asc`);
    equipmentList = await supaGet('equipment', `status=eq.Активна&select=id,name&order=name.asc`);
  } catch (e) {
    bodyEl.textContent = 'Помилка завантаження: ' + e.message;
    return;
  }

  if (!rolesList || rolesList.length === 0) {
    bodyEl.textContent = 'Немає активних ролей у довіднику "roles".';
    return;
  }

  bodyEl.className = '';
  bodyEl.innerHTML = `
    <form id="add-user-form">
      <div class="section">
        <div class="section-title"><span class="n">1</span><span class="icon">👤</span>Новий користувач</div>

        <label>ПІБ</label>
        <input type="text" id="new_user_name" required placeholder="Прізвище Ім'я">

        <label>Telegram ID</label>
        <input type="number" id="new_user_telegram_id" required placeholder="Наприклад: 123456789">
        <div class="hint-inline">Працівник дізнається свій Telegram ID через бота @userinfobot і повідомляє тобі</div>

        <label>Телефон</label>
        <input type="text" id="new_user_phone" placeholder="Необов'язково">

        <label>Роль</label>
        <select id="new_user_role" required>
          ${rolesList.map(r => `<option value="${r.name}">${r.name}</option>`).join('')}
        </select>

        <label>Примітка</label>
        <textarea id="new_user_note" placeholder="Необов'язково"></textarea>
      </div>

      <div class="section" id="equipment-section">
        <div class="section-title"><span class="n">2</span><span class="icon">🚜</span>Закріплена техніка</div>
        <div class="hint-inline" style="margin-bottom:8px">Познач техніку, яку закріплюємо за цим оператором (можна кілька).</div>
        ${equipmentList.map(eq => `
          <div class="checkbox-row">
            <input type="checkbox" class="equipment-check" value="${eq.id}" id="eq-${eq.id}">
            <label for="eq-${eq.id}">${eq.name}</label>
          </div>
        `).join('')}
      </div>

      <button type="submit" id="add-user-submit-btn">Створити користувача</button>
      <div class="error-text hidden" id="add-user-error-box"></div>
    </form>
  `;

  const form = document.getElementById('add-user-form');
  const submitBtn = document.getElementById('add-user-submit-btn');
  const errorBox = document.getElementById('add-user-error-box');
  const roleSelect = document.getElementById('new_user_role');
  const equipmentSection = document.getElementById('equipment-section');

  function toggleEquipmentSection() {
    // Водій працює як Оператор, тож теж отримує закріплену техніку
    const worksAsOperator = roleSelect.value === 'Оператор' || roleSelect.value === 'Водій';
    equipmentSection.classList.toggle('hidden', !worksAsOperator);
  }
  roleSelect.addEventListener('change', toggleEquipmentSection);
  toggleEquipmentSection();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');

    const fullName = document.getElementById('new_user_name').value.trim();
    const telegramId = document.getElementById('new_user_telegram_id').value.trim();
    const phone = document.getElementById('new_user_phone').value.trim();
    const role = roleSelect.value;
    const note = document.getElementById('new_user_note').value.trim();

    if (!fullName) {
      errorBox.textContent = "Вкажи ПІБ.";
      errorBox.classList.remove('hidden');
      return;
    }
    if (!telegramId || !/^\d+$/.test(telegramId)) {
      errorBox.textContent = "Вкажи коректний Telegram ID (тільки цифри).";
      errorBox.classList.remove('hidden');
      return;
    }

    const selectedEquipment = Array.from(document.querySelectorAll('.equipment-check:checked')).map(cb => cb.value);

    submitBtn.disabled = true;
    submitBtn.textContent = 'Створення...';

    try {
      const newUserId = await supaRpc('next_id', { p_prefix: 'USR' });
      await supaInsert('users', {
        id: newUserId,
        telegram_id: parseInt(telegramId, 10),
        full_name: fullName,
        role: role,
        phone: phone || null,
        status: 'Активний',
        note: note || null
      });

      for (const equipmentId of selectedEquipment) {
        const ueId = await supaRpc('next_id', { p_prefix: 'UE' });
        await supaInsert('user_equipment', {
          id: ueId,
          user_id: newUserId,
          equipment_id: equipmentId,
          status: 'Активна'
        });
      }

      app.innerHTML = `
        <div class="wrap">
        <div class="success-box">
          <div>✅ Користувача успішно створено</div>
          <div class="stamp">${newUserId}</div>
        </div>
        <button type="button" id="back-home-btn" style="background:var(--asphalt);color:var(--brand-yellow);width:100%;padding:14px;border:none;border-radius:4px;font-family:'Oswald',sans-serif;font-weight:600;font-size:14px;text-transform:uppercase;letter-spacing:0.03em;cursor:pointer">На головну</button>
        </div>
      `;
      document.getElementById('back-home-btn').addEventListener('click', () => renderAdminHome(user));
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = "Створити користувача";
    }
  });
}

// ---------- Непідтверджені звіти по всій компанії (тільки перегляд) ----------
// На відміну від "Мої підтвердження" (responsible.js) — показує звіти всіх
// відповідальних, без прив'язки до того, чи адміністратор сам за них відповідає.
// Тільки перегляд: підтвердити/повернути на коригування звідси не можна —
// це лишається дією призначеного відповідального.

async function renderAdminPendingReports(user) {
  app.innerHTML = `
    ${topbarHtml('Непідтверджені звіти', roleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-menu-pending" style="margin:0 0 14px">← Назад до меню</div>
      <div id="admin-pending-list" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-menu-pending').addEventListener('click', () => renderAdminHome(user));

  let reports;
  try {
    reports = await supaGet(
      'daily_reports',
      `status=eq.Очікує відповідального&select=${REPORT_SELECT_FIELDS}&order=work_date.asc`
    );
  } catch (e) {
    document.getElementById('admin-pending-list').textContent = 'Помилка завантаження: ' + e.message;
    return;
  }

  const listEl = document.getElementById('admin-pending-list');

  if (!reports || reports.length === 0) {
    listEl.textContent = 'Непідтверджених звітів немає.';
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

// ---------- Усі закриті звіти по всій компанії (тільки перегляд) ----------

async function renderAdminClosedReports(user) {
  app.innerHTML = `
    ${topbarHtml('Усі закриті звіти', roleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-menu-closed" style="margin:0 0 14px">← Назад до меню</div>
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

// ======================================================
// АНАЛІТИКА: спільні помічники (період, числа)
// Дані рахують функції Supabase (wialon_equipment_summary,
// wialon_equipment_daily, object_report) у момент запиту —
// тому пізно подані чи виправлені звіти враховуються одразу.
// Чернетки у звірку не потрапляють.
// ======================================================

// Тимчасові пороги підсвічування розбіжностей (уточнимо за реальними даними)
const WIALON_MOTO_THRESHOLD = 0.5;   // год
const WIALON_FUEL_THRESHOLD = 10;    // л

// Дата в форматі YYYY-MM-DD за місцевим часом пристрою
function isoDateLocal(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Швидкі періоди: "yesterday" — вчора; "week" — 7 днів до вчора включно;
// "month" — з 1-го числа поточного місяця по вчора (1-го числа — лише вчора)
function quickPeriod(kind) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const to = isoDateLocal(yesterday);
  if (kind === 'week') {
    const from = new Date(yesterday);
    from.setDate(from.getDate() - 6);
    return { from: isoDateLocal(from), to };
  }
  if (kind === 'month') {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: isoDateLocal(first > yesterday ? yesterday : first), to };
  }
  return { from: to, to };
}

// Число для показу: null → "—", інакше до 2 знаків, з комою
function fmtNum(v, digits = 2) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (isNaN(n)) return '—';
  return (Math.round(n * Math.pow(10, digits)) / Math.pow(10, digits)).toString().replace('.', ',');
}

// Різниця зі знаком: +0,3 / −1,2 / 0
function fmtDiff(v) {
  if (v === null || v === undefined) return '—';
  const n = Number(v);
  if (isNaN(n)) return '—';
  if (Math.abs(n) < 0.005) return '0';
  return (n > 0 ? '+' : '−') + fmtNum(Math.abs(n));
}

// HTML-блок вибору періоду (швидкі кнопки + дати + "Показати")
function periodPickerHtml(prefix) {
  return `
    <div class="section" style="padding-bottom:12px">
      <div style="display:flex;gap:6px">
        <button type="button" class="btn-reject" style="padding:8px 4px" data-${prefix}-quick="yesterday">Вчора</button>
        <button type="button" class="btn-reject" style="padding:8px 4px" data-${prefix}-quick="week">Тиждень</button>
        <button type="button" class="btn-reject" style="padding:8px 4px" data-${prefix}-quick="month">Місяць</button>
      </div>
      <div class="row2" style="margin-top:8px">
        <div>
          <label>З</label>
          <input type="date" id="${prefix}-from">
        </div>
        <div>
          <label>По</label>
          <input type="date" id="${prefix}-to">
        </div>
      </div>
      <button type="button" class="btn-confirm" id="${prefix}-show" style="width:100%;margin-top:10px">Показати</button>
    </div>
  `;
}

// Підключає швидкі кнопки періоду; onShow викликається з {from, to}
function wirePeriodPicker(prefix, onShow) {
  const fromEl = document.getElementById(`${prefix}-from`);
  const toEl = document.getElementById(`${prefix}-to`);

  document.querySelectorAll(`[data-${prefix}-quick]`).forEach(btn => {
    btn.addEventListener('click', () => {
      const p = quickPeriod(btn.getAttribute(`data-${prefix}-quick`));
      fromEl.value = p.from;
      toEl.value = p.to;
      onShow(p.from, p.to);
    });
  });

  document.getElementById(`${prefix}-show`).addEventListener('click', () => {
    if (!fromEl.value || !toEl.value) {
      alert('Вкажи дати "з" і "по".');
      return;
    }
    if (fromEl.value > toEl.value) {
      alert('Дата "з" не може бути пізнішою за "по".');
      return;
    }
    onShow(fromEl.value, toEl.value);
  });

  // Початковий період — тиждень
  const p = quickPeriod('week');
  fromEl.value = p.from;
  toEl.value = p.to;
  onShow(p.from, p.to);
}

// ======================================================
// ЗВІРКА З WIALON (тільки адміністратор)
// ======================================================

async function renderWialonCheck(user) {
  app.innerHTML = `
    ${topbarHtml('Звірка з Wialon', roleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-menu-wialon" style="margin:0 0 14px">← Назад до меню</div>
      ${periodPickerHtml('wc')}
      <div class="hint-inline" style="margin:0 0 10px">
        Звіти — сума всіх звітів операторів по техніці за період (крім чернеток).
        Wialon — дані GPS-трекера, збираються щоранку за попередній день.
        Різниця = звіти − Wialon. ⚠ — мотогодини понад ±${fmtNum(WIALON_MOTO_THRESHOLD)} год,
        заправка понад ±${WIALON_FUEL_THRESHOLD} л, злив пального або робота без звіту.
      </div>
      <div id="wialon-list" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-menu-wialon').addEventListener('click', () => renderAdminHome(user));

  wirePeriodPicker('wc', (from, to) => loadWialonSummary(from, to));
}

async function loadWialonSummary(from, to) {
  const listEl = document.getElementById('wialon-list');
  listEl.className = 'msg';
  listEl.textContent = 'Завантаження...';

  let rows;
  try {
    rows = await supaRpc('wialon_equipment_summary', { p_from: from, p_to: to });
  } catch (e) {
    listEl.textContent = 'Помилка завантаження: ' + e.message;
    return;
  }

  if (!rows || rows.length === 0) {
    listEl.textContent = `За ${formatDateUA(from)} – ${formatDateUA(to)} немає ні звітів, ні роботи техніки у Wialon.`;
    return;
  }

  listEl.className = '';
  listEl.innerHTML = `
    <div class="meta" style="margin:0 0 8px">Період: ${formatDateUA(from)} – ${formatDateUA(to)} · техніки: ${rows.length}</div>
    ${rows.map(r => wialonSummaryCardHtml(r)).join('')}
  `;

  listEl.querySelectorAll('[data-wc-days]').forEach(btn => {
    btn.addEventListener('click', () => toggleWialonDaily(btn, from, to));
  });
}

function wialonSummaryCardHtml(r) {
  const hasWialon = !!r.wialon_unit_id;
  const motoBad = r.moto_hours_diff !== null && Math.abs(Number(r.moto_hours_diff)) > WIALON_MOTO_THRESHOLD;
  const fuelBad = r.fueling_diff !== null && Math.abs(Number(r.fueling_diff)) > WIALON_FUEL_THRESHOLD;
  const drained = Number(r.fuel_drained_wialon) > 0;
  const noReportDays = Number(r.days_work_without_report) > 0;
  const needsCheck = motoBad || fuelBad || drained || noReportDays;

  let chip;
  if (!hasWialon) chip = `<span class="status-chip status-wait">без Wialon</span>`;
  else if (needsCheck) chip = `<span class="status-chip status-corr">⚠ перевірити</span>`;
  else chip = `<span class="status-chip status-final">OK</span>`;

  const red = 'style="color:var(--danger);font-weight:600"';

  const motoLine = hasWialon
    ? `Мотогодини: звіти <b>${fmtNum(r.moto_hours_reports)}</b> · Wialon <b>${fmtNum(r.moto_hours_wialon)}</b> · різниця <span ${motoBad ? red : ''}>${fmtDiff(r.moto_hours_diff)}</span>`
    : `Мотогодини за звітами: <b>${fmtNum(r.moto_hours_reports)}</b>`;

  const fuelLine = hasWialon
    ? `Заправка, л: звіти <b>${fmtNum(r.fueling_reports, 1)}</b> · Wialon <b>${fmtNum(r.fueling_wialon, 1)}</b> · різниця <span ${fuelBad ? red : ''}>${fmtDiff(r.fueling_diff)}</span>`
    : `Заправка за звітами: <b>${fmtNum(r.fueling_reports, 1)}</b> л`;

  const kmLine = (r.km_reports !== null || (hasWialon && Number(r.km_wialon) > 0))
    ? `<div class="detail-row">Пробіг, км: звіти ${fmtNum(r.km_reports, 1)}${hasWialon ? ` · Wialon ${fmtNum(r.km_wialon, 1)}` : ''}</div>`
    : '';

  const drainedLine = drained
    ? `<div class="detail-row" ${red}>⚠ Злито за даними Wialon: ${fmtNum(r.fuel_drained_wialon, 1)} л</div>`
    : '';

  const noReportLine = noReportDays
    ? `<div class="detail-row" ${red}>⚠ Днів, коли техніка працювала без звіту: ${r.days_work_without_report}</div>`
    : '';

  const cardBorder = needsCheck ? 'border-left-color:var(--danger)' : '';

  return `
    <div class="report-card" style="${cardBorder}">
      <div class="top-row">
        <span class="date">${r.equipment_name}</span>
        ${chip}
      </div>
      <div class="meta">Звітів: ${r.reports_count} · днів зі звітами: ${r.report_days}${hasWialon ? ` · днів з даними Wialon: ${r.wialon_days_collected}` : ''}</div>
      <div class="detail-row">${motoLine}</div>
      <div class="detail-row">${fuelLine}</div>
      ${kmLine}
      ${drainedLine}
      ${noReportLine}
      <button type="button" class="btn-reject" style="width:100%;margin-top:10px;padding:8px" data-wc-days="${r.equipment_id}">По днях ▾</button>
      <div class="wc-days hidden" id="wc-days-${r.equipment_id}"></div>
    </div>
  `;
}

async function toggleWialonDaily(btn, from, to) {
  const equipmentId = btn.dataset.wcDays;
  const box = document.getElementById(`wc-days-${equipmentId}`);

  if (!box.classList.contains('hidden')) {
    box.classList.add('hidden');
    btn.textContent = 'По днях ▾';
    return;
  }

  box.classList.remove('hidden');
  btn.textContent = 'Сховати ▴';
  box.innerHTML = '<div class="meta" style="margin-top:8px">Завантаження...</div>';

  let days;
  try {
    days = await supaRpc('wialon_equipment_daily', { p_equipment_id: equipmentId, p_from: from, p_to: to });
  } catch (e) {
    box.innerHTML = `<div class="meta" style="margin-top:8px">Помилка: ${e.message}</div>`;
    return;
  }

  if (!days || days.length === 0) {
    box.innerHTML = '<div class="meta" style="margin-top:8px">Немає даних по днях.</div>';
    return;
  }

  const red = 'color:var(--danger);font-weight:600';

  box.innerHTML = days.map(d => {
    const hasW = d.moto_hours_wialon !== null;
    const motoBad = d.moto_hours_diff !== null && Math.abs(Number(d.moto_hours_diff)) > WIALON_MOTO_THRESHOLD;
    const noReport = Number(d.reports_count) === 0 && Number(d.moto_hours_wialon) > 0.1;
    const drained = Number(d.fuel_drained_wialon) > 0;
    const fuelDiff = (d.fueling_wialon !== null) ? Number(d.fueling_reports) - Number(d.fueling_wialon) : null;
    const fuelBad = fuelDiff !== null && Math.abs(fuelDiff) > WIALON_FUEL_THRESHOLD;

    return `
      <div style="border-top:1px solid var(--line);margin-top:8px;padding-top:8px;font-size:12.5px">
        <div style="display:flex;justify-content:space-between;gap:8px">
          <b>${formatDateUA(d.work_date)}</b>
          <span class="meta">${d.reports_count > 0 ? `звітів: ${d.reports_count}` : '<span style="' + (noReport ? red : '') + '">без звіту</span>'}</span>
        </div>
        ${d.objects ? `<div class="meta">${d.objects}</div>` : ''}
        <div>М/г: звіти ${fmtNum(d.moto_hours_reports)}${hasW ? ` · Wialon ${fmtNum(d.moto_hours_wialon)} · <span style="${motoBad ? red : ''}">${fmtDiff(d.moto_hours_diff)}</span>` : ''}</div>
        <div>Заправка: звіти ${fmtNum(d.fueling_reports, 1)}${d.fueling_wialon !== null ? ` · Wialon ${fmtNum(d.fueling_wialon, 1)} · <span style="${fuelBad ? red : ''}">${fmtDiff(fuelDiff)}</span>` : ''} л</div>
        ${(d.km_reports !== null || Number(d.km_wialon) > 0) ? `<div>Пробіг: звіти ${fmtNum(d.km_reports, 1)} · Wialon ${fmtNum(d.km_wialon, 1)} км</div>` : ''}
        ${drained ? `<div style="${red}">⚠ Злито: ${fmtNum(d.fuel_drained_wialon, 1)} л</div>` : ''}
        ${d.wialon_status && d.wialon_status !== 'Зібрано' ? `<div style="${red}">Wialon: ${d.wialon_status}</div>` : ''}
      </div>
    `;
  }).join('');
}

// ======================================================
// ЗВІТ ПО ОБ'ЄКТУ (тільки адміністратор)
// Лише дані звітів операторів — Wialon про об'єкти не знає.
// ======================================================

async function renderObjectReport(user) {
  app.innerHTML = `
    ${topbarHtml("Звіт по об'єкту", roleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-menu-objrep" style="margin:0 0 14px">← Назад до меню</div>
      <div id="objrep-body" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-menu-objrep').addEventListener('click', () => renderAdminHome(user));

  const bodyEl = document.getElementById('objrep-body');

  let objectsList;
  try {
    objectsList = await supaGet('objects', 'select=id,name,status&order=status.asc,name.asc');
  } catch (e) {
    bodyEl.textContent = 'Помилка завантаження: ' + e.message;
    return;
  }

  if (!objectsList || objectsList.length === 0) {
    bodyEl.textContent = "Об'єктів ще немає.";
    return;
  }

  bodyEl.className = '';
  bodyEl.innerHTML = `
    <div class="section" style="padding-bottom:4px;margin-bottom:0">
      <label>Об'єкт</label>
      <select id="objrep-object">
        ${objectsList.map(o => `<option value="${o.id}">${o.name}${o.status !== 'Активний' ? ' (закритий)' : ''}</option>`).join('')}
      </select>
    </div>
    ${periodPickerHtml('or')}
    <div id="objrep-result" class="msg">Завантаження...</div>
  `;

  const objectSelect = document.getElementById('objrep-object');
  let lastPeriod = null;

  const show = (from, to) => {
    lastPeriod = { from, to };
    loadObjectReport(objectSelect.value, objectSelect.options[objectSelect.selectedIndex].text, from, to);
  };

  objectSelect.addEventListener('change', () => {
    if (lastPeriod) show(lastPeriod.from, lastPeriod.to);
  });

  wirePeriodPicker('or', show);
}

async function loadObjectReport(objectId, objectName, from, to) {
  const resEl = document.getElementById('objrep-result');
  resEl.className = 'msg';
  resEl.textContent = 'Завантаження...';

  let rows;
  try {
    rows = await supaRpc('object_report', { p_object_id: objectId, p_from: from, p_to: to });
  } catch (e) {
    resEl.textContent = 'Помилка завантаження: ' + e.message;
    return;
  }

  if (!rows || rows.length === 0) {
    resEl.textContent = `По об'єкту "${objectName}" за ${formatDateUA(from)} – ${formatDateUA(to)} звітів немає.`;
    return;
  }

  const sum = (key) => rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
  const kmRows = rows.filter(r => r.km !== null);
  const allDates = rows.flatMap(r => [r.first_date, r.last_date]).sort();

  resEl.className = '';
  resEl.innerHTML = `
    <div class="report-card" style="border-left-color:var(--brand-yellow)">
      <div class="top-row">
        <span class="date">${objectName}</span>
        <span class="status-chip status-final">Разом</span>
      </div>
      <div class="meta">${formatDateUA(from)} – ${formatDateUA(to)} · фактично ${formatDateUA(allDates[0])} – ${formatDateUA(allDates[allDates.length - 1])}</div>
      <div class="detail-row">Звітів: <b>${sum('reports_count')}</b> (підтверджено ${sum('confirmed_count')}) · техніки: ${new Set(rows.map(r => r.equipment_id)).size} · операторів: ${new Set(rows.map(r => r.operator_id)).size}</div>
      <div class="detail-row">Мотогодини: <b>${fmtNum(sum('moto_hours'))}</b>${kmRows.length ? ` · пробіг: <b>${fmtNum(sum('km'), 1)}</b> км` : ''}</div>
      <div class="detail-row">Людиногодини: <b>${fmtNum(sum('person_hours'))}</b></div>
      <div class="detail-row">Перебазування: ${fmtNum(sum('travel_hours'))} год · перевезення людей: ${fmtNum(sum('transport_hours'))} год</div>
      <div class="detail-row">Простій: ${fmtNum(sum('downtime_hours'))} год · ремонт: ${fmtNum(sum('repair_hours'))} год · поломок: ${sum('breakdowns_count')}</div>
      <div class="detail-row">Заправка: <b>${fmtNum(sum('fueling_liters'), 1)}</b> л</div>
    </div>

    <div class="meta" style="margin:14px 0 8px">По техніці й операторах:</div>

    ${rows.map(r => `
      <div class="report-card">
        <div class="top-row">
          <span class="date">${r.equipment_name || '—'}</span>
          <span class="meta">${r.work_days} дн.</span>
        </div>
        <div class="operator-name">${r.operator_name || '—'}</div>
        <div class="meta">${formatDateUA(r.first_date)} – ${formatDateUA(r.last_date)} · звітів ${r.reports_count} (підтверджено ${r.confirmed_count})</div>
        <div class="detail-row">Мотогодини: <b>${fmtNum(r.moto_hours)}</b>${r.km !== null ? ` · пробіг: <b>${fmtNum(r.km, 1)}</b> км` : ''}</div>
        <div class="detail-row">Людиногодини: <b>${fmtNum(r.person_hours)}</b></div>
        ${Number(r.travel_hours) > 0 || Number(r.transport_hours) > 0 ? `<div class="detail-row">Перебазування: ${fmtNum(r.travel_hours)} год · перевезення людей: ${fmtNum(r.transport_hours)} год</div>` : ''}
        ${Number(r.downtime_hours) > 0 || Number(r.repair_hours) > 0 || Number(r.breakdowns_count) > 0 ? `<div class="detail-row">Простій: ${fmtNum(r.downtime_hours)} год · ремонт: ${fmtNum(r.repair_hours)} год · поломок: ${r.breakdowns_count}</div>` : ''}
        <div class="detail-row">Заправка: ${fmtNum(r.fueling_liters, 1)} л</div>
      </div>
    `).join('')}
  `;
}

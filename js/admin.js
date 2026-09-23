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
      <button class="menu-btn" id="btn-operator-hours">
        <span class="emoji">🕒</span>
        <span>
          Години оператора
          <span class="sub">Підтверджені години оператора / водія, відомість у Telegram</span>
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
  document.getElementById('btn-operator-hours').addEventListener('click', () => renderOperatorHoursPick(user));
}

// ---------- Години оператора: вибір оператора / водія ----------
// Далі — спільний екран renderHoursScreen() з operator.js (той самий, що
// "Мої години" в оператора). Файл Excel приходить адміну (viewer), а не
// оператору; у export_files: user_id = адмін, subject_user_id = оператор.

async function renderOperatorHoursPick(user) {
  app.innerHTML = `
    ${topbarHtml('Години оператора', roleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-menu-oh" style="margin:0 0 14px">← Назад до меню</div>
      <div class="hint-inline" style="margin:0 0 10px">Оберіть оператора або водія.</div>
      <div id="oh-list" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-menu-oh').addEventListener('click', () => renderAdminHome(user));

  let people;
  try {
    people = await supaGet(
      'users',
      `role=in.(Оператор,Водій)&select=id,full_name,role,status&order=full_name.asc`
    );
  } catch (e) {
    document.getElementById('oh-list').textContent = 'Помилка завантаження: ' + e.message;
    return;
  }

  const listEl = document.getElementById('oh-list');
  if (!people || people.length === 0) {
    listEl.textContent = 'Операторів і водіїв ще немає.';
    return;
  }

  // Активні — зверху, неактивні (звільнені) — внизу з позначкою
  const active = people.filter(p => p.status === 'Активний');
  const inactive = people.filter(p => p.status !== 'Активний');

  const btnHtml = p => `
    <button class="menu-btn" data-oh-id="${p.id}" style="padding:12px 14px${p.status !== 'Активний' ? ';opacity:0.6' : ''}">
      <span class="emoji">${p.role === 'Водій' ? '🚌' : '👷'}</span>
      <span>
        ${escHtml(p.full_name)}
        <span class="sub">${escHtml(p.role)}${p.status !== 'Активний' ? ' · неактивний' : ''}</span>
      </span>
    </button>
  `;

  listEl.className = '';
  listEl.innerHTML = active.map(btnHtml).join('') +
    (inactive.length ? `<div class="hint-inline" style="margin:14px 0 8px">Неактивні:</div>` + inactive.map(btnHtml).join('') : '');

  listEl.querySelectorAll('[data-oh-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const subject = people.find(p => p.id === btn.dataset.ohId);
      renderHoursScreen({
        viewer: user,
        subject,
        onBack: () => renderOperatorHoursPick(user)
      });
    });
  });
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

  // Автооновлення при зміні дати вручну (без натискання "Показати"),
  // щоб на екрані ніколи не лишався результат за інший період
  const onDateChange = () => {
    if (fromEl.value && toEl.value && fromEl.value <= toEl.value) {
      onShow(fromEl.value, toEl.value);
    }
  };
  fromEl.addEventListener('change', onDateChange);
  toEl.addEventListener('change', onDateChange);

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

// Лічильник запитів: якщо користувач швидко змінює період, показуємо
// лише результат останнього запиту (попередні відповіді ігноруються)
let wialonLoadSeq = 0;

async function loadWialonSummary(from, to) {
  const listEl = document.getElementById('wialon-list');
  const seq = ++wialonLoadSeq;
  listEl.className = 'msg';
  listEl.textContent = 'Завантаження...';

  let rows;
  try {
    rows = await supaRpc('wialon_equipment_summary', { p_from: from, p_to: to });
  } catch (e) {
    if (seq !== wialonLoadSeq) return;
    listEl.textContent = 'Помилка завантаження: ' + e.message;
    return;
  }
  if (seq !== wialonLoadSeq) return;

  if (!rows || rows.length === 0) {
    listEl.textContent = `За ${formatDateUA(from)} – ${formatDateUA(to)} немає ні звітів, ні роботи техніки у Wialon.`;
    return;
  }

  listEl.className = '';
  listEl.innerHTML = `
    <div class="meta" style="margin:0 0 8px">Період: ${formatDateUA(from)} – ${formatDateUA(to)} · техніки: ${rows.length}</div>
    <button type="button" class="btn-add-top" id="wc-excel-btn">⬇ Завантажити Excel</button>
    ${rows.map(r => wialonSummaryCardHtml(r)).join('')}
  `;

  listEl.querySelectorAll('[data-wc-days]').forEach(btn => {
    btn.addEventListener('click', () => toggleWialonDaily(btn, from, to));
  });

  const excelBtn = document.getElementById('wc-excel-btn');
  excelBtn.addEventListener('click', () => exportWialonExcel(excelBtn, rows, from, to));
}

// Статус техніки для таблиці (та сама логіка, що й мітка на картці)
function wialonRowStatus(r) {
  if (!r.wialon_unit_id) return 'без Wialon';
  const motoBad = r.moto_hours_diff !== null && Math.abs(Number(r.moto_hours_diff)) > WIALON_MOTO_THRESHOLD;
  const fuelBad = r.fueling_diff !== null && Math.abs(Number(r.fueling_diff)) > WIALON_FUEL_THRESHOLD;
  const drained = Number(r.fuel_drained_wialon) > 0;
  const noReportDays = Number(r.days_work_without_report) > 0;
  return (motoBad || fuelBad || drained || noReportDays) ? 'перевірити' : 'OK';
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

let objectLoadSeq = 0;

async function loadObjectReport(objectId, objectName, from, to) {
  const resEl = document.getElementById('objrep-result');
  const seq = ++objectLoadSeq;
  resEl.className = 'msg';
  resEl.textContent = 'Завантаження...';

  let rows;
  try {
    rows = await supaRpc('object_report', { p_object_id: objectId, p_from: from, p_to: to });
  } catch (e) {
    if (seq !== objectLoadSeq) return;
    resEl.textContent = 'Помилка завантаження: ' + e.message;
    return;
  }
  if (seq !== objectLoadSeq) return;

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

    <button type="button" class="btn-add-top" id="or-excel-btn" style="margin-top:6px">⬇ Завантажити Excel</button>

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

  const excelBtn = document.getElementById('or-excel-btn');
  excelBtn.addEventListener('click', () => exportObjectExcel(excelBtn, objectId, objectName, rows, from, to));
}

// ======================================================
// ВИВАНТАЖЕННЯ В EXCEL
// Файл .xlsx формується прямо в Mini App (бібліотека SheetJS, вантажиться
// лише при першому натисканні), кладеться в Supabase Storage (сховище
// "exports", публічне на читання, назва з випадковим ідентифікатором),
// після чого Telegram показує стандартне вікно "Завантажити файл"
// (Telegram.WebApp.downloadFile, Telegram 8.0+). Для старих версій —
// відкривається пряме посилання на файл.
// ======================================================

const XLSX_LIB_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

let xlsxLibPromise = null;

function loadXlsxLib() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (xlsxLibPromise) return xlsxLibPromise;
  xlsxLibPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = XLSX_LIB_URL;
    s.onload = () => window.XLSX ? resolve(window.XLSX) : reject(new Error('бібліотека Excel не ініціалізувалась'));
    s.onerror = () => {
      xlsxLibPromise = null;
      reject(new Error('не вдалося завантажити бібліотеку Excel (перевір інтернет)'));
    };
    document.head.appendChild(s);
  });
  return xlsxLibPromise;
}

// Число для Excel: справжнє число (не текст), порожнє — порожня клітинка
function xNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

// Аркуш з масиву рядків-об'єктів; ширина колонок — за найдовшим значенням
function makeSheet(XLSX, rowsArr, headers) {
  const data = [headers.map(h => h.title)].concat(
    rowsArr.map(r => headers.map(h => {
      const v = h.get(r);
      return v === undefined ? null : v;
    }))
  );
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = headers.map((h, i) => {
    const maxLen = data.reduce((m, row) => Math.max(m, String(row[i] ?? '').length), 0);
    return { wch: Math.min(Math.max(maxLen + 2, 8), 50) };
  });
  return ws;
}

function randomId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

// Завантажує книгу в Supabase Storage і віддає користувачу
async function deliverWorkbook(XLSX, wb, fileName) {
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const path = `${randomId()}/${fileName}`;

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/exports/${path}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': XLSX_MIME,
      'x-upsert': 'false'
    },
    body: new Blob([buffer], { type: XLSX_MIME })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error('не вдалося зберегти файл у сховище: ' + errText);
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/exports/${path}`;

  if (tg && typeof tg.downloadFile === 'function' && tg.isVersionAtLeast && tg.isVersionAtLeast('8.0')) {
    tg.downloadFile({ url: publicUrl, file_name: fileName });
  } else if (tg && typeof tg.openLink === 'function') {
    tg.openLink(publicUrl);
  } else {
    window.open(publicUrl, '_blank');
  }
}

// Обгортка для кнопки: стан "Формування...", помилки — alert
async function runExport(btn, job) {
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Формування файлу...';
  try {
    await job();
    btn.textContent = '✅ Файл готовий';
    setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 2500);
  } catch (e) {
    alert('Помилка вивантаження: ' + e.message);
    btn.textContent = original;
    btn.disabled = false;
  }
}

// ---------- Excel: звірка з Wialon ----------
// Аркуш "Підсумок" — те саме, що картки на екрані; аркуш "По днях" —
// розбивка по днях для кожної техніки.
function exportWialonExcel(btn, rows, from, to) {
  runExport(btn, async () => {
    const XLSX = await loadXlsxLib();

    const summarySheet = makeSheet(XLSX, rows, [
      { title: 'Техніка', get: r => r.equipment_name },
      { title: 'ID у Wialon', get: r => r.wialon_unit_id || '' },
      { title: 'Статус', get: r => wialonRowStatus(r) },
      { title: 'Звітів', get: r => xNum(r.reports_count) },
      { title: 'Днів зі звітами', get: r => xNum(r.report_days) },
      { title: 'Мотогодини: звіти', get: r => xNum(r.moto_hours_reports) },
      { title: 'Мотогодини: Wialon', get: r => xNum(r.moto_hours_wialon) },
      { title: 'Мотогодини: різниця (звіти − Wialon)', get: r => xNum(r.moto_hours_diff) },
      { title: 'Заправка, л: звіти', get: r => xNum(r.fueling_reports) },
      { title: 'Заправка, л: Wialon', get: r => xNum(r.fueling_wialon) },
      { title: 'Заправка, л: різниця', get: r => xNum(r.fueling_diff) },
      { title: 'Злито, л (Wialon)', get: r => xNum(r.fuel_drained_wialon) },
      { title: 'Пробіг, км: звіти', get: r => xNum(r.km_reports) },
      { title: 'Пробіг, км: Wialon', get: r => xNum(r.km_wialon) },
      { title: 'Днів з даними Wialon', get: r => xNum(r.wialon_days_collected) },
      { title: 'Днів роботи без звіту', get: r => xNum(r.days_work_without_report) }
    ]);

    // Розбивка по днях — окремий запит по кожній техніці
    const dailyRows = [];
    for (const r of rows) {
      const days = await supaRpc('wialon_equipment_daily', { p_equipment_id: r.equipment_id, p_from: from, p_to: to });
      (days || []).forEach(d => dailyRows.push({ equipment_name: r.equipment_name, ...d }));
    }

    const dailySheet = makeSheet(XLSX, dailyRows, [
      { title: 'Техніка', get: d => d.equipment_name },
      { title: 'Дата', get: d => formatDateUA(d.work_date) },
      { title: 'Звітів', get: d => xNum(d.reports_count) },
      { title: "Об'єкти", get: d => d.objects || '' },
      { title: 'Мотогодини: звіти', get: d => xNum(d.moto_hours_reports) },
      { title: 'Мотогодини: Wialon', get: d => xNum(d.moto_hours_wialon) },
      { title: 'Мотогодини: різниця', get: d => xNum(d.moto_hours_diff) },
      { title: 'Заправка, л: звіти', get: d => xNum(d.fueling_reports) },
      { title: 'Заправка, л: Wialon', get: d => xNum(d.fueling_wialon) },
      { title: 'Злито, л (Wialon)', get: d => xNum(d.fuel_drained_wialon) },
      { title: 'Пробіг, км: звіти', get: d => xNum(d.km_reports) },
      { title: 'Пробіг, км: Wialon', get: d => xNum(d.km_wialon) },
      { title: 'Дані Wialon', get: d => d.wialon_status || 'не зібрано' }
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Підсумок');
    XLSX.utils.book_append_sheet(wb, dailySheet, 'По днях');

    await deliverWorkbook(XLSX, wb, `Zvirka_Wialon_${from}_${to}.xlsx`);
  });
}

// ---------- Excel: звіт по об'єкту ----------
// Аркуші: "Разом" (підсумок об'єкта), "Техніка й оператори" (те саме, що
// картки на екрані), "Звіти" — кожен звіт окремим рядком.
function exportObjectExcel(btn, objectId, objectName, rows, from, to) {
  runExport(btn, async () => {
    const XLSX = await loadXlsxLib();

    const sum = (key) => rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
    const kmRows = rows.filter(r => r.km !== null);

    const totalSheet = makeSheet(XLSX, [{}], [
      { title: "Об'єкт", get: () => objectName },
      { title: 'Період з', get: () => formatDateUA(from) },
      { title: 'Період по', get: () => formatDateUA(to) },
      { title: 'Звітів', get: () => sum('reports_count') },
      { title: 'Підтверджено', get: () => sum('confirmed_count') },
      { title: 'Техніки', get: () => new Set(rows.map(r => r.equipment_id)).size },
      { title: 'Операторів', get: () => new Set(rows.map(r => r.operator_id)).size },
      { title: 'Мотогодини', get: () => sum('moto_hours') },
      { title: 'Пробіг, км', get: () => kmRows.length ? sum('km') : null },
      { title: 'Людиногодини', get: () => sum('person_hours') },
      { title: 'Перебазування, год', get: () => sum('travel_hours') },
      { title: 'Перевезення людей, год', get: () => sum('transport_hours') },
      { title: 'Простій, год', get: () => sum('downtime_hours') },
      { title: 'Ремонт, год', get: () => sum('repair_hours') },
      { title: 'Поломок', get: () => sum('breakdowns_count') },
      { title: 'Заправка, л', get: () => sum('fueling_liters') }
    ]);

    const groupSheet = makeSheet(XLSX, rows, [
      { title: 'Техніка', get: r => r.equipment_name || '' },
      { title: 'Оператор', get: r => r.operator_name || '' },
      { title: 'Перша дата', get: r => formatDateUA(r.first_date) },
      { title: 'Остання дата', get: r => formatDateUA(r.last_date) },
      { title: 'Днів', get: r => xNum(r.work_days) },
      { title: 'Звітів', get: r => xNum(r.reports_count) },
      { title: 'Підтверджено', get: r => xNum(r.confirmed_count) },
      { title: 'Мотогодини', get: r => xNum(r.moto_hours) },
      { title: 'Пробіг, км', get: r => xNum(r.km) },
      { title: 'Людиногодини', get: r => xNum(r.person_hours) },
      { title: 'Перебазування, год', get: r => xNum(r.travel_hours) },
      { title: 'Перевезення людей, год', get: r => xNum(r.transport_hours) },
      { title: 'Простій, год', get: r => xNum(r.downtime_hours) },
      { title: 'Ремонт, год', get: r => xNum(r.repair_hours) },
      { title: 'Поломок', get: r => xNum(r.breakdowns_count) },
      { title: 'Заправка, л', get: r => xNum(r.fueling_liters) }
    ]);

    // Усі звіти об'єкта за період (крім чернеток), кожен окремим рядком
    const reports = await supaGet(
      'daily_reports',
      `object_id=eq.${objectId}&work_date=gte.${from}&work_date=lte.${to}&status=neq.Чернетка` +
      `&select=id,work_date,status,customer_name,equipment(name),users!daily_reports_operator_id_fkey(full_name),` +
      `start_hours,end_hours,total_moto_hours,start_km,end_km,total_km,start_time,end_time,lunch_hours,total_person_hours,` +
      `travel_hours,travel_route,transport_hours,transport_route,downtime_hours,downtime_reason,fueling_liters,fueling_source,` +
      `has_breakdown,breakdown_description,repair_hours,operator_note` +
      `&order=work_date.asc`
    );

    const reportsSheet = makeSheet(XLSX, reports || [], [
      { title: 'Дата', get: r => formatDateUA(r.work_date) },
      { title: 'Звіт', get: r => r.id },
      { title: 'Статус', get: r => r.status },
      { title: 'Техніка', get: r => r.equipment?.name || '' },
      { title: 'Оператор', get: r => r.users?.full_name || '' },
      { title: 'Замовник', get: r => r.customer_name || '' },
      { title: 'М/г початок', get: r => xNum(r.start_hours) },
      { title: 'М/г кінець', get: r => xNum(r.end_hours) },
      { title: 'Мотогодини', get: r => xNum(r.total_moto_hours) },
      { title: 'Км початок', get: r => xNum(r.start_km) },
      { title: 'Км кінець', get: r => xNum(r.end_km) },
      { title: 'Пробіг, км', get: r => xNum(r.total_km) },
      { title: 'Початок роботи', get: r => formatTimeUA(r.start_time) },
      { title: 'Кінець роботи', get: r => formatTimeUA(r.end_time) },
      { title: 'Обід, год', get: r => xNum(r.lunch_hours) },
      { title: 'Людиногодини', get: r => xNum(r.total_person_hours) },
      { title: 'Перебазування, год', get: r => xNum(r.travel_hours) },
      { title: 'Маршрут перебазування', get: r => r.travel_route || '' },
      { title: 'Перевезення людей, год', get: r => xNum(r.transport_hours) },
      { title: 'Маршрут перевезення', get: r => r.transport_route || '' },
      { title: 'Простій, год', get: r => xNum(r.downtime_hours) },
      { title: 'Причина простою', get: r => r.downtime_reason || '' },
      { title: 'Заправка, л', get: r => xNum(r.fueling_liters) },
      { title: 'Звідки заправка', get: r => r.fueling_source || '' },
      { title: 'Поломка', get: r => r.has_breakdown ? 'так' : '' },
      { title: 'Опис поломки', get: r => r.breakdown_description || '' },
      { title: 'Ремонт, год', get: r => xNum(r.repair_hours) },
      { title: 'Примітка', get: r => r.operator_note || '' }
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, totalSheet, 'Разом');
    XLSX.utils.book_append_sheet(wb, groupSheet, 'Техніка й оператори');
    XLSX.utils.book_append_sheet(wb, reportsSheet, 'Звіти');

    await deliverWorkbook(XLSX, wb, `Zvit_obiekt_${objectId}_${from}_${to}.xlsx`);
  });
}

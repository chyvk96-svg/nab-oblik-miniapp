// ---------- Екран ролі "Адміністратор" ----------
// Використовує спільні reportDetailsHtml(), REPORT_SELECT_FIELDS, roleSubtitle(),
// goToRoleHome(), renderPendingApprovals(), renderApprovalHistory(), renderAddObject(),
// renderManageObjects() з responsible.js, а також renderUserList(), renderEquipmentList(),
// renderCustomersList() з admin-manage.js (усі файли вже завантажені у сторінку).
// Екрани "Непідтверджені звіти", "Усі закриті звіти", "Звіт по об'єкту" спільні
// з обліковцем: їхня кнопка "Назад" — backToRoleMenu(user) з accountant.js.
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
  document.getElementById('back-to-menu-pending').addEventListener('click', () => backToRoleMenu(user));

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
  document.getElementById('back-to-menu-closed').addEventListener('click', () => backToRoleMenu(user));

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

  wirePeriodPicker('wc', (from, to) => loadWialonSummary(user, from, to));
}

// Лічильник запитів: якщо користувач швидко змінює період, показуємо
// лише результат останнього запиту (попередні відповіді ігноруються)
let wialonLoadSeq = 0;

async function loadWialonSummary(user, from, to) {
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
    <button type="button" class="btn-add-top" id="wc-excel-btn">📥 Надіслати в Telegram</button>
    <div class="hint-inline" style="text-align:center;margin:-10px 0 14px">Файл Excel прийде вам у чат з ботом.</div>
    ${rows.map(r => wialonSummaryCardHtml(r)).join('')}
  `;

  listEl.querySelectorAll('[data-wc-days]').forEach(btn => {
    btn.addEventListener('click', () => toggleWialonDaily(btn, from, to));
  });

  const excelBtn = document.getElementById('wc-excel-btn');
  excelBtn.addEventListener('click', () => exportWialonExcel(excelBtn, user, rows, from, to));
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
// ЗВІТ ПО ОБ'ЄКТУ (адміністратор і обліковець — див. accountant.js)
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
  document.getElementById('back-to-menu-objrep').addEventListener('click', () => backToRoleMenu(user));

  const bodyEl = document.getElementById('objrep-body');

  let objectsList;
  try {
    objectsList = await supaGet('objects', 'select=id,name,status,customers(name)&order=status.asc,name.asc');
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
        ${objectsList.map(o => `<option value="${o.id}">${o.name}${o.customers?.name ? ` (${o.customers.name})` : ''}${o.status !== 'Активний' ? ' — закритий' : ''}</option>`).join('')}
      </select>
    </div>
    ${periodPickerHtml('or')}
    <div id="objrep-result" class="msg">Завантаження...</div>
  `;

  const objectSelect = document.getElementById('objrep-object');
  let lastPeriod = null;

  const show = (from, to) => {
    lastPeriod = { from, to };
    loadObjectReport(user, objectSelect.value, objectSelect.options[objectSelect.selectedIndex].text, from, to);
  };

  objectSelect.addEventListener('change', () => {
    if (lastPeriod) show(lastPeriod.from, lastPeriod.to);
  });

  wirePeriodPicker('or', show);
}

let objectLoadSeq = 0;

async function loadObjectReport(user, objectId, objectName, from, to) {
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

    <button type="button" class="btn-add-top" id="or-excel-btn" style="margin-top:6px">📥 Надіслати в Telegram</button>
    <div class="hint-inline" style="text-align:center;margin:-10px 0 0">Файл Excel прийде вам у чат з ботом.</div>

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
  excelBtn.addEventListener('click', () => exportObjectExcel(excelBtn, user, objectId, objectName, rows, from, to));
}

// ======================================================
// ВИВАНТАЖЕННЯ В EXCEL
// Файл .xlsx формується прямо в Mini App бібліотекою ExcelJS (з оформленням,
// вантажиться лише при першому натисканні — див. "ОФОРМЛЕНИЙ EXCEL" нижче),
// кладеться в Supabase Storage (сховище "exports", публічне на читання,
// назва з випадковим ідентифікатором) і надсилається в чат з ботом через
// export_files → Make (sendXlsxBufferToBot). Так працюють усі вивантаження:
// "Звірка з Wialon", "Звіт по об'єкту" (адмін і обліковець — accountant.js),
// "Години оператора" (operator.js).
// ======================================================

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Надсилає файл у чат з ботом: Storage "exports" → рядок у export_files →
// Database Webhook → Make "Вивантаження → файл у Telegram" → бот.
// Отримувач — viewer (хто натиснув). Тип має бути дозволений тригером
// export_files ("Звірка з Wialon" — адмін; "Звіт по об'єкту" — адмін і
// обліковець). exportUuid() — з operator.js.
async function sendXlsxBufferToBot(buffer, { fileName, viewer, exportType, from, to, caption }) {
  const path = `${exportUuid()}/${fileName}`;

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

  await supaInsert('export_files', {
    user_id: viewer.id,
    subject_user_id: viewer.id,
    export_type: exportType,
    period_from: from,
    period_to: to,
    file_path: path,
    file_name: fileName,
    caption
  });
}

// ======================================================
// ОФОРМЛЕНИЙ EXCEL (бібліотека ExcelJS — кольори, рамки, закріплена шапка,
// фільтри, формати чисел і дат, друк). Вантажиться лише при натисканні.
// Використовується всіма вивантаженнями (адмін, обліковець, оператор).
// ======================================================

const EXCELJS_LIB_URL = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';

let excelJsLibPromise = null;

function loadExcelJsLib() {
  if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
  if (excelJsLibPromise) return excelJsLibPromise;
  excelJsLibPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = EXCELJS_LIB_URL;
    s.onload = () => window.ExcelJS ? resolve(window.ExcelJS) : reject(new Error('бібліотека Excel не ініціалізувалась'));
    s.onerror = () => {
      excelJsLibPromise = null;
      reject(new Error('не вдалося завантажити бібліотеку Excel (перевір інтернет)'));
    };
    document.head.appendChild(s);
  });
  return excelJsLibPromise;
}

// Кольори оформлення (ARGB)
const XL = {
  headerFill: 'FFF5C400',   // фірмовий жовтий
  headerFont: 'FF141311',   // асфальт
  titleFont: 'FF141311',
  noteFont: 'FF6E6A5E',
  zebraFill: 'FFF7F6F2',    // смуга через рядок
  totalFill: 'FFFDF1C2',    // рядок "РАЗОМ"
  border: 'FFBFBBB0',
  statusFinal: 'FFE4F0E9',
  statusWait: 'FFFDF3E2',
  statusCorr: 'FFFBEAE3',
  greyFill: 'FFEDEBE6'
};

// Формати: тип колонки → формат числа і вирівнювання
// numFmt — формат у рядках даних (нулі не показуються, щоб таблиця не
// рябіла "0,00"); totalFmt — у рядку "РАЗОМ" і на аркуші "Разом" (з нулями)
const XL_TYPES = {
  text:   { numFmt: null,               totalFmt: null,   horizontal: 'center' },
  name:   { numFmt: null,               totalFmt: null,   horizontal: 'center' },
  long:   { numFmt: null,               totalFmt: null,   horizontal: 'left' },
  status: { numFmt: null,               totalFmt: null,   horizontal: 'center' },
  date:   { numFmt: 'dd.mm.yyyy',       totalFmt: null,   horizontal: 'center' },
  int:    { numFmt: '0;-0;;@',          totalFmt: '0',    horizontal: 'center' },
  hours:  { numFmt: '0.00;-0.00;;@',    totalFmt: '0.00', horizontal: 'center' },
  hours1: { numFmt: '0.0;-0.0;;@',      totalFmt: '0.0',  horizontal: 'center' },
  km:     { numFmt: '0.0;-0.0;;@',      totalFmt: '0.0',  horizontal: 'center' },
  liters: { numFmt: '0.0;-0.0;;@',      totalFmt: '0.0',  horizontal: 'center' }
};

// Значення клітинки: дати — справжні дати Excel, числа — числа, порожнє — пусто
function xlValue(v, type) {
  if (v === null || v === undefined || v === '') return null;
  if (type === 'date') {
    const [y, m, d] = String(v).slice(0, 10).split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  if (['int', 'hours', 'hours1', 'km', 'liters'].includes(type)) {
    const n = Number(v);
    return isNaN(n) ? null : n;
  }
  return String(v);
}

function xlBorder() {
  const side = { style: 'thin', color: { argb: XL.border } };
  return { top: side, left: side, bottom: side, right: side };
}

// Новий аркуш з налаштуванням друку і заголовком (3 рядки: назва,
// підзаголовок, примітка + час формування). Повертає номер першого
// вільного рядка під заголовком (з відступом в один рядок).
// wide — багато колонок: друк на 2 сторінки по ширині.
function xlNewSheet(wb, name, { title, subtitle, note, wide = false }) {
  const ws = wb.addWorksheet(name, {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9,             // A4
      fitToPage: true,
      fitToWidth: wide ? 2 : 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 }
    },
    headerFooter: { oddFooter: '&LНАБ ТехОблік&RСторінка &P з &N' }
  });

  // Заголовок не переноситься — довгий текст просто продовжується праворуч
  const titleRows = [
    { text: title, size: 14, bold: true, color: XL.titleFont },
    { text: subtitle || '', size: 12, bold: true, color: XL.titleFont },
    { text: `${note || ''}${note ? ' · ' : ''}сформовано ${formatDateTimeUA(new Date().toISOString())}`, size: 10, italic: true, color: XL.noteFont }
  ];
  titleRows.forEach((t, i) => {
    const r = i + 1;
    const cell = ws.getCell(r, 1);
    cell.value = t.text;
    cell.font = { name: 'Calibri', size: t.size, bold: !!t.bold, italic: !!t.italic, color: { argb: t.color } };
    cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false };
    ws.getRow(r).height = t.size >= 14 ? 22 : 18;
  });

  return { ws, nextRow: titleRows.length + 2 };
}

// Скільки рядків займе текст у колонці заданої ширини (перенос по словах)
function xlTextLines(text, width) {
  const max = Math.max(1, width - 2);
  let lines = 1, len = 0;
  String(text || '').split(/\s+/).forEach(word => {
    const w = word.length;
    if (len === 0) { len = w; }
    else if (len + 1 + w <= max) { len += 1 + w; }
    else { lines += 1; len = w; }
    while (len > max) { lines += 1; len -= max; }
  });
  return lines;
}

// Підпис розділу над таблицею (жирний, без рамок) — для аркушів з кількома таблицями
function xlSectionTitle(ws, row, text) {
  const cell = ws.getCell(row, 1);
  cell.value = text;
  cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: XL.titleFont } };
  cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false };
  ws.getRow(row).height = 20;
}

// Таблиця з оформленою шапкою, смугами, рамками і (за потреби) рядком
// "РАЗОМ" (сума колонок з total: true). Починається з рядка startRow.
// columns: [{ header, width, type, get(row), total?, align?, typeOf?(row), fillOf?(row) }]
//   type   — див. XL_TYPES; typeOf — тип для конкретного рядка
//   fillOf — колір заливки клітинки для рядка (ARGB) або null
// Повертає { headerRow, firstDataRow, lastDataRow, nextRow }.
function xlTable(ws, startRow, { columns, rows, totalsLabel, showZeros = false, emptyText = 'Даних за цей період немає' }) {
  const colCount = columns.length;

  // Висота шапки — під найдовшу назву колонки (приблизний підрахунок рядків)
  const headerLines = Math.max(2, ...columns.map(c => xlTextLines(c.header, c.width || 12)));
  const headerRow = ws.getRow(startRow);
  headerRow.height = 8 + headerLines * 13;
  columns.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.header;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: XL.headerFont } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.headerFill } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = xlBorder();
  });

  const firstDataRow = startRow + 1;
  rows.forEach((row, idx) => {
    const r = ws.getRow(firstDataRow + idx);
    columns.forEach((c, i) => {
      const type = c.typeOf ? c.typeOf(row) : (c.type || 'text');
      const fmt = XL_TYPES[type] || XL_TYPES.text;
      const cell = r.getCell(i + 1);
      cell.value = xlValue(c.get(row), type);
      const numFmt = showZeros ? fmt.totalFmt : fmt.numFmt;
      if (numFmt) cell.numFmt = numFmt;
      cell.font = { name: 'Calibri', size: 10 };
      const horizontal = c.align || fmt.horizontal;
      cell.alignment = { horizontal, vertical: 'middle', wrapText: true, indent: horizontal === 'left' ? 1 : 0 };
      cell.border = xlBorder();
      let fill = idx % 2 === 1 ? XL.zebraFill : null;
      if (type === 'status') {
        const v = String(cell.value || '');
        if (v === 'Фінально підтверджено') fill = XL.statusFinal;
        else if (v === 'Повернено на коригування') fill = XL.statusCorr;
        else if (v) fill = XL.statusWait;
      }
      if (c.fillOf) fill = c.fillOf(row) || fill;
      if (fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    });
  });

  let lastDataRow = firstDataRow + rows.length - 1;
  let nextRow = lastDataRow + 1;

  if (rows.length === 0) {
    ws.mergeCells(firstDataRow, 1, firstDataRow, Math.max(colCount, 2));
    const cell = ws.getCell(firstDataRow, 1);
    cell.value = emptyText;
    cell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: XL.noteFont } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = xlBorder();
    lastDataRow = firstDataRow;
    nextRow = firstDataRow + 1;
  } else if (totalsLabel) {
    const tr = ws.getRow(nextRow);
    tr.height = 20;
    columns.forEach((c, i) => {
      const cell = tr.getCell(i + 1);
      const fmt = XL_TYPES[c.type] || XL_TYPES.text;
      if (i === 0) cell.value = totalsLabel;
      if (c.total) {
        const total = rows.reduce((acc, row) => acc + (Number(c.get(row)) || 0), 0);
        cell.value = Math.round(total * 100) / 100;
        if (fmt.totalFmt) cell.numFmt = fmt.totalFmt;
      }
      cell.font = { name: 'Calibri', size: 10, bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL.totalFill } };
      cell.alignment = { horizontal: i === 0 ? 'center' : fmt.horizontal, vertical: 'middle', wrapText: true };
      cell.border = xlBorder();
    });
    nextRow += 1;
  }

  return { headerRow: startRow, firstDataRow, lastDataRow, nextRow };
}

// Закріплена шапка (+ перші колонки), фільтри по таблиці, повтор шапки при друці
function xlFinishSheet(ws, { headerRow, lastDataRow, colCount, freezeCols = 0, filter = true }) {
  ws.views = [{ state: 'frozen', xSplit: freezeCols, ySplit: headerRow, zoomScale: 100 }];
  if (filter && lastDataRow > headerRow) {
    ws.autoFilter = {
      from: { row: headerRow, column: 1 },
      to: { row: lastDataRow, column: colCount }
    };
  }
  ws.pageSetup.printTitlesRow = `${headerRow}:${headerRow}`;
}

// Аркуш з однією таблицею: заголовок + таблиця + закріплення/фільтри/друк.
function xlStyledSheet(wb, name, { title, subtitle, note, columns, rows, totalsLabel, freezeCols = 0, showZeros = false }) {
  const { ws, nextRow } = xlNewSheet(wb, name, { title, subtitle, note, wide: columns.length > 16 });
  ws.columns = columns.map(c => ({ width: c.width || 12 }));
  const t = xlTable(ws, nextRow, { columns, rows, totalsLabel, showZeros });
  xlFinishSheet(ws, { headerRow: t.headerRow, lastDataRow: rows.length ? t.lastDataRow : t.headerRow, colCount: columns.length, freezeCols });
  return ws;
}

// Обгортка для кнопки: стан "Формування...", помилки — alert
async function runExport(btn, job) {
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Формування файлу...';
  try {
    await job();
    btn.textContent = '✅ Надіслано в чат з ботом';
    setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 4000);
  } catch (e) {
    alert('Помилка вивантаження: ' + e.message);
    btn.textContent = original;
    btn.disabled = false;
  }
}

// ---------- Excel: звірка з Wialon ----------
// Аркуш "Підсумок" — те саме, що картки на екрані; аркуш "По днях" —
// розбивка по днях для кожної техніки.
function exportWialonExcel(btn, user, rows, from, to) {
  runExport(btn, async () => {
    const ExcelJS = await loadExcelJsLib();

    // Розбивка по днях — окремий запит по кожній техніці
    const dailyRows = [];
    for (const r of rows) {
      const days = await supaRpc('wialon_equipment_daily', { p_equipment_id: r.equipment_id, p_from: from, p_to: to });
      (days || []).forEach(d => dailyRows.push({ equipment_name: r.equipment_name, ...d }));
    }

    const wb = buildWialonWorkbook(ExcelJS, { rows, dailyRows, from, to });
    const buffer = await wb.xlsx.writeBuffer();

    const checkCount = rows.filter(r => wialonRowStatus(r) === 'перевірити').length;
    const noWialonCount = rows.filter(r => wialonRowStatus(r) === 'без Wialon').length;
    await sendXlsxBufferToBot(buffer, {
      fileName: `Zvirka_Wialon_${from}_${to}.xlsx`,
      viewer: user,
      exportType: 'Звірка з Wialon',
      from,
      to,
      caption: [
        '🛰️ Звірка з Wialon',
        `📅 ${formatDateUA(from)} – ${formatDateUA(to)}`,
        `Техніки: ${rows.length} · ⚠ перевірити: ${checkCount} · без Wialon: ${noWialonCount}`
      ].join('\n')
    });
  });
}

// Книга "Звірка з Wialon" (оформлена): "Підсумок" і "По днях".
// Розбіжності понад поріг і дні роботи без звіту підсвічуються.
function buildWialonWorkbook(ExcelJS, { rows, dailyRows, from, to }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'НАБ ТехОблік';
  wb.created = new Date();
  const period = `Період: ${formatDateUA(from)} – ${formatDateUA(to)}`;

  const bad = XL.statusCorr;
  const motoBad = v => v !== null && v !== undefined && Math.abs(Number(v)) > WIALON_MOTO_THRESHOLD ? bad : null;
  const fuelBad = v => v !== null && v !== undefined && Math.abs(Number(v)) > WIALON_FUEL_THRESHOLD ? bad : null;
  const positiveBad = v => Number(v) > 0 ? bad : null;
  const statusFill = r => {
    const st = wialonRowStatus(r);
    if (st === 'OK') return XL.statusFinal;
    if (st === 'перевірити') return bad;
    return XL.greyFill;
  };

  xlStyledSheet(wb, 'Підсумок', {
    title: 'Звірка з Wialon — підсумок по техніці',
    subtitle: `Різниця = звіти − Wialon · підсвічено: мотогодини понад ±${fmtNum(WIALON_MOTO_THRESHOLD)} год, заправка понад ±${WIALON_FUEL_THRESHOLD} л, злив, дні без звіту`,
    note: period,
    columns: [
      { header: 'Техніка', width: 28, type: 'name', get: r => r.equipment_name },
      { header: 'ID у Wialon', width: 12, type: 'text', get: r => r.wialon_unit_id || '' },
      { header: 'Статус', width: 13, type: 'text', get: r => wialonRowStatus(r), fillOf: statusFill },
      { header: 'Звітів', width: 8, type: 'int', get: r => r.reports_count, total: true },
      { header: 'Днів зі звітами', width: 10, type: 'int', get: r => r.report_days },
      { header: 'Мотогодини: звіти', width: 12, type: 'hours', get: r => r.moto_hours_reports, total: true },
      { header: 'Мотогодини: Wialon', width: 12, type: 'hours', get: r => r.moto_hours_wialon, total: true },
      { header: 'Мотогодини: різниця', width: 12, type: 'hours', get: r => r.moto_hours_diff, fillOf: r => motoBad(r.moto_hours_diff) },
      { header: 'Заправка, л: звіти', width: 11, type: 'liters', get: r => r.fueling_reports, total: true },
      { header: 'Заправка, л: Wialon', width: 11, type: 'liters', get: r => r.fueling_wialon, total: true },
      { header: 'Заправка, л: різниця', width: 11, type: 'liters', get: r => r.fueling_diff, fillOf: r => fuelBad(r.fueling_diff) },
      { header: 'Злито, л (Wialon)', width: 11, type: 'liters', get: r => r.fuel_drained_wialon, total: true, fillOf: r => positiveBad(r.fuel_drained_wialon) },
      { header: 'Пробіг, км: звіти', width: 11, type: 'km', get: r => r.km_reports, total: true },
      { header: 'Пробіг, км: Wialon', width: 11, type: 'km', get: r => r.km_wialon, total: true },
      { header: 'Днів з даними Wialon', width: 11, type: 'int', get: r => r.wialon_days_collected },
      { header: 'Днів роботи без звіту', width: 11, type: 'int', get: r => r.days_work_without_report, fillOf: r => positiveBad(r.days_work_without_report) }
    ],
    rows,
    totalsLabel: 'РАЗОМ',
    freezeCols: 1
  });

  xlStyledSheet(wb, 'По днях', {
    title: 'Звірка з Wialon — по днях',
    subtitle: 'Кожна техніка по днях: звіти операторів (усіх об’єктів за день) проти Wialon',
    note: period,
    columns: [
      { header: 'Техніка', width: 28, type: 'name', get: d => d.equipment_name },
      { header: 'Дата', width: 11, type: 'date', get: d => d.work_date },
      { header: 'Звітів', width: 8, type: 'int', get: d => d.reports_count, total: true },
      { header: "Об'єкти", width: 34, type: 'long', get: d => d.objects || '' },
      { header: 'Мотогодини: звіти', width: 12, type: 'hours', get: d => d.moto_hours_reports, total: true },
      { header: 'Мотогодини: Wialon', width: 12, type: 'hours', get: d => d.moto_hours_wialon, total: true },
      { header: 'Мотогодини: різниця', width: 12, type: 'hours', get: d => d.moto_hours_diff, fillOf: d => motoBad(d.moto_hours_diff) },
      { header: 'Заправка, л: звіти', width: 11, type: 'liters', get: d => d.fueling_reports, total: true },
      { header: 'Заправка, л: Wialon', width: 11, type: 'liters', get: d => d.fueling_wialon, total: true },
      { header: 'Злито, л (Wialon)', width: 11, type: 'liters', get: d => d.fuel_drained_wialon, total: true, fillOf: d => positiveBad(d.fuel_drained_wialon) },
      { header: 'Пробіг, км: звіти', width: 11, type: 'km', get: d => d.km_reports, total: true },
      { header: 'Пробіг, км: Wialon', width: 11, type: 'km', get: d => d.km_wialon, total: true },
      { header: 'Дані Wialon', width: 14, type: 'text', get: d => d.wialon_status || 'не зібрано' }
    ],
    rows: dailyRows,
    totalsLabel: 'РАЗОМ',
    freezeCols: 2
  });

  return wb;
}

// ---------- Excel: звіт по об'єкту ----------
// Аркуші: "Разом" (підсумок об'єкта), "Техніка й оператори" (те саме, що
// картки на екрані), "Звіти" — кожен звіт окремим рядком.
function exportObjectExcel(btn, user, objectId, objectName, rows, from, to) {
  // Обліковець отримує скорочений формат (accountant.js)
  if (user.role === 'Обліковець') {
    exportObjectExcelAccountant(btn, user, objectId, objectName, from, to);
    return;
  }
  runExport(btn, async () => {
    const ExcelJS = await loadExcelJsLib();

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

    const wb = buildObjectReportWorkbook(ExcelJS, { objectName, from, to, rows, reports: reports || [] });
    const buffer = await wb.xlsx.writeBuffer();

    const sum = (key) => rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
    await sendXlsxBufferToBot(buffer, {
      fileName: `Zvit_obiekt_${String(objectId).replace(/[^A-Za-z0-9_-]/g, '')}_${from}_${to}.xlsx`,
      viewer: user,
      exportType: "Звіт по об'єкту",
      from,
      to,
      caption: [
        `🏗️ Звіт по об'єкту: ${objectName}`,
        `📅 ${formatDateUA(from)} – ${formatDateUA(to)}`,
        `Звітів: ${sum('reports_count')} (підтверджено ${sum('confirmed_count')})`,
        `Мотогодини: ${fmtNum(sum('moto_hours'))} · людиногодини: ${fmtNum(sum('person_hours'))}`,
        `Заправка: ${fmtNum(sum('fueling_liters'), 1)} л`
      ].join('\n')
    });
  });
}

// Книга "Звіт по об'єкту" (адміністратор), оформлена: аркуші "Разом",
// "Техніка й оператори", "Звіти". Чиста функція — без запитів до бази.
function buildObjectReportWorkbook(ExcelJS, { objectName, from, to, rows, reports }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'НАБ ТехОблік';
  wb.created = new Date();

  const sum = (key) => rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
  const kmRows = rows.filter(r => r.km !== null && r.km !== undefined);
  const period = `Період: ${formatDateUA(from)} – ${formatDateUA(to)}`;

  // ---- Аркуш "Разом" ----
  const totalItems = [
    { label: 'Звітів', value: sum('reports_count'), type: 'int' },
    { label: 'Підтверджено', value: sum('confirmed_count'), type: 'int' },
    { label: 'Одиниць техніки', value: new Set(rows.map(r => r.equipment_id)).size, type: 'int' },
    { label: 'Операторів', value: new Set(rows.map(r => r.operator_id)).size, type: 'int' },
    { label: 'Мотогодини', value: sum('moto_hours'), type: 'hours' },
    { label: 'Пробіг, км', value: kmRows.length ? sum('km') : null, type: 'km' },
    { label: 'Людиногодини', value: sum('person_hours'), type: 'hours' },
    { label: 'Перебазування, год', value: sum('travel_hours'), type: 'hours' },
    { label: 'Перевезення людей, год', value: sum('transport_hours'), type: 'hours' },
    { label: 'Простій, год', value: sum('downtime_hours'), type: 'hours' },
    { label: 'Ремонт, год', value: sum('repair_hours'), type: 'hours' },
    { label: 'Поломок', value: sum('breakdowns_count'), type: 'int' },
    { label: 'Заправка, л', value: sum('fueling_liters'), type: 'liters' }
  ];
  xlStyledSheet(wb, 'Разом', {
    title: "Звіт по об'єкту — разом",
    subtitle: objectName,
    note: period,
    columns: [
      { header: 'Показник', width: 34, type: 'text', get: it => it.label, align: 'left' },
      { header: 'Значення', width: 18, get: it => it.value, typeOf: it => it.type }
    ],
    rows: totalItems,
    freezeCols: 0,
    showZeros: true
  });

  // ---- Аркуш "Техніка й оператори" ----
  xlStyledSheet(wb, 'Техніка й оператори', {
    title: "Звіт по об'єкту — техніка й оператори",
    subtitle: objectName,
    note: period,
    columns: [
      { header: 'Техніка', width: 26, type: 'name', get: r => r.equipment_name || '' },
      { header: 'Оператор', width: 26, type: 'name', get: r => r.operator_name || '' },
      { header: 'Перша дата', width: 12, type: 'date', get: r => r.first_date },
      { header: 'Остання дата', width: 12, type: 'date', get: r => r.last_date },
      { header: 'Днів', width: 8, type: 'int', get: r => r.work_days },
      { header: 'Звітів', width: 9, type: 'int', get: r => r.reports_count, total: true },
      { header: 'Підтверджено', width: 13, type: 'int', get: r => r.confirmed_count, total: true },
      { header: 'Мотогодини', width: 12, type: 'hours', get: r => r.moto_hours, total: true },
      { header: 'Пробіг, км', width: 11, type: 'km', get: r => r.km, total: true },
      { header: 'Людиногодини', width: 13, type: 'hours', get: r => r.person_hours, total: true },
      { header: 'Перебазування, год', width: 15, type: 'hours', get: r => r.travel_hours, total: true },
      { header: 'Перевезення людей, год', width: 13, type: 'hours', get: r => r.transport_hours, total: true },
      { header: 'Простій, год', width: 10, type: 'hours', get: r => r.downtime_hours, total: true },
      { header: 'Ремонт, год', width: 10, type: 'hours', get: r => r.repair_hours, total: true },
      { header: 'Поломок', width: 9, type: 'int', get: r => r.breakdowns_count, total: true },
      { header: 'Заправка, л', width: 11, type: 'liters', get: r => r.fueling_liters, total: true }
    ],
    rows,
    totalsLabel: 'РАЗОМ',
    freezeCols: 2
  });

  // ---- Аркуш "Звіти" ----
  xlStyledSheet(wb, 'Звіти', {
    title: "Звіт по об'єкту — усі звіти",
    subtitle: objectName,
    note: `${period} · чернетки не включено`,
    columns: [
      { header: 'Дата', width: 11, type: 'date', get: r => r.work_date },
      { header: 'Звіт', width: 10, type: 'text', get: r => r.id },
      { header: 'Статус', width: 23, type: 'status', get: r => r.status },
      { header: 'Техніка', width: 24, type: 'name', get: r => r.equipment?.name || '' },
      { header: 'Оператор', width: 24, type: 'name', get: r => r.users?.full_name || '' },
      { header: 'Замовник', width: 20, type: 'name', get: r => r.customer_name || '' },
      { header: 'М/г початок', width: 11, type: 'hours1', get: r => r.start_hours },
      { header: 'М/г кінець', width: 11, type: 'hours1', get: r => r.end_hours },
      { header: 'Мотогодини', width: 12, type: 'hours', get: r => r.total_moto_hours, total: true },
      { header: 'Км початок', width: 11, type: 'km', get: r => r.start_km },
      { header: 'Км кінець', width: 11, type: 'km', get: r => r.end_km },
      { header: 'Пробіг, км', width: 10, type: 'km', get: r => r.total_km, total: true },
      { header: 'Початок роботи', width: 10, type: 'text', get: r => r.start_time ? formatTimeUA(r.start_time) : '' },
      { header: 'Кінець роботи', width: 10, type: 'text', get: r => r.end_time ? formatTimeUA(r.end_time) : '' },
      { header: 'Обід, год', width: 8, type: 'hours', get: r => r.lunch_hours },
      { header: 'Людиногодини', width: 13, type: 'hours', get: r => r.total_person_hours, total: true },
      { header: 'Перебазування, год', width: 15, type: 'hours', get: r => r.travel_hours, total: true },
      { header: 'Маршрут перебазування', width: 28, type: 'long', get: r => r.travel_route || '' },
      { header: 'Перевезення людей, год', width: 12, type: 'hours', get: r => r.transport_hours, total: true },
      { header: 'Маршрут перевезення', width: 28, type: 'long', get: r => r.transport_route || '' },
      { header: 'Простій, год', width: 10, type: 'hours', get: r => r.downtime_hours, total: true },
      { header: 'Причина простою', width: 28, type: 'long', get: r => r.downtime_reason || '' },
      { header: 'Заправка, л', width: 11, type: 'liters', get: r => r.fueling_liters, total: true },
      { header: 'Звідки заправка', width: 16, type: 'name', get: r => r.fueling_source || '' },
      { header: 'Поломка', width: 9, type: 'text', get: r => r.has_breakdown ? 'так' : '' },
      { header: 'Опис поломки', width: 30, type: 'long', get: r => r.breakdown_description || '' },
      { header: 'Ремонт, год', width: 10, type: 'hours', get: r => r.repair_hours, total: true },
      { header: 'Примітка', width: 30, type: 'long', get: r => r.operator_note || '' }
    ],
    rows: reports,
    totalsLabel: 'РАЗОМ',
    freezeCols: 1
  });

  return wb;
}

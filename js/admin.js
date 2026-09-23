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

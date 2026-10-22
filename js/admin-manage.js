// ---------- Адміністрування: користувачі, техніка, замовники ----------
// Ці екрани доступні тільки з меню адміністратора (admin.js).
// Використовують спільні helper-и topbarHtml(), roleSubtitle() (з utils.js /
// responsible.js) та supaGet/supaInsert/supaUpdate/supaRpc (з supabase-client.js).
// Видалення ніде не робиться — тільки деактивація (status), щоб не ламати
// історичні зв'язки (звіти, прив'язки техніки тощо).

// ======================================================
// А. КОРИСТУВАЧІ: список, редагування, деактивація/активація
// ======================================================

async function renderUserList(user) {
  app.innerHTML = `
    ${topbarHtml('Користувачі', roleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-menu-users" style="margin:0 0 14px">← Назад до меню</div>
      <button type="button" class="btn-add-top" id="btn-go-add-user">+ Додати користувача</button>
      ${listSearchHtml('users', 'Пошук: ПІБ, код, телефон, роль')}
      <div id="users-list" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-menu-users').addEventListener('click', () => renderAdminHome(user));
  document.getElementById('btn-go-add-user').addEventListener('click', () => renderAddUser(user));

  const listEl = document.getElementById('users-list');

  let usersList;
  try {
    // (з 2026-10-22) телефон і Telegram ID — лише через функцію бази для адміна
    usersList = await supaRpc('nab_admin_users', { p_user_id: null });
  } catch (e) {
    listEl.textContent = 'Помилка завантаження: ' + e.message;
    return;
  }

  if (!usersList || usersList.length === 0) {
    listEl.textContent = 'Користувачів ще немає.';
    return;
  }

  listEl.className = '';
  listEl.innerHTML = usersList.map(u => `
    <div class="report-card" data-search="${searchAttr(u.full_name, u.code, u.phone, u.role, u.telegram_id, u.status)}">
      <div class="top-row">
        <span class="date">${escHtml(u.full_name)}</span>
        <span class="status-chip ${u.status === 'Активний' ? 'status-final' : 'status-corr'}">${escHtml(u.status)}</span>
      </div>
      <div class="meta">${escHtml(u.role)} · тел: ${escHtml(u.phone || '—')} · TG ID: ${escHtml(u.telegram_id)}${u.code ? ` · код: ${escHtml(u.code)}` : ''}</div>
      <div class="item-actions">
        <button type="button" class="btn-confirm" data-edit-user="${u.id}">Редагувати</button>
        <button type="button" class="btn-reject" data-toggle-user="${u.id}" data-current-status="${escHtml(u.status)}">
          ${u.status === 'Активний' ? 'Деактивувати' : 'Активувати'}
        </button>
      </div>
    </div>
  `).join('');
  wireListSearch('users', listEl);

  listEl.querySelectorAll('[data-edit-user]').forEach(btn => {
    btn.addEventListener('click', () => renderEditUser(user, btn.dataset.editUser));
  });

  listEl.querySelectorAll('[data-toggle-user]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const newStatus = btn.dataset.currentStatus === 'Активний' ? 'Неактивний' : 'Активний';
      const originalLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Оновлення...';
      try {
        await supaUpdate('users', `id=eq.${btn.dataset.toggleUser}`, { status: newStatus }, { returnRows: false });
        renderUserList(user);
      } catch (e) {
        alert('Помилка: ' + e.message);
        btn.disabled = false;
        btn.textContent = originalLabel;
      }
    });
  });
}

async function renderEditUser(user, targetUserId) {
  app.innerHTML = `
    ${topbarHtml('Редагування користувача', roleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-users-list" style="margin:0 0 14px">← Назад до списку</div>
      <div id="edit-user-body" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-users-list').addEventListener('click', () => renderUserList(user));

  const bodyEl = document.getElementById('edit-user-body');

  let targetUser, rolesList;
  try {
    const rows = await supaRpc('nab_admin_users', { p_user_id: targetUserId });
    targetUser = rows && rows[0];
    rolesList = await supaGet('roles', `status=eq.Активна&select=name&order=name.asc`);
  } catch (e) {
    bodyEl.textContent = 'Помилка завантаження: ' + e.message;
    return;
  }

  if (!targetUser) {
    bodyEl.textContent = 'Користувача не знайдено.';
    return;
  }

  // Водій — лише позначка, у Mini App працює як Оператор (має закріплену техніку)
  const worksAsOperator = targetUser.role === 'Оператор' || targetUser.role === 'Водій';

  bodyEl.className = '';
  bodyEl.innerHTML = `
    <form id="edit-user-form">
      <div class="section">
        <div class="section-title"><span class="n">1</span><span class="icon">👤</span>Дані користувача</div>

        <label>ПІБ</label>
        <input type="text" id="edit_user_name" required value="${escHtml(targetUser.full_name)}">

        <label>Код / номер</label>
        <input type="text" id="edit_user_code" value="${escHtml(targetUser.code || '')}" placeholder="Необов'язково">

        <label>Telegram ID</label>
        <input type="number" id="edit_user_telegram_id" required value="${targetUser.telegram_id}">

        <label>Телефон</label>
        <input type="text" id="edit_user_phone" value="${escHtml(targetUser.phone || '')}">

        <label>Роль</label>
        <select id="edit_user_role" required>
          ${rolesList.map(r => `<option value="${escHtml(r.name)}" ${r.name === targetUser.role ? 'selected' : ''}>${escHtml(r.name)}</option>`).join('')}
        </select>

        <label>Примітка</label>
        <textarea id="edit_user_note">${escHtml(targetUser.note || '')}</textarea>
      </div>

      <button type="submit" id="edit-user-submit-btn">Зберегти зміни</button>
      <div class="error-text hidden" id="edit-user-error-box"></div>
    </form>
    ${worksAsOperator ? `
      <button type="button" class="btn-add-top" id="btn-go-user-equipment" style="margin-top:18px">🚜 Керувати технікою цього оператора</button>
    ` : ''}
  `;

  if (worksAsOperator) {
    document.getElementById('btn-go-user-equipment').addEventListener('click', () => renderUserEquipment(user, targetUserId));
  }

  const form = document.getElementById('edit-user-form');
  const submitBtn = document.getElementById('edit-user-submit-btn');
  const errorBox = document.getElementById('edit-user-error-box');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');

    const fullName = document.getElementById('edit_user_name').value.trim();
    const telegramId = document.getElementById('edit_user_telegram_id').value.trim();
    const phone = document.getElementById('edit_user_phone').value.trim();
    const role = document.getElementById('edit_user_role').value;
    const note = document.getElementById('edit_user_note').value.trim();

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

    submitBtn.disabled = true;
    submitBtn.textContent = 'Збереження...';

    try {
      await supaUpdate('users', `id=eq.${targetUserId}`, {
        full_name: fullName,
        telegram_id: parseInt(telegramId, 10),
        phone: phone || null,
        role: role,
        code: codeValue(document.getElementById('edit_user_code').value),
        note: note || null
      }, { returnRows: false });
      renderUserList(user);
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = "Зберегти зміни";
    }
  });
}

// ======================================================
// B. ТЕХНІКА: список, додавання, редагування, деактивація/активація
// ======================================================

// ID юніта Wialon — лише цифри (наприклад 23952736). Порожнє = техніка не
// прив'язана до Wialon і в автоматичній звірці не бере участі.
// Повертає { value, error }.
function parseWialonUnitId(raw) {
  const v = (raw || '').trim();
  if (v === '') return { value: null, error: null };
  if (!/^\d+$/.test(v)) {
    return { value: null, error: 'ID у Wialon має складатися лише з цифр (наприклад 23952736).' };
  }
  return { value: v, error: null };
}

// "Код / номер" (з 2026-10-14) — об'єкти, техніка, користувачі. Поки
// необов'язковий і без перевірок: формат номерів ще уточнюється.
function codeValue(raw) {
  const v = (raw || '').trim();
  return v === '' ? null : v;
}

// ЄДРПОУ замовника (з 2026-10-14): 8 цифр (підприємство) або 10 (ІПН ФОП).
// Необов'язковий. Пробіли в середині прибираємо. Повертає { value, error }.
function parseEdrpou(raw) {
  const v = (raw || '').replace(/\s+/g, '');
  if (v === '') return { value: null, error: null };
  if (!/^(\d{8}|\d{10})$/.test(v)) {
    return { value: null, error: 'ЄДРПОУ — 8 цифр (підприємство) або 10 цифр (ІПН, якщо замовник — ФОП).' };
  }
  return { value: v, error: null };
}

// Чи є вже замовник з таким ЄДРПОУ (крім exceptId). Повертає текст
// помилки або null. У базі теж стоїть унікальний індекс idx_customers_edrpou.
async function edrpouDuplicateError(edrpou, exceptId) {
  if (!edrpou) return null;
  let q = `edrpou=eq.${edrpou}&select=id,name&limit=1`;
  if (exceptId) q += `&id=neq.${exceptId}`;
  const rows = await supaGet('customers', q);
  return rows && rows.length ? `Цей ЄДРПОУ вже є у замовника «${rows[0].name}».` : null;
}

function customerSaveErrorText(err) {
  const msg = (err && err.message) || '';
  if (msg.includes('idx_customers_edrpou') || msg.includes('duplicate key')) {
    return 'Цей ЄДРПОУ вже є в іншого замовника. Перевір код.';
  }
  if (msg.includes('customers_edrpou_format_chk')) {
    return 'ЄДРПОУ — 8 цифр (підприємство) або 10 цифр (ІПН, якщо замовник — ФОП).';
  }
  return msg;
}

// Зрозуміле повідомлення, якщо цей ID Wialon уже прив'язаний до іншої техніки
// (у БД стоїть унікальний індекс idx_equipment_wialon_unit_id).
function equipmentSaveErrorText(err) {
  const msg = (err && err.message) || '';
  if (msg.includes('idx_equipment_wialon_unit_id') || msg.includes('duplicate key')) {
    return 'Цей ID у Wialon уже прив\'язаний до іншої техніки. Перевір номер.';
  }
  return msg;
}

async function renderEquipmentList(user) {
  app.innerHTML = `
    ${topbarHtml('Техніка', roleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-menu-eq" style="margin:0 0 14px">← Назад до меню</div>
      <button type="button" class="btn-add-top" id="btn-go-add-equipment">+ Додати техніку</button>
      ${listSearchHtml('equipment', 'Пошук: назва, марка, номер, код')}
      <div id="equipment-list" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-menu-eq').addEventListener('click', () => renderAdminHome(user));
  document.getElementById('btn-go-add-equipment').addEventListener('click', () => renderAddEquipment(user));

  const listEl = document.getElementById('equipment-list');

  let equipmentList;
  try {
    equipmentList = await supaGet('equipment', `select=id,name,brand_model,reg_number,code,status,tracks_moto_hours,tracks_odometer,allows_two_operators,wialon_unit_id&order=status.asc,name.asc`);
  } catch (e) {
    listEl.textContent = 'Помилка завантаження: ' + e.message;
    return;
  }

  if (!equipmentList || equipmentList.length === 0) {
    listEl.textContent = 'Техніки ще немає.';
    return;
  }

  listEl.className = '';
  listEl.innerHTML = equipmentList.map(eq => `
    <div class="report-card" data-search="${searchAttr(eq.name, eq.brand_model, eq.reg_number, eq.code, eq.wialon_unit_id, eq.status)}">
      <div class="top-row">
        <span class="date">${escHtml(eq.name)}</span>
        <span class="status-chip ${eq.status === 'Активна' ? 'status-final' : 'status-corr'}">${escHtml(eq.status)}</span>
      </div>
      <div class="meta">${escHtml(eq.brand_model || '—')} · номер: ${escHtml(eq.reg_number || '—')}${eq.code ? ` · код: ${escHtml(eq.code)}` : ''}${eq.tracks_moto_hours === false ? ' · без мотогодин' : ''}${eq.tracks_odometer ? ' · спідометр' : ''}${eq.allows_two_operators ? ' · 👥 2 оператори' : ''}</div>
      <div class="meta">Wialon: ${eq.wialon_unit_id ? escHtml(eq.wialon_unit_id) : 'не прив\'язано'}</div>
      <div class="item-actions">
        <button type="button" class="btn-confirm" data-edit-eq="${eq.id}">Редагувати</button>
        <button type="button" class="btn-reject" data-toggle-eq="${eq.id}" data-current-status="${escHtml(eq.status)}">
          ${eq.status === 'Активна' ? 'Деактивувати' : 'Активувати'}
        </button>
      </div>
    </div>
  `).join('');
  wireListSearch('equipment', listEl);

  listEl.querySelectorAll('[data-edit-eq]').forEach(btn => {
    btn.addEventListener('click', () => renderEditEquipment(user, btn.dataset.editEq));
  });

  listEl.querySelectorAll('[data-toggle-eq]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const newStatus = btn.dataset.currentStatus === 'Активна' ? 'Неактивна' : 'Активна';
      const originalLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Оновлення...';
      try {
        await supaUpdate('equipment', `id=eq.${btn.dataset.toggleEq}`, { status: newStatus });
        renderEquipmentList(user);
      } catch (e) {
        alert('Помилка: ' + e.message);
        btn.disabled = false;
        btn.textContent = originalLabel;
      }
    });
  });
}

async function renderAddEquipment(user) {
  app.innerHTML = `
    ${topbarHtml('Додати техніку', roleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-eq-list" style="margin:0 0 14px">← Назад до списку</div>
      <form id="add-equipment-form">
        <div class="section">
          <div class="section-title"><span class="n">1</span><span class="icon">🚜</span>Нова техніка</div>

          <label>Назва</label>
          <input type="text" id="new_eq_name" required placeholder="Наприклад: Екскаватор JCB 3CX">

          <label>Марка/модель</label>
          <input type="text" id="new_eq_brand_model" placeholder="Необов'язково">

          <label>Держ./інвентарний номер</label>
          <input type="text" id="new_eq_reg_number" placeholder="Необов'язково">

          <label>Код / номер</label>
          <input type="text" id="new_eq_code" placeholder="Необов'язково">

          <label>ID у Wialon</label>
          <input type="text" id="new_eq_wialon_unit_id" inputmode="numeric" placeholder="Необов'язково, напр. 23952736">
          <div class="hint-inline">Номер цієї техніки в системі Wialon (GPS-трекер) — потрібен для автоматичної звірки звітів. Залиш порожнім, якщо трекера немає.</div>

          <div class="checkbox-row">
            <input type="checkbox" id="new_eq_tracks_moto_hours" checked>
            <label for="new_eq_tracks_moto_hours">Рахує мотогодини</label>
          </div>
          <div class="hint-inline">Зніми позначку для техніки без лічильника мотогодин (наприклад, водовозка) — тоді в звіті оператора поле мотогодин буде неактивне й необов'язкове.</div>

          <label>Зафіксовані початкові мотогодини</label>
          <input type="number" step="0.1" id="new_eq_confirmed_hours" value="0">
          <div class="hint-inline">Оператор при першому звіті побачить це значення як підтверджене — почне відлік саме від нього.</div>

          <div class="checkbox-row">
            <input type="checkbox" id="new_eq_tracks_odometer">
            <label for="new_eq_tracks_odometer">Рахує кілометраж (спідометр)</label>
          </div>
          <div class="hint-inline">Познач для техніки зі справним спідометром (водовозка зі спідометром, автогудронатор, МАН тощо) — тоді в звіті зʼявиться поле показників спідометра.</div>

          <label>Зафіксовані початкові кілометри</label>
          <input type="number" step="0.1" id="new_eq_confirmed_km" value="0" disabled>

          <label>Примітка</label>
          <textarea id="new_eq_note" placeholder="Необов'язково"></textarea>
        </div>

        <button type="submit" id="add-equipment-submit-btn">Додати техніку</button>
        <div class="error-text hidden" id="add-equipment-error-box"></div>
      </form>
    </div>
  `;
  document.getElementById('back-to-eq-list').addEventListener('click', () => renderEquipmentList(user));

  const form = document.getElementById('add-equipment-form');
  const submitBtn = document.getElementById('add-equipment-submit-btn');
  const errorBox = document.getElementById('add-equipment-error-box');
  const tracksCheckbox = document.getElementById('new_eq_tracks_moto_hours');
  const confirmedHoursInput = document.getElementById('new_eq_confirmed_hours');
  const tracksOdometerCheckbox = document.getElementById('new_eq_tracks_odometer');
  const confirmedKmInput = document.getElementById('new_eq_confirmed_km');

  // Якщо техніка не рахує мотогодини — поле початкового значення теж не потрібне
  tracksCheckbox.addEventListener('change', () => {
    confirmedHoursInput.disabled = !tracksCheckbox.checked;
    if (!tracksCheckbox.checked) confirmedHoursInput.value = '';
  });

  // Те саме для кілометражу
  tracksOdometerCheckbox.addEventListener('change', () => {
    confirmedKmInput.disabled = !tracksOdometerCheckbox.checked;
    confirmedKmInput.value = tracksOdometerCheckbox.checked ? '0' : '';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');

    const name = document.getElementById('new_eq_name').value.trim();
    const brandModel = document.getElementById('new_eq_brand_model').value.trim();
    const regNumber = document.getElementById('new_eq_reg_number').value.trim();
    const tracksMotoHours = tracksCheckbox.checked;
    const confirmedHours = tracksMotoHours ? (parseFloat(confirmedHoursInput.value) || 0) : null;
    const tracksOdometer = tracksOdometerCheckbox.checked;
    const confirmedKm = tracksOdometer ? (parseFloat(confirmedKmInput.value) || 0) : null;
    const note = document.getElementById('new_eq_note').value.trim();
    const wialon = parseWialonUnitId(document.getElementById('new_eq_wialon_unit_id').value);

    if (!name) {
      errorBox.textContent = "Вкажи назву техніки.";
      errorBox.classList.remove('hidden');
      return;
    }

    if (wialon.error) {
      errorBox.textContent = wialon.error;
      errorBox.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Створення...';

    try {
      const eqId = await supaRpc('next_id', { p_prefix: 'EQ' });
      await supaInsert('equipment', {
        id: eqId,
        name: name,
        brand_model: brandModel || null,
        reg_number: regNumber || null,
        code: codeValue(document.getElementById('new_eq_code').value),
        status: 'Активна',
        tracks_moto_hours: tracksMotoHours,
        confirmed_hours: confirmedHours,
        tracks_odometer: tracksOdometer,
        confirmed_km: confirmedKm,
        wialon_unit_id: wialon.value,
        note: note || null
      });

      app.innerHTML = `
        <div class="wrap">
        <div class="success-box">
          <div>✅ Техніку успішно додано</div>
          <div class="stamp">${eqId}</div>
        </div>
        <button type="button" id="back-eq-list-btn" style="background:var(--asphalt);color:var(--brand-yellow);width:100%;padding:14px;border:none;border-radius:4px;font-family:'Oswald',sans-serif;font-weight:600;font-size:14px;text-transform:uppercase;letter-spacing:0.03em;cursor:pointer">До списку техніки</button>
        </div>
      `;
      document.getElementById('back-eq-list-btn').addEventListener('click', () => renderEquipmentList(user));
    } catch (err) {
      errorBox.textContent = equipmentSaveErrorText(err);
      errorBox.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = "Додати техніку";
    }
  });
}

async function renderEditEquipment(user, equipmentId) {
  app.innerHTML = `
    ${topbarHtml('Редагування техніки', roleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-eq-list2" style="margin:0 0 14px">← Назад до списку</div>
      <div id="edit-eq-body" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-eq-list2').addEventListener('click', () => renderEquipmentList(user));

  const bodyEl = document.getElementById('edit-eq-body');

  let eq;
  try {
    const rows = await supaGet('equipment', `id=eq.${equipmentId}&select=id,name,brand_model,reg_number,code,note,status,tracks_moto_hours,tracks_odometer,allows_two_operators,wialon_unit_id,confirmed_hours,confirmed_km`);
    eq = rows && rows[0];
  } catch (e) {
    bodyEl.textContent = 'Помилка завантаження: ' + e.message;
    return;
  }

  if (!eq) {
    bodyEl.textContent = 'Техніку не знайдено.';
    return;
  }

  bodyEl.className = '';
  bodyEl.innerHTML = `
    <form id="edit-eq-form">
      <div class="section">
        <div class="section-title"><span class="n">1</span><span class="icon">🚜</span>Дані техніки</div>

        <label>Назва</label>
        <input type="text" id="edit_eq_name" required value="${escHtml(eq.name)}">

        <label>Марка/модель</label>
        <input type="text" id="edit_eq_brand_model" value="${escHtml(eq.brand_model || '')}">

        <label>Держ./інвентарний номер</label>
        <input type="text" id="edit_eq_reg_number" value="${escHtml(eq.reg_number || '')}">

        <label>Код / номер</label>
        <input type="text" id="edit_eq_code" value="${escHtml(eq.code || '')}" placeholder="Необов'язково">

        <label>ID у Wialon</label>
        <input type="text" id="edit_eq_wialon_unit_id" inputmode="numeric" value="${escHtml(eq.wialon_unit_id || '')}" placeholder="Необов'язково, напр. 23952736">
        <div class="hint-inline">Номер цієї техніки в системі Wialon (GPS-трекер) — потрібен для автоматичної звірки звітів. Залиш порожнім, якщо трекера немає.</div>

        <div class="checkbox-row">
          <input type="checkbox" id="edit_eq_tracks_moto_hours" ${eq.tracks_moto_hours !== false ? 'checked' : ''}>
          <label for="edit_eq_tracks_moto_hours">Рахує мотогодини</label>
        </div>
        <div class="hint-inline">Зніми позначку для техніки без лічильника мотогодин (наприклад, водовозка) — тоді в звіті оператора поле мотогодин буде неактивне й необов'язкове.</div>

        <div id="edit-eq-hours-block" class="${eq.tracks_moto_hours !== false ? '' : 'hidden'}">
          <label>Підтверджені мотогодини (поточні)</label>
          <input type="number" step="0.1" class="numeric" id="edit_eq_confirmed_hours" value="${eq.confirmed_hours ?? 0}">
          <div class="hint-inline">Від цього значення оператор почне наступний звіт. Зазвичай оновлюється автоматично при підтвердженні звіту — змінюй вручну лише для початкового значення або виправлення.</div>
        </div>

        <div class="checkbox-row">
          <input type="checkbox" id="edit_eq_tracks_odometer" ${eq.tracks_odometer ? 'checked' : ''}>
          <label for="edit_eq_tracks_odometer">Рахує кілометраж (спідометр)</label>
        </div>
        <div class="hint-inline">Познач для техніки зі справним спідометром — тоді в звіті зʼявиться поле показників спідометра.</div>

        <div id="edit-eq-km-block" class="${eq.tracks_odometer ? '' : 'hidden'}">
          <label>Підтверджені кілометри (поточні)</label>
          <input type="number" step="0.1" class="numeric" id="edit_eq_confirmed_km" value="${eq.confirmed_km ?? 0}">
          <div class="hint-inline">Від цього значення оператор почне наступний звіт (показник спідометра).</div>
        </div>

        <div class="checkbox-row">
          <input type="checkbox" id="edit_eq_allows_two_operators" ${eq.allows_two_operators ? 'checked' : ''}>
          <label for="edit_eq_allows_two_operators">👥 Може працювати з двома операторами</label>
        </div>
        <div class="hint-inline">Лише для асфальтоукладача й фрези. Тоді у звіті на цій техніці зʼявиться галочка «Я другий оператор»: другий оператор подає свій звіт з годинами, а мотогодини й спідометр веде лише основний.</div>

        <label>Примітка</label>
        <textarea id="edit_eq_note">${escHtml(eq.note || '')}</textarea>
      </div>

      <button type="submit" id="edit-eq-submit-btn">Зберегти зміни</button>
      <div class="error-text hidden" id="edit-eq-error-box"></div>
    </form>
  `;

  const form = document.getElementById('edit-eq-form');
  const submitBtn = document.getElementById('edit-eq-submit-btn');
  const errorBox = document.getElementById('edit-eq-error-box');

  // Поля підтверджених м/г і км показуються лише коли техніка їх рахує
  document.getElementById('edit_eq_tracks_moto_hours').addEventListener('change', (e) => {
    document.getElementById('edit-eq-hours-block').classList.toggle('hidden', !e.target.checked);
  });
  document.getElementById('edit_eq_tracks_odometer').addEventListener('change', (e) => {
    document.getElementById('edit-eq-km-block').classList.toggle('hidden', !e.target.checked);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');

    const name = document.getElementById('edit_eq_name').value.trim();
    const brandModel = document.getElementById('edit_eq_brand_model').value.trim();
    const regNumber = document.getElementById('edit_eq_reg_number').value.trim();
    const tracksMotoHours = document.getElementById('edit_eq_tracks_moto_hours').checked;
    const tracksOdometer = document.getElementById('edit_eq_tracks_odometer').checked;
    const note = document.getElementById('edit_eq_note').value.trim();
    const wialon = parseWialonUnitId(document.getElementById('edit_eq_wialon_unit_id').value);

    if (!name) {
      errorBox.textContent = "Вкажи назву техніки.";
      errorBox.classList.remove('hidden');
      return;
    }

    if (wialon.error) {
      errorBox.textContent = wialon.error;
      errorBox.classList.remove('hidden');
      return;
    }

    const update = {
      name: name,
      brand_model: brandModel || null,
      reg_number: regNumber || null,
      code: codeValue(document.getElementById('edit_eq_code').value),
      tracks_moto_hours: tracksMotoHours,
      tracks_odometer: tracksOdometer,
      // (з 2026-10-14) "основний + другий оператор" — укладач, фреза
      allows_two_operators: document.getElementById('edit_eq_allows_two_operators').checked,
      wialon_unit_id: wialon.value,
      note: note || null
    };

    // Підтверджені м/г і км — лише для техніки, що їх рахує
    if (tracksMotoHours) {
      const hours = parseFloat(document.getElementById('edit_eq_confirmed_hours').value);
      if (isNaN(hours) || hours < 0) {
        errorBox.textContent = 'Вкажи підтверджені мотогодини (число, не менше 0).';
        errorBox.classList.remove('hidden');
        return;
      }
      update.confirmed_hours = hours;
    }
    if (tracksOdometer) {
      const km = parseFloat(document.getElementById('edit_eq_confirmed_km').value);
      if (isNaN(km) || km < 0) {
        errorBox.textContent = 'Вкажи підтверджені кілометри (число, не менше 0).';
        errorBox.classList.remove('hidden');
        return;
      }
      update.confirmed_km = km;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Збереження...';

    try {
      await supaUpdate('equipment', `id=eq.${equipmentId}`, update);
      renderEquipmentList(user);
    } catch (err) {
      errorBox.textContent = equipmentSaveErrorText(err);
      errorBox.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = "Зберегти зміни";
    }
  });
}

// ======================================================
// C. ПРИВ'ЯЗКА ОПЕРАТОР-ТЕХНІКА (для вже існуючих операторів)
// ======================================================

async function renderUserEquipment(user, targetUserId) {
  app.innerHTML = `
    ${topbarHtml("Техніка оператора", roleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-edit-user" style="margin:0 0 14px">← Назад</div>
      <div id="user-equipment-body" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-edit-user').addEventListener('click', () => renderEditUser(user, targetUserId));

  const bodyEl = document.getElementById('user-equipment-body');

  let targetUser, equipmentList, bindings;
  try {
    const rows = await supaGet('users', `id=eq.${targetUserId}&select=id,full_name`);
    targetUser = rows && rows[0];
    equipmentList = await supaGet('equipment', `status=eq.Активна&select=id,name&order=name.asc`);
    bindings = await supaGet('user_equipment', `user_id=eq.${targetUserId}&select=id,equipment_id,status`);
  } catch (e) {
    bodyEl.textContent = 'Помилка завантаження: ' + e.message;
    return;
  }

  if (!targetUser) {
    bodyEl.textContent = 'Користувача не знайдено.';
    return;
  }

  // Для кожної одиниці техніки — останній відомий запис прив'язки (якщо є)
  const bindingByEquipment = {};
  (bindings || []).forEach(b => { bindingByEquipment[b.equipment_id] = b; });

  bodyEl.className = '';
  bodyEl.innerHTML = `
    <div class="section-title" style="margin:0 0 4px"><span class="icon">🚜</span>${escHtml(targetUser.full_name)}</div>
    <div class="hint-inline" style="margin-bottom:8px">Познач техніку, яка закріплена за цим оператором зараз.</div>
    <form id="user-equipment-form">
      ${equipmentList.map(eq => {
        const b = bindingByEquipment[eq.id];
        const checked = b && b.status === 'Активна';
        return `
          <div class="checkbox-row">
            <input type="checkbox" class="ue-check" value="${eq.id}" id="ue-${eq.id}" ${checked ? 'checked' : ''}>
            <label for="ue-${eq.id}">${escHtml(eq.name)}</label>
          </div>
        `;
      }).join('')}
      <button type="submit" id="user-equipment-submit-btn">Зберегти</button>
      <div class="error-text hidden" id="user-equipment-error-box"></div>
    </form>
  `;

  const form = document.getElementById('user-equipment-form');
  const submitBtn = document.getElementById('user-equipment-submit-btn');
  const errorBox = document.getElementById('user-equipment-error-box');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Збереження...';

    const checkedIds = new Set(Array.from(document.querySelectorAll('.ue-check:checked')).map(cb => cb.value));

    try {
      for (const eq of equipmentList) {
        const b = bindingByEquipment[eq.id];
        const shouldBeActive = checkedIds.has(eq.id);
        const isActive = b && b.status === 'Активна';

        if (shouldBeActive && !isActive) {
          if (b) {
            await supaUpdate('user_equipment', `id=eq.${b.id}`, { status: 'Активна' });
          } else {
            const ueId = await supaRpc('next_id', { p_prefix: 'UE' });
            await supaInsert('user_equipment', {
              id: ueId,
              user_id: targetUserId,
              equipment_id: eq.id,
              status: 'Активна'
            });
          }
        } else if (!shouldBeActive && isActive) {
          await supaUpdate('user_equipment', `id=eq.${b.id}`, { status: 'Неактивна' });
        }
      }
      renderEditUser(user, targetUserId);
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Зберегти';
    }
  });
}

// ======================================================
// E. ЗАМОВНИКИ: список, додавання, редагування, деактивація/активація
// ======================================================

async function renderCustomersList(user) {
  app.innerHTML = `
    ${topbarHtml('Замовники', roleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-menu-cst" style="margin:0 0 14px">← Назад до меню</div>
      <button type="button" class="btn-add-top" id="btn-go-add-customer">+ Додати замовника</button>
      ${listSearchHtml('customers', 'Пошук: назва або ЄДРПОУ')}
      <div id="customers-list" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-menu-cst').addEventListener('click', () => renderAdminHome(user));
  document.getElementById('btn-go-add-customer').addEventListener('click', () => renderAddCustomer(user));

  const listEl = document.getElementById('customers-list');

  let customersList;
  try {
    customersList = await supaGet('customers', `select=id,name,edrpou,note,status&order=status.asc,name.asc`);
  } catch (e) {
    listEl.textContent = 'Помилка завантаження: ' + e.message;
    return;
  }

  if (!customersList || customersList.length === 0) {
    listEl.textContent = 'Замовників ще немає.';
    return;
  }

  listEl.className = '';
  listEl.innerHTML = customersList.map(c => `
    <div class="report-card" data-search="${searchAttr(c.name, c.edrpou, c.note, c.status)}">
      <div class="top-row">
        <span class="date">${escHtml(c.name)}</span>
        <span class="status-chip ${c.status === 'Активний' ? 'status-final' : 'status-corr'}">${escHtml(c.status)}</span>
      </div>
      <div class="meta">ЄДРПОУ: ${c.edrpou ? escHtml(c.edrpou) : 'не вказано'}</div>
      ${c.note ? `<div class="meta">${escHtml(c.note)}</div>` : ''}
      <div class="item-actions">
        <button type="button" class="btn-confirm" data-edit-cst="${c.id}">Редагувати</button>
        <button type="button" class="btn-reject" data-toggle-cst="${c.id}" data-current-status="${escHtml(c.status)}">
          ${c.status === 'Активний' ? 'Деактивувати' : 'Активувати'}
        </button>
      </div>
    </div>
  `).join('');
  wireListSearch('customers', listEl);

  listEl.querySelectorAll('[data-edit-cst]').forEach(btn => {
    btn.addEventListener('click', () => renderEditCustomer(user, btn.dataset.editCst));
  });

  listEl.querySelectorAll('[data-toggle-cst]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const newStatus = btn.dataset.currentStatus === 'Активний' ? 'Неактивний' : 'Активний';
      const originalLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Оновлення...';
      try {
        await supaUpdate('customers', `id=eq.${btn.dataset.toggleCst}`, { status: newStatus });
        renderCustomersList(user);
      } catch (e) {
        alert('Помилка: ' + e.message);
        btn.disabled = false;
        btn.textContent = originalLabel;
      }
    });
  });
}

async function renderAddCustomer(user) {
  app.innerHTML = `
    ${topbarHtml('Додати замовника', roleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-cst-list" style="margin:0 0 14px">← Назад до списку</div>
      <form id="add-customer-form">
        <div class="section">
          <div class="section-title"><span class="n">1</span><span class="icon">🏢</span>Новий замовник</div>

          <label>Назва</label>
          <input type="text" id="new_cst_name" required placeholder="Наприклад: ТзОВ ХХІ століття плюс">

          <label>ЄДРПОУ</label>
          <input type="text" id="new_cst_edrpou" inputmode="numeric" maxlength="12" placeholder="Необов'язково: 8 цифр, для ФОП — 10">

          <label>Примітка</label>
          <textarea id="new_cst_note" placeholder="Необов'язково"></textarea>
        </div>

        <button type="submit" id="add-customer-submit-btn">Додати замовника</button>
        <div class="error-text hidden" id="add-customer-error-box"></div>
      </form>
    </div>
  `;
  document.getElementById('back-to-cst-list').addEventListener('click', () => renderCustomersList(user));

  const form = document.getElementById('add-customer-form');
  const submitBtn = document.getElementById('add-customer-submit-btn');
  const errorBox = document.getElementById('add-customer-error-box');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');

    const name = document.getElementById('new_cst_name').value.trim();
    const note = document.getElementById('new_cst_note').value.trim();
    const edrpou = parseEdrpou(document.getElementById('new_cst_edrpou').value);

    if (!name) {
      errorBox.textContent = "Вкажи назву замовника.";
      errorBox.classList.remove('hidden');
      return;
    }
    if (edrpou.error) {
      errorBox.textContent = edrpou.error;
      errorBox.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Створення...';

    try {
      const dupError = await edrpouDuplicateError(edrpou.value, null);
      if (dupError) throw new Error(dupError);
      const cstId = await supaRpc('next_id', { p_prefix: 'CST' });
      await supaInsert('customers', {
        id: cstId,
        name: name,
        edrpou: edrpou.value,
        status: 'Активний',
        note: note || null
      });

      app.innerHTML = `
        <div class="wrap">
        <div class="success-box">
          <div>✅ Замовника успішно додано</div>
          <div class="stamp">${cstId}</div>
        </div>
        <button type="button" id="back-cst-list-btn" style="background:var(--asphalt);color:var(--brand-yellow);width:100%;padding:14px;border:none;border-radius:4px;font-family:'Oswald',sans-serif;font-weight:600;font-size:14px;text-transform:uppercase;letter-spacing:0.03em;cursor:pointer">До списку замовників</button>
        </div>
      `;
      document.getElementById('back-cst-list-btn').addEventListener('click', () => renderCustomersList(user));
    } catch (err) {
      errorBox.textContent = customerSaveErrorText(err);
      errorBox.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = "Додати замовника";
    }
  });
}

async function renderEditCustomer(user, customerId) {
  app.innerHTML = `
    ${topbarHtml('Редагування замовника', roleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-cst-list2" style="margin:0 0 14px">← Назад до списку</div>
      <div id="edit-cst-body" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-cst-list2').addEventListener('click', () => renderCustomersList(user));

  const bodyEl = document.getElementById('edit-cst-body');

  let cst;
  try {
    const rows = await supaGet('customers', `id=eq.${customerId}&select=id,name,edrpou,note,status`);
    cst = rows && rows[0];
  } catch (e) {
    bodyEl.textContent = 'Помилка завантаження: ' + e.message;
    return;
  }

  if (!cst) {
    bodyEl.textContent = 'Замовника не знайдено.';
    return;
  }

  bodyEl.className = '';
  bodyEl.innerHTML = `
    <form id="edit-cst-form">
      <div class="section">
        <div class="section-title"><span class="n">1</span><span class="icon">🏢</span>Дані замовника</div>

        <label>Назва</label>
        <input type="text" id="edit_cst_name" required value="${escHtml(cst.name)}">

        <label>ЄДРПОУ</label>
        <input type="text" id="edit_cst_edrpou" inputmode="numeric" maxlength="12" value="${escHtml(cst.edrpou || '')}" placeholder="Необов'язково: 8 цифр, для ФОП — 10">

        <label>Примітка</label>
        <textarea id="edit_cst_note">${escHtml(cst.note || '')}</textarea>
      </div>

      <button type="submit" id="edit-cst-submit-btn">Зберегти зміни</button>
      <div class="error-text hidden" id="edit-cst-error-box"></div>
    </form>
  `;

  const form = document.getElementById('edit-cst-form');
  const submitBtn = document.getElementById('edit-cst-submit-btn');
  const errorBox = document.getElementById('edit-cst-error-box');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');

    const name = document.getElementById('edit_cst_name').value.trim();
    const note = document.getElementById('edit_cst_note').value.trim();
    const edrpou = parseEdrpou(document.getElementById('edit_cst_edrpou').value);

    if (!name) {
      errorBox.textContent = "Вкажи назву замовника.";
      errorBox.classList.remove('hidden');
      return;
    }
    if (edrpou.error) {
      errorBox.textContent = edrpou.error;
      errorBox.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Збереження...';

    try {
      const dupError = await edrpouDuplicateError(edrpou.value, customerId);
      if (dupError) throw new Error(dupError);
      await supaUpdate('customers', `id=eq.${customerId}`, {
        name: name,
        edrpou: edrpou.value,
        note: note || null
      });
      renderCustomersList(user);
    } catch (err) {
      errorBox.textContent = customerSaveErrorText(err);
      errorBox.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = "Зберегти зміни";
    }
  });
}

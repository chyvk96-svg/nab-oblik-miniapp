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
      <div id="users-list" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-menu-users').addEventListener('click', () => renderAdminHome(user));
  document.getElementById('btn-go-add-user').addEventListener('click', () => renderAddUser(user));

  const listEl = document.getElementById('users-list');

  let usersList;
  try {
    usersList = await supaGet('users', `select=id,full_name,role,phone,telegram_id,status&order=status.asc,full_name.asc`);
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
    <div class="report-card">
      <div class="top-row">
        <span class="date">${u.full_name}</span>
        <span class="status-chip ${u.status === 'Активний' ? 'status-final' : 'status-corr'}">${u.status}</span>
      </div>
      <div class="meta">${u.role} · тел: ${u.phone || '—'} · TG ID: ${u.telegram_id}</div>
      <div class="item-actions">
        <button type="button" class="btn-confirm" data-edit-user="${u.id}">Редагувати</button>
        <button type="button" class="btn-reject" data-toggle-user="${u.id}" data-current-status="${u.status}">
          ${u.status === 'Активний' ? 'Деактивувати' : 'Активувати'}
        </button>
      </div>
    </div>
  `).join('');

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
        await supaUpdate('users', `id=eq.${btn.dataset.toggleUser}`, { status: newStatus });
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
    const rows = await supaGet('users', `id=eq.${targetUserId}&select=id,full_name,role,phone,telegram_id,status,note`);
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

  bodyEl.className = '';
  bodyEl.innerHTML = `
    <form id="edit-user-form">
      <div class="section">
        <div class="section-title"><span class="n">1</span><span class="icon">👤</span>Дані користувача</div>

        <label>ПІБ</label>
        <input type="text" id="edit_user_name" required value="${targetUser.full_name}">

        <label>Telegram ID</label>
        <input type="number" id="edit_user_telegram_id" required value="${targetUser.telegram_id}">

        <label>Телефон</label>
        <input type="text" id="edit_user_phone" value="${targetUser.phone || ''}">

        <label>Роль</label>
        <select id="edit_user_role" required>
          ${rolesList.map(r => `<option value="${r.name}" ${r.name === targetUser.role ? 'selected' : ''}>${r.name}</option>`).join('')}
        </select>

        <label>Примітка</label>
        <textarea id="edit_user_note">${targetUser.note || ''}</textarea>
      </div>

      <button type="submit" id="edit-user-submit-btn">Зберегти зміни</button>
      <div class="error-text hidden" id="edit-user-error-box"></div>
    </form>
    ${targetUser.role === 'Оператор' ? `
      <button type="button" class="btn-add-top" id="btn-go-user-equipment" style="margin-top:18px">🚜 Керувати технікою цього оператора</button>
    ` : ''}
  `;

  if (targetUser.role === 'Оператор') {
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
        note: note || null
      });
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

async function renderEquipmentList(user) {
  app.innerHTML = `
    ${topbarHtml('Техніка', roleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-menu-eq" style="margin:0 0 14px">← Назад до меню</div>
      <button type="button" class="btn-add-top" id="btn-go-add-equipment">+ Додати техніку</button>
      <div id="equipment-list" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-menu-eq').addEventListener('click', () => renderAdminHome(user));
  document.getElementById('btn-go-add-equipment').addEventListener('click', () => renderAddEquipment(user));

  const listEl = document.getElementById('equipment-list');

  let equipmentList;
  try {
    equipmentList = await supaGet('equipment', `select=id,name,brand_model,reg_number,status,tracks_moto_hours&order=status.asc,name.asc`);
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
    <div class="report-card">
      <div class="top-row">
        <span class="date">${eq.name}</span>
        <span class="status-chip ${eq.status === 'Активна' ? 'status-final' : 'status-corr'}">${eq.status}</span>
      </div>
      <div class="meta">${eq.brand_model || '—'} · номер: ${eq.reg_number || '—'}${eq.tracks_moto_hours === false ? ' · без мотогодин' : ''}</div>
      <div class="item-actions">
        <button type="button" class="btn-confirm" data-edit-eq="${eq.id}">Редагувати</button>
        <button type="button" class="btn-reject" data-toggle-eq="${eq.id}" data-current-status="${eq.status}">
          ${eq.status === 'Активна' ? 'Деактивувати' : 'Активувати'}
        </button>
      </div>
    </div>
  `).join('');

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

          <div class="checkbox-row">
            <input type="checkbox" id="new_eq_tracks_moto_hours" checked>
            <label for="new_eq_tracks_moto_hours">Рахує мотогодини</label>
          </div>
          <div class="hint-inline">Зніми позначку для техніки без лічильника мотогодин (наприклад, водовозка) — тоді в звіті оператора поле мотогодин буде неактивне й необов'язкове.</div>

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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');

    const name = document.getElementById('new_eq_name').value.trim();
    const brandModel = document.getElementById('new_eq_brand_model').value.trim();
    const regNumber = document.getElementById('new_eq_reg_number').value.trim();
    const tracksMotoHours = document.getElementById('new_eq_tracks_moto_hours').checked;
    const note = document.getElementById('new_eq_note').value.trim();

    if (!name) {
      errorBox.textContent = "Вкажи назву техніки.";
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
        status: 'Активна',
        tracks_moto_hours: tracksMotoHours,
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
      errorBox.textContent = err.message;
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
    const rows = await supaGet('equipment', `id=eq.${equipmentId}&select=id,name,brand_model,reg_number,note,status,tracks_moto_hours`);
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
        <input type="text" id="edit_eq_name" required value="${eq.name}">

        <label>Марка/модель</label>
        <input type="text" id="edit_eq_brand_model" value="${eq.brand_model || ''}">

        <label>Держ./інвентарний номер</label>
        <input type="text" id="edit_eq_reg_number" value="${eq.reg_number || ''}">

        <div class="checkbox-row">
          <input type="checkbox" id="edit_eq_tracks_moto_hours" ${eq.tracks_moto_hours !== false ? 'checked' : ''}>
          <label for="edit_eq_tracks_moto_hours">Рахує мотогодини</label>
        </div>
        <div class="hint-inline">Зніми позначку для техніки без лічильника мотогодин (наприклад, водовозка) — тоді в звіті оператора поле мотогодин буде неактивне й необов'язкове.</div>

        <label>Примітка</label>
        <textarea id="edit_eq_note">${eq.note || ''}</textarea>
      </div>

      <button type="submit" id="edit-eq-submit-btn">Зберегти зміни</button>
      <div class="error-text hidden" id="edit-eq-error-box"></div>
    </form>
  `;

  const form = document.getElementById('edit-eq-form');
  const submitBtn = document.getElementById('edit-eq-submit-btn');
  const errorBox = document.getElementById('edit-eq-error-box');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');

    const name = document.getElementById('edit_eq_name').value.trim();
    const brandModel = document.getElementById('edit_eq_brand_model').value.trim();
    const regNumber = document.getElementById('edit_eq_reg_number').value.trim();
    const tracksMotoHours = document.getElementById('edit_eq_tracks_moto_hours').checked;
    const note = document.getElementById('edit_eq_note').value.trim();

    if (!name) {
      errorBox.textContent = "Вкажи назву техніки.";
      errorBox.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Збереження...';

    try {
      await supaUpdate('equipment', `id=eq.${equipmentId}`, {
        name: name,
        brand_model: brandModel || null,
        reg_number: regNumber || null,
        tracks_moto_hours: tracksMotoHours,
        note: note || null
      });
      renderEquipmentList(user);
    } catch (err) {
      errorBox.textContent = err.message;
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
    <div class="section-title" style="margin:0 0 4px"><span class="icon">🚜</span>${targetUser.full_name}</div>
    <div class="hint-inline" style="margin-bottom:8px">Познач техніку, яка закріплена за цим оператором зараз.</div>
    <form id="user-equipment-form">
      ${equipmentList.map(eq => {
        const b = bindingByEquipment[eq.id];
        const checked = b && b.status === 'Активна';
        return `
          <div class="checkbox-row">
            <input type="checkbox" class="ue-check" value="${eq.id}" id="ue-${eq.id}" ${checked ? 'checked' : ''}>
            <label for="ue-${eq.id}">${eq.name}</label>
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
      <div id="customers-list" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-menu-cst').addEventListener('click', () => renderAdminHome(user));
  document.getElementById('btn-go-add-customer').addEventListener('click', () => renderAddCustomer(user));

  const listEl = document.getElementById('customers-list');

  let customersList;
  try {
    customersList = await supaGet('customers', `select=id,name,note,status&order=status.asc,name.asc`);
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
    <div class="report-card">
      <div class="top-row">
        <span class="date">${c.name}</span>
        <span class="status-chip ${c.status === 'Активний' ? 'status-final' : 'status-corr'}">${c.status}</span>
      </div>
      ${c.note ? `<div class="meta">${c.note}</div>` : ''}
      <div class="item-actions">
        <button type="button" class="btn-confirm" data-edit-cst="${c.id}">Редагувати</button>
        <button type="button" class="btn-reject" data-toggle-cst="${c.id}" data-current-status="${c.status}">
          ${c.status === 'Активний' ? 'Деактивувати' : 'Активувати'}
        </button>
      </div>
    </div>
  `).join('');

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

    if (!name) {
      errorBox.textContent = "Вкажи назву замовника.";
      errorBox.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Створення...';

    try {
      const cstId = await supaRpc('next_id', { p_prefix: 'CST' });
      await supaInsert('customers', {
        id: cstId,
        name: name,
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
      errorBox.textContent = err.message;
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
    const rows = await supaGet('customers', `id=eq.${customerId}&select=id,name,note,status`);
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
        <input type="text" id="edit_cst_name" required value="${cst.name}">

        <label>Примітка</label>
        <textarea id="edit_cst_note">${cst.note || ''}</textarea>
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

    if (!name) {
      errorBox.textContent = "Вкажи назву замовника.";
      errorBox.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Збереження...';

    try {
      await supaUpdate('customers', `id=eq.${customerId}`, {
        name: name,
        note: note || null
      });
      renderCustomersList(user);
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = "Зберегти зміни";
    }
  });
}

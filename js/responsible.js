// ---------- Екрани ролей "Відповідальний" і "Адміністратор" ----------
// Адміністратор може бути призначений відповідальним за окремі (зазвичай
// приватні) об'єкти — тоді підтвердження, історія і додавання об'єктів
// працюють для нього через ці самі функції, що й для Відповідального.

function roleSubtitle(user) {
  return `${user.role}: ${user.full_name}`;
}

function goToRoleHome(user) {
  if (user.role === 'Адміністратор') {
    renderAdminHome(user);
  } else {
    renderResponsibleHome(user);
  }
}

// ---------- Головне меню відповідального ----------

function renderResponsibleHome(user) {
  app.innerHTML = `
    ${topbarHtml('Головне меню', roleSubtitle(user))}
    <div class="menu-list">
      <button class="menu-btn" id="btn-pending">
        <span class="emoji">✅</span>
        <span>
          Мої підтвердження
          <span class="sub">Звіти, що очікують дії</span>
        </span>
      </button>
      <button class="menu-btn" id="btn-history">
        <span class="emoji">📋</span>
        <span>
          Історія
          <span class="sub">Уже опрацьовані звіти</span>
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
    </div>
  `;
  document.getElementById('btn-pending').addEventListener('click', () => renderPendingApprovals(user));
  document.getElementById('btn-history').addEventListener('click', () => renderApprovalHistory(user));
  document.getElementById('btn-add-object').addEventListener('click', () => renderAddObject(user));
  document.getElementById('btn-manage-objects').addEventListener('click', () => renderManageObjects(user));
}

// ---------- Додати новий об'єкт ----------

async function renderAddObject(user) {
  app.innerHTML = `
    ${topbarHtml("Додати об'єкт", roleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-menu-add" style="margin:0 0 14px">← Назад до меню</div>
      <div id="add-object-body" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-menu-add').addEventListener('click', () => goToRoleHome(user));

  const bodyEl = document.getElementById('add-object-body');

  let respUsers, customersList;
  try {
    respUsers = await supaGet(
      'users',
      `role=in.(Відповідальний,Адміністратор)&status=eq.Активний&select=id,full_name,role&order=full_name.asc`
    );
    customersList = await supaGet(
      'customers',
      `status=eq.Активний&select=id,name&order=name.asc`
    );
  } catch (e) {
    bodyEl.textContent = 'Помилка завантаження: ' + e.message;
    return;
  }

  if (!respUsers || respUsers.length === 0) {
    bodyEl.textContent = 'Немає активних користувачів з роллю "Відповідальний" або "Адміністратор".';
    return;
  }

  bodyEl.className = '';
  bodyEl.innerHTML = `
    <form id="add-object-form">
      <div class="section">
        <div class="section-title"><span class="n">1</span><span class="icon">🏗️</span>Новий об'єкт</div>
        <label>Назва об'єкта</label>
        <input type="text" id="object_name" required placeholder="Наприклад: вул. Шевченка, 12">

        <label>Скорочена назва</label>
        <input type="text" id="object_short_name" placeholder="Необов'язково">

        <label>Дата початку</label>
        <input type="date" id="object_start_date">

        <label>Замовник</label>
        <select id="object_customer_id" required>
          ${customersList.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          <option value="__new__">+ Новий замовник...</option>
        </select>
        <input type="text" id="object_new_customer_name" class="hidden" placeholder="Назва нового замовника" style="margin-top:8px">

        <label>Відповідальний за об'єкт</label>
        <select id="object_responsible_id" required>
          ${respUsers.map(u => `<option value="${u.id}">${u.full_name} (${u.role})</option>`).join('')}
        </select>
      </div>

      <button type="submit" id="add-object-submit-btn">Створити об'єкт</button>
      <div class="error-text hidden" id="add-object-error-box"></div>
    </form>
  `;

  const form = document.getElementById('add-object-form');
  const submitBtn = document.getElementById('add-object-submit-btn');
  const errorBox = document.getElementById('add-object-error-box');
  const customerSelect = document.getElementById('object_customer_id');
  const newCustomerInput = document.getElementById('object_new_customer_name');

  customerSelect.addEventListener('change', () => {
    newCustomerInput.classList.toggle('hidden', customerSelect.value !== '__new__');
  });

  // За замовчуванням дата початку — сьогодні
  document.getElementById('object_start_date').value = new Date().toISOString().slice(0, 10);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');

    const name = document.getElementById('object_name').value.trim();
    const shortName = document.getElementById('object_short_name').value.trim();
    const startDate = document.getElementById('object_start_date').value;
    const responsibleId = document.getElementById('object_responsible_id').value;
    const customerChoice = customerSelect.value;
    const newCustomerName = newCustomerInput.value.trim();

    if (!name) {
      errorBox.textContent = "Вкажи назву об'єкта.";
      errorBox.classList.remove('hidden');
      return;
    }
    if (customerChoice === '__new__' && !newCustomerName) {
      errorBox.textContent = "Вкажи назву нового замовника.";
      errorBox.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Створення...';

    try {
      let customerId = customerChoice;
      if (customerChoice === '__new__') {
        customerId = await supaRpc('next_id', { p_prefix: 'CST' });
        await supaInsert('customers', {
          id: customerId,
          name: newCustomerName,
          status: 'Активний'
        });
      }

      const objectId = await supaRpc('next_id', { p_prefix: 'OBJ' });
      await supaInsert('objects', {
        id: objectId,
        name: name,
        short_name: shortName || null,
        start_date: startDate || null,
        customer_id: customerId,
        status: 'Активний'
      });

      const assignId = await supaRpc('next_id', { p_prefix: 'ASSIGN' });
      await supaInsert('object_responsible', {
        id: assignId,
        object_id: objectId,
        user_id: responsibleId,
        status: 'Активний'
      });

      app.innerHTML = `
        <div class="wrap">
        <div class="success-box">
          <div>✅ Об'єкт успішно створено</div>
          <div class="stamp">${objectId}</div>
        </div>
        <button type="button" id="back-home-btn" style="background:var(--asphalt);color:var(--brand-yellow);width:100%;padding:14px;border:none;border-radius:4px;font-family:'Oswald',sans-serif;font-weight:600;font-size:14px;text-transform:uppercase;letter-spacing:0.03em;cursor:pointer">На головну</button>
        </div>
      `;
      document.getElementById('back-home-btn').addEventListener('click', () => goToRoleHome(user));
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = "Створити об'єкт";
    }
  });
}

// ---------- Об'єкти: закриття / відкриття ----------

async function renderManageObjects(user) {
  app.innerHTML = `
    ${topbarHtml("Об'єкти", roleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-menu-objects" style="margin:0 0 14px">← Назад до меню</div>
      <div id="objects-list" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-menu-objects').addEventListener('click', () => goToRoleHome(user));

  const listEl = document.getElementById('objects-list');

  let objectsList;
  try {
    objectsList = await supaGet(
      'objects',
      `select=id,name,short_name,status,customers(name)&order=status.asc,name.asc`
    );
  } catch (e) {
    listEl.textContent = 'Помилка завантаження: ' + e.message;
    return;
  }

  if (!objectsList || objectsList.length === 0) {
    listEl.textContent = "Об'єктів ще немає.";
    return;
  }

  listEl.className = '';
  listEl.innerHTML = objectsList.map(o => `
    <div class="report-card" id="obj-${o.id}">
      <div class="top-row">
        <span class="date">${o.name}</span>
        <span class="status-chip ${o.status === 'Активний' ? 'status-final' : 'status-corr'}">${o.status}</span>
      </div>
      <div class="meta">Замовник: ${o.customers?.name || '—'}</div>
      <div class="item-actions">
        <button class="btn-confirm" data-edit-object="${o.id}">Редагувати</button>
        <button class="btn-reject" data-object-id="${o.id}" data-current-status="${o.status}">
          ${o.status === 'Активний' ? "Закрити" : "Відкрити"}
        </button>
      </div>
    </div>
  `).join('');

  listEl.querySelectorAll('[data-edit-object]').forEach(btn => {
    btn.addEventListener('click', () => renderEditObject(user, btn.dataset.editObject));
  });

  listEl.querySelectorAll('[data-object-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const newStatus = btn.dataset.currentStatus === 'Активний' ? 'Закритий' : 'Активний';
      const originalLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Оновлення...';
      try {
        const updateData = { status: newStatus };
        if (newStatus === 'Закритий') {
          updateData.end_date = new Date().toISOString().slice(0, 10);
        } else {
          updateData.end_date = null;
        }
        await supaUpdate('objects', `id=eq.${btn.dataset.objectId}`, updateData);
        renderManageObjects(user);
      } catch (e) {
        alert('Помилка: ' + e.message);
        btn.disabled = false;
        btn.textContent = originalLabel;
      }
    });
  });
}

// ---------- Редагування об'єкта: назва/замовник + список відповідальних ----------

async function renderEditObject(user, objectId) {
  app.innerHTML = `
    ${topbarHtml("Редагування об'єкта", roleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-objects-list" style="margin:0 0 14px">← Назад до списку</div>
      <div id="edit-object-body" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-objects-list').addEventListener('click', () => renderManageObjects(user));

  const bodyEl = document.getElementById('edit-object-body');

  let objectRow, customersList, respCandidates, currentResponsible;
  try {
    const rows = await supaGet('objects', `id=eq.${objectId}&select=id,name,short_name,customer_id,start_date,end_date`);
    objectRow = rows && rows[0];
    customersList = await supaGet('customers', `status=eq.Активний&select=id,name&order=name.asc`);
    respCandidates = await supaGet(
      'users',
      `role=in.(Відповідальний,Адміністратор)&status=eq.Активний&select=id,full_name,role&order=full_name.asc`
    );
    currentResponsible = await supaGet(
      'object_responsible',
      `object_id=eq.${objectId}&select=id,user_id,status,users(full_name,role)&order=status.asc`
    );
  } catch (e) {
    bodyEl.textContent = 'Помилка завантаження: ' + e.message;
    return;
  }

  if (!objectRow) {
    bodyEl.textContent = "Об'єкт не знайдено.";
    return;
  }

  const assignedActiveUserIds = new Set(
    (currentResponsible || []).filter(r => r.status === 'Активний').map(r => r.user_id)
  );
  const availableToAdd = respCandidates.filter(u => !assignedActiveUserIds.has(u.id));

  // Розділяємо на активних (показуються завжди) і неактивних (згорнутий блок
  // з можливістю повернути або видалити назавжди) — щоб зняті відповідальні
  // не засмічували основний список.
  const activeResponsible = (currentResponsible || []).filter(r => r.status === 'Активний');
  const inactiveResponsible = (currentResponsible || []).filter(r => r.status !== 'Активний');

  bodyEl.className = '';
  bodyEl.innerHTML = `
    <form id="edit-object-form">
      <div class="section">
        <div class="section-title"><span class="n">1</span><span class="icon">🏗️</span>Дані об'єкта</div>

        <label>Назва об'єкта</label>
        <input type="text" id="edit_object_name" required value="${objectRow.name}">

        <label>Скорочена назва</label>
        <input type="text" id="edit_object_short_name" value="${objectRow.short_name || ''}">

        <label>Замовник</label>
        <select id="edit_object_customer_id" required>
          ${customersList.map(c => `<option value="${c.id}" ${c.id === objectRow.customer_id ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>

        <label>Дата початку</label>
        <input type="date" id="edit_object_start_date" value="${objectRow.start_date || ''}">

        <label>Дата завершення</label>
        <input type="date" id="edit_object_end_date" value="${objectRow.end_date || ''}">
        <div class="hint-inline">Проставляється автоматично при закритті об'єкта, але можна виправити вручну.</div>
      </div>

      <button type="submit" id="edit-object-submit-btn">Зберегти зміни</button>
      <div class="error-text hidden" id="edit-object-error-box"></div>
    </form>

    <div class="section">
      <div class="section-title"><span class="n">2</span><span class="icon">👥</span>Відповідальні за об'єкт</div>
      <div id="responsible-list">
        ${activeResponsible.length === 0 ? '<div class="hint-inline">Ще нікого не призначено.</div>' : ''}
        ${activeResponsible.map(r => `
          <div class="checkbox-row" style="justify-content:space-between">
            <label style="margin:0">${r.users?.full_name || '—'} (${r.users?.role || '—'})</label>
            <button type="button" class="btn-reject" style="flex:none;padding:8px 12px" data-toggle-resp="${r.id}" data-current-status="${r.status}">
              Зняти
            </button>
          </div>
        `).join('')}
      </div>

      ${availableToAdd.length > 0 ? `
        <label style="margin-top:18px">Додати відповідального</label>
        <select id="add-responsible-select">
          ${availableToAdd.map(u => `<option value="${u.id}">${u.full_name} (${u.role})</option>`).join('')}
        </select>
        <button type="button" class="btn-add-top" id="btn-add-responsible" style="margin-top:10px">+ Додати</button>
      ` : ''}

      ${inactiveResponsible.length > 0 ? `
        <div class="hint-inline" id="toggle-inactive-resp" style="margin-top:18px;cursor:pointer">▸ Неактивні (${inactiveResponsible.length})</div>
        <div id="inactive-responsible-list" class="hidden">
          ${inactiveResponsible.map(r => `
            <div class="checkbox-row" style="justify-content:space-between">
              <label style="margin:0">${r.users?.full_name || '—'} (${r.users?.role || '—'})</label>
              <div style="display:flex;gap:8px;flex:none">
                <button type="button" class="btn-confirm" style="flex:none;padding:8px 12px" data-toggle-resp="${r.id}" data-current-status="${r.status}">Повернути</button>
                <button type="button" class="btn-reject" style="flex:none;padding:8px 12px" data-delete-resp="${r.id}">Видалити</button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;

  const form = document.getElementById('edit-object-form');
  const submitBtn = document.getElementById('edit-object-submit-btn');
  const errorBox = document.getElementById('edit-object-error-box');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');

    const name = document.getElementById('edit_object_name').value.trim();
    const shortName = document.getElementById('edit_object_short_name').value.trim();
    const customerId = document.getElementById('edit_object_customer_id').value;
    const startDate = document.getElementById('edit_object_start_date').value;
    const endDate = document.getElementById('edit_object_end_date').value;

    if (!name) {
      errorBox.textContent = "Вкажи назву об'єкта.";
      errorBox.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Збереження...';

    try {
      await supaUpdate('objects', `id=eq.${objectId}`, {
        name: name,
        short_name: shortName || null,
        customer_id: customerId,
        start_date: startDate || null,
        end_date: endDate || null
      });
      renderEditObject(user, objectId);
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = "Зберегти зміни";
    }
  });

  document.querySelectorAll('[data-toggle-resp]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const newStatus = btn.dataset.currentStatus === 'Активний' ? 'Неактивний' : 'Активний';
      const originalLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = '...';
      try {
        await supaUpdate('object_responsible', `id=eq.${btn.dataset.toggleResp}`, { status: newStatus });
        renderEditObject(user, objectId);
      } catch (e) {
        alert('Помилка: ' + e.message);
        btn.disabled = false;
        btn.textContent = originalLabel;
      }
    });
  });

  document.querySelectorAll('[data-delete-resp]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Видалити цей запис назавжди? Дію не можна скасувати.')) return;
      const originalLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = '...';
      try {
        await supaDelete('object_responsible', `id=eq.${btn.dataset.deleteResp}`);
        renderEditObject(user, objectId);
      } catch (e) {
        alert('Помилка: ' + e.message);
        btn.disabled = false;
        btn.textContent = originalLabel;
      }
    });
  });

  const toggleInactiveEl = document.getElementById('toggle-inactive-resp');
  if (toggleInactiveEl) {
    toggleInactiveEl.addEventListener('click', () => {
      const inactiveListEl = document.getElementById('inactive-responsible-list');
      const nowHidden = inactiveListEl.classList.toggle('hidden');
      toggleInactiveEl.textContent = `${nowHidden ? '▸' : '▾'} Неактивні (${inactiveResponsible.length})`;
    });
  }

  const addRespBtn = document.getElementById('btn-add-responsible');
  if (addRespBtn) {
    addRespBtn.addEventListener('click', async () => {
      const selectedUserId = document.getElementById('add-responsible-select').value;
      addRespBtn.disabled = true;
      addRespBtn.textContent = 'Додавання...';
      try {
        // Якщо раніше був записаний і знятий — повертаємо його, а не дублюємо
        const existingInactive = (currentResponsible || []).find(r => r.user_id === selectedUserId && r.status !== 'Активний');
        if (existingInactive) {
          await supaUpdate('object_responsible', `id=eq.${existingInactive.id}`, { status: 'Активний' });
        } else {
          const assignId = await supaRpc('next_id', { p_prefix: 'ASSIGN' });
          await supaInsert('object_responsible', {
            id: assignId,
            object_id: objectId,
            user_id: selectedUserId,
            status: 'Активний'
          });
        }
        renderEditObject(user, objectId);
      } catch (e) {
        alert('Помилка: ' + e.message);
        addRespBtn.disabled = false;
        addRespBtn.textContent = '+ Додати';
      }
    });
  }
}

// ---------- Деталі одного звіту (спільна розмітка для обох списків) ----------

function reportDetailsHtml(r) {
  const breakdownLine = r.has_breakdown
    ? `<div class="detail-row"><span class="label">Поломка:</span> ${r.breakdown_description || '—'}</div>`
    : '';
  const repairLine = (r.has_breakdown && r.repair_hours && r.repair_hours > 0)
    ? `<div class="detail-row"><span class="label">Час ремонту:</span> ${r.repair_hours} год</div>`
    : '';
  const startNoteLine = r.start_hours_note
    ? `<div class="detail-row"><span class="label">Причина розбіжності мотогодин:</span> ${r.start_hours_note}</div>`
    : '';
  const downtimeLine = (r.downtime_hours && r.downtime_hours > 0)
    ? `<div class="detail-row"><span class="label">Простій:</span> ${r.downtime_hours} год — ${r.downtime_reason || '—'}</div>`
    : '';
  const travelLine = (r.travel_hours && r.travel_hours > 0)
    ? `<div class="detail-row"><span class="label">Переїзд:</span> ${r.travel_hours} год${r.travel_route ? ' — ' + r.travel_route : ''}</div>`
    : '';
  const transportLine = r.transported_people
    ? `<div class="detail-row"><span class="label">Перевезення людей:</span> ${r.transport_hours || '—'} год${r.transport_route ? ' — ' + r.transport_route : ''}</div>`
    : '';
  const fuelingLine = (r.fueling_liters && r.fueling_liters > 0)
    ? `<div class="detail-row"><span class="label">Заправка:</span> ${r.fueling_liters} л${r.fueling_source ? ' — ' + r.fueling_source : ''}</div>`
    : '';
  const noteLine = r.operator_note
    ? `<div class="detail-row"><span class="label">Примітка:</span> ${r.operator_note}</div>`
    : '';
  const customerLine = r.customer_name
    ? `<div class="detail-row"><span class="label">Замовник:</span> ${r.customer_name}</div>`
    : '';
  // Час фінального підтвердження — показується лише для вже закритих звітів
  const closedLine = r.final_closed_at
    ? `<div class="meta" style="margin-top:2px">Підтверджено: ${formatDateTimeUA(r.final_closed_at)}</div>`
    : '';

  return `
    <div class="operator-name">${r.users?.full_name || '—'}</div>
    <div class="meta">${r.equipment?.name || '—'} · ${r.objects?.name || '—'}</div>
    ${customerLine}
    <div class="hours">${r.start_hours} → ${r.end_hours} год (разом ${r.total_moto_hours})</div>
    <div class="detail-row"><span class="label">Час роботи:</span> ${formatTimeUA(r.start_time)} – ${formatTimeUA(r.end_time)}, людиногодин: ${r.total_person_hours}</div>
    <div class="detail-row"><span class="label">Обід:</span> ${r.lunch_hours} год</div>
    ${travelLine}
    ${transportLine}
    ${downtimeLine}
    ${fuelingLine}
    ${breakdownLine}
    ${repairLine}
    ${startNoteLine}
    ${noteLine}
    <div class="meta" style="margin-top:4px">Подано: ${formatDateTimeUA(r.submitted_at)}</div>
    ${closedLine}
  `;
}

// ---------- Мої підтвердження: звіти, що очікують дії ----------

const REPORT_SELECT_FIELDS = 'id,work_date,status,equipment_id,customer_name,start_hours,end_hours,total_moto_hours,start_time,end_time,' +
  'lunch_hours,total_person_hours,travel_hours,travel_route,transported_people,transport_route,transport_hours,' +
  'downtime_hours,downtime_reason,fueling_liters,fueling_source,' +
  'has_breakdown,breakdown_description,repair_hours,start_hours_note,' +
  'operator_note,submitted_at,final_closed_at,equipment(name),objects(name),users!daily_reports_operator_id_fkey(full_name)';

async function renderPendingApprovals(user) {
  app.innerHTML = `
    ${topbarHtml('Мої підтвердження', roleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-menu" style="margin:0 0 14px">← Назад до меню</div>
      <div id="pending-list" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-menu').addEventListener('click', () => goToRoleHome(user));

  let reports;
  try {
    reports = await supaGet(
      'daily_reports',
      `responsible_id=eq.${user.id}&status=eq.Очікує відповідального&select=${REPORT_SELECT_FIELDS}&order=work_date.asc`
    );
  } catch (e) {
    document.getElementById('pending-list').textContent = 'Помилка завантаження: ' + e.message;
    return;
  }

  const listEl = document.getElementById('pending-list');

  if (!reports || reports.length === 0) {
    listEl.textContent = 'Немає звітів, що очікують твого підтвердження.';
    return;
  }

  listEl.className = '';
  listEl.innerHTML = reports.map(r => `
    <div class="report-card" id="card-${r.id}">
      <div class="top-row">
        <span class="date">${formatDateUA(r.work_date)}</span>
        <span class="status-chip ${statusChipClass(r.status)}">${r.status}</span>
      </div>
      ${reportDetailsHtml(r)}
      <div class="approval-actions">
        <button class="btn-confirm" data-report-id="${r.id}" data-equipment-id="${r.equipment_id}" data-end-hours="${r.end_hours}">Підтвердити</button>
        <button class="btn-reject" data-report-id="${r.id}">На коригування</button>
      </div>
      <div class="reject-box hidden" id="reject-box-${r.id}">
        <label style="margin-top:0">Причина повернення на коригування</label>
        <textarea id="reject-comment-${r.id}" placeholder="Що потрібно виправити"></textarea>
        <button class="reject-confirm-btn" data-report-id="${r.id}">Підтвердити відхилення</button>
      </div>
    </div>
  `).join('');

  listEl.querySelectorAll('.btn-confirm').forEach(btn => {
    btn.addEventListener('click', () => confirmReport(
      user,
      btn.dataset.reportId,
      btn.dataset.equipmentId,
      parseFloat(btn.dataset.endHours),
      btn
    ));
  });
  listEl.querySelectorAll('.btn-reject').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(`reject-box-${btn.dataset.reportId}`).classList.remove('hidden');
      btn.closest('.approval-actions').classList.add('hidden');
    });
  });
  listEl.querySelectorAll('.reject-confirm-btn').forEach(btn => {
    btn.addEventListener('click', () => rejectReport(user, btn.dataset.reportId, btn));
  });
}

async function confirmReport(user, reportId, equipmentId, endHours, btn) {
  btn.disabled = true;
  btn.textContent = 'Обробка...';
  try {
    const confirmationCode = await supaRpc('next_id', { p_prefix: 'RESP' });
    const approvalId = await supaRpc('next_id', { p_prefix: 'APR' });

    await supaInsert('approvals', {
      id: approvalId,
      report_id: reportId,
      user_id: user.id,
      role: user.role,
      result: 'Підтверджено',
      telegram_id: tg.initDataUnsafe?.user?.id || null,
      confirmation_code: confirmationCode,
      status: 'Записано'
    });

    // Підтвердження відповідальним (або адміністратором для приватних об'єктів)
    // тепер є фінальним кроком: одразу закриваємо звіт і оновлюємо
    // офіційні мотогодини техніки.
    await supaUpdate('daily_reports', `id=eq.${reportId}`, {
      status: 'Фінально підтверджено',
      final_closed_at: new Date().toISOString()
    });

    await supaUpdate('equipment', `id=eq.${equipmentId}`, {
      confirmed_hours: endHours
    });

    document.getElementById(`card-${reportId}`).remove();
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Підтвердити';
    alert('Помилка: ' + e.message);
  }
}

async function rejectReport(user, reportId, btn) {
  const comment = document.getElementById(`reject-comment-${reportId}`).value.trim();
  if (!comment) {
    alert('Вкажи причину повернення на коригування.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Обробка...';
  try {
    const approvalId = await supaRpc('next_id', { p_prefix: 'APR' });

    await supaInsert('approvals', {
      id: approvalId,
      report_id: reportId,
      user_id: user.id,
      role: user.role,
      result: 'Відхилено',
      telegram_id: tg.initDataUnsafe?.user?.id || null,
      comment: comment,
      status: 'Записано'
    });

    await supaUpdate('daily_reports', `id=eq.${reportId}`, {
      status: 'Повернено на коригування'
    });

    document.getElementById(`card-${reportId}`).remove();
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Підтвердити відхилення';
    alert('Помилка: ' + e.message);
  }
}

// ---------- Історія: уже опрацьовані звіти ----------

async function renderApprovalHistory(user) {
  app.innerHTML = `
    ${topbarHtml('Історія', roleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-menu-hist" style="margin:0 0 14px">← Назад до меню</div>
      <div id="history-list" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-menu-hist').addEventListener('click', () => goToRoleHome(user));

  let reports;
  try {
    reports = await supaGet(
      'daily_reports',
      `responsible_id=eq.${user.id}&status=neq.Очікує відповідального&select=${REPORT_SELECT_FIELDS}&order=work_date.desc`
    );
  } catch (e) {
    document.getElementById('history-list').textContent = 'Помилка завантаження: ' + e.message;
    return;
  }

  const listEl = document.getElementById('history-list');

  if (!reports || reports.length === 0) {
    listEl.textContent = 'Опрацьованих звітів ще немає.';
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

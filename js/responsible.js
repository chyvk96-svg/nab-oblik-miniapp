// ---------- Екрани ролі "Відповідальний" ----------

function responsibleSubtitle(user) {
  return `Відповідальний: ${user.full_name}`;
}

// ---------- Головне меню відповідального ----------

function renderResponsibleHome(user) {
  app.innerHTML = `
    ${topbarHtml('Головне меню', responsibleSubtitle(user))}
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
    </div>
  `;
  document.getElementById('btn-pending').addEventListener('click', () => renderPendingApprovals(user));
  document.getElementById('btn-history').addEventListener('click', () => renderApprovalHistory(user));
  document.getElementById('btn-add-object').addEventListener('click', () => renderAddObject(user));
}

// ---------- Додати новий об'єкт ----------

async function renderAddObject(user) {
  app.innerHTML = `
    ${topbarHtml("Додати об'єкт", responsibleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-menu-add" style="padding:0 0 14px">← Назад до меню</div>
      <div id="add-object-body" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-menu-add').addEventListener('click', () => renderResponsibleHome(user));

  const bodyEl = document.getElementById('add-object-body');

  let respUsers;
  try {
    respUsers = await supaGet(
      'users',
      `role=eq.Відповідальний&status=eq.Активний&select=id,full_name&order=full_name.asc`
    );
  } catch (e) {
    bodyEl.textContent = 'Помилка завантаження: ' + e.message;
    return;
  }

  if (!respUsers || respUsers.length === 0) {
    bodyEl.textContent = 'Немає активних користувачів з роллю "Відповідальний".';
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

        <label>Відповідальний за об'єкт</label>
        <select id="object_responsible_id" required>
          ${respUsers.map(u => `<option value="${u.id}">${u.full_name}</option>`).join('')}
        </select>
      </div>

      <button type="submit" id="add-object-submit-btn">Створити об'єкт</button>
      <div class="error-text hidden" id="add-object-error-box"></div>
    </form>
  `;

  const form = document.getElementById('add-object-form');
  const submitBtn = document.getElementById('add-object-submit-btn');
  const errorBox = document.getElementById('add-object-error-box');

  // За замовчуванням дата початку — сьогодні
  document.getElementById('object_start_date').value = new Date().toISOString().slice(0, 10);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');

    const name = document.getElementById('object_name').value.trim();
    const shortName = document.getElementById('object_short_name').value.trim();
    const startDate = document.getElementById('object_start_date').value;
    const responsibleId = document.getElementById('object_responsible_id').value;

    if (!name) {
      errorBox.textContent = "Вкажи назву об'єкта.";
      errorBox.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Створення...';

    try {
      const objectId = await supaRpc('next_id', { p_prefix: 'OBJ' });
      await supaInsert('objects', {
        id: objectId,
        name: name,
        short_name: shortName || null,
        start_date: startDate || null,
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
      document.getElementById('back-home-btn').addEventListener('click', () => renderResponsibleHome(user));
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = "Створити об'єкт";
    }
  });
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

  return `
    <div class="operator-name">${r.users?.full_name || '—'}</div>
    <div class="meta">${r.equipment?.name || '—'} · ${r.objects?.name || '—'}</div>
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
  `;
}

// ---------- Мої підтвердження: звіти, що очікують дії ----------

const REPORT_SELECT_FIELDS = 'id,work_date,status,equipment_id,start_hours,end_hours,total_moto_hours,start_time,end_time,' +
  'lunch_hours,total_person_hours,travel_hours,travel_route,transported_people,transport_route,transport_hours,' +
  'downtime_hours,downtime_reason,fueling_liters,fueling_source,' +
  'has_breakdown,breakdown_description,repair_hours,start_hours_note,' +
  'operator_note,submitted_at,equipment(name),objects(name),users!daily_reports_operator_id_fkey(full_name)';

async function renderPendingApprovals(user) {
  app.innerHTML = `
    ${topbarHtml('Мої підтвердження', responsibleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-menu" style="padding:0 0 14px">← Назад до меню</div>
      <div id="pending-list" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-menu').addEventListener('click', () => renderResponsibleHome(user));

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
      role: 'Відповідальний',
      result: 'Підтверджено',
      telegram_id: tg.initDataUnsafe?.user?.id || null,
      confirmation_code: confirmationCode,
      status: 'Записано'
    });

    // Підтвердження відповідальним тепер є фінальним кроком:
    // одразу закриваємо звіт і оновлюємо офіційні мотогодини техніки.
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
      role: 'Відповідальний',
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
    ${topbarHtml('Історія', responsibleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-menu-hist" style="padding:0 0 14px">← Назад до меню</div>
      <div id="history-list" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-menu-hist').addEventListener('click', () => renderResponsibleHome(user));

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

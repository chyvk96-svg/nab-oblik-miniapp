// ---------- Екрани ролі "Оператор" ----------
// Використовує спільні reportDetailsHtml(), REPORT_SELECT_FIELDS з responsible.js
// (той самий файл вже завантажений у сторінку) для показу розгорнутих деталей звіту.

const HOURS_EPSILON = 0.05; // допустима похибка при порівнянні мотогодин

// ---------- Головне меню оператора ----------

function renderOperatorHome(user) {
  app.innerHTML = `
    ${topbarHtml('Головне меню', `Оператор: ${user.full_name}`)}
    <div class="menu-list">
      <button class="menu-btn" id="btn-new-report">
        <span class="emoji">🚜</span>
        <span>
          Внести дані
          <span class="sub">Подати звіт за сьогодні</span>
        </span>
      </button>
      <button class="menu-btn" id="btn-my-reports">
        <span class="emoji">📋</span>
        <span>
          Мої записи
          <span class="sub">Історія поданих звітів</span>
        </span>
      </button>
    </div>
  `;
  document.getElementById('btn-new-report').addEventListener('click', () => renderOperatorForm(user));
  document.getElementById('btn-my-reports').addEventListener('click', () => renderMyReports(user));
}

// ---------- Мої записи: історія звітів оператора (розгорнуті картки) ----------

async function renderMyReports(user) {
  app.innerHTML = `
    ${topbarHtml('Мої записи', `Оператор: ${user.full_name}`)}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-menu" style="margin:0 0 14px">← Назад до меню</div>
      <div id="reports-list" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-menu').addEventListener('click', () => renderOperatorHome(user));

  let reports;
  try {
    reports = await supaGet(
      'daily_reports',
      `operator_id=eq.${user.id}&select=${REPORT_SELECT_FIELDS}&order=work_date.desc`
    );
  } catch (e) {
    document.getElementById('reports-list').textContent = 'Помилка завантаження: ' + e.message;
    return;
  }

  const listEl = document.getElementById('reports-list');

  if (!reports || reports.length === 0) {
    listEl.textContent = 'Звітів ще немає.';
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
      ${r.status === 'Повернено на коригування'
        ? `<button class="btn-confirm" style="margin-top:10px" data-edit-id="${r.id}">Редагувати</button>`
        : ''}
    </div>
  `).join('');

  listEl.querySelectorAll('[data-edit-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Завантаження...';
      try {
        const rows = await supaGet('daily_reports', `id=eq.${btn.dataset.editId}&select=*`);
        if (rows && rows.length > 0) {
          renderOperatorForm(user, rows[0]);
        } else {
          alert('Не вдалося знайти звіт.');
          btn.disabled = false;
          btn.textContent = 'Редагувати';
        }
      } catch (e) {
        alert('Помилка завантаження: ' + e.message);
        btn.disabled = false;
        btn.textContent = 'Редагувати';
      }
    });
  });
}

// ---------- Екран оператора: форма щоденного звіту ----------
// existingReport: якщо передано — форма працює в режимі редагування вже
// поданого (і відхиленого) звіту, замість створення нового (визначає isEdit).
// draftOverride: якщо передано — форма підставляє значення з нього (чернетка,
// з якою оператор повернувся з екрана попереднього перегляду через "Редагувати"),
// не впливає на isEdit/режим збереження.

async function renderOperatorForm(user, existingReport = null, draftOverride = null) {
  const isEdit = existingReport !== null;
  const prefill = draftOverride || existingReport;

  let myEquipment, objects;

  try {
    myEquipment = await supaGet(
      'user_equipment',
      `user_id=eq.${user.id}&status=eq.Активна&select=equipment_id,equipment(id,name,confirmed_hours)`
    );
    objects = await supaGet('objects', `status=eq.Активний&select=id,name,customer_id,customers(name)`);
  } catch (e) {
    renderMessage('Помилка завантаження довідників: ' + e.message);
    return;
  }

  if (!myEquipment || myEquipment.length === 0) {
    renderMessage('За тобою не закріплено жодної техніки. Зверніться до адміністратора.');
    return;
  }

  const confirmedHoursMap = {};
  myEquipment.forEach(ue => { confirmedHoursMap[ue.equipment.id] = ue.equipment.confirmed_hours; });

  const today = new Date().toISOString().split('T')[0];

  const equipmentOptions = myEquipment
    .map(ue => `<option value="${ue.equipment.id}"${prefill && prefill.equipment_id === ue.equipment.id ? ' selected' : ''}>${ue.equipment.name}</option>`)
    .join('');
  const objectOptions = objects
    .map(o => `<option value="${o.id}"${prefill && prefill.object_id === o.id ? ' selected' : ''}>${o.name}</option>`)
    .join('');

  app.innerHTML = `
    ${topbarHtml(isEdit ? 'Редагування звіту' : 'Внести дані', `Оператор: ${user.full_name}`)}
    <div class="wrap">
    <div class="back-link" id="back-to-menu-form" style="margin:14px 0 0">← Назад до меню</div>
    <form id="report-form">

      <div class="section">
        <div class="section-title"><span class="n">1</span><span class="icon">🚜</span>Техніка та об'єкт</div>

        <label>Дата роботи</label>
        <input type="date" id="work_date" value="${prefill ? prefill.work_date : today}" required>

        <label>Техніка</label>
        <select id="equipment_id" required>${equipmentOptions}</select>

        <label>Об'єкт</label>
        <select id="object_id" required>${objectOptions}</select>

        <label>Замовник</label>
        <input type="text" id="customer_name" placeholder="Визначається автоматично, можна поправити">

        <label>Відповідальний за об'єкт</label>
        <select id="responsible_id" required></select>
      </div>

      <div class="section">
        <div class="section-title"><span class="n">2</span><span class="icon">⏱️</span>Мотогодини</div>

        <div class="row2">
          <div>
            <label>Початок</label>
            <input type="number" step="0.1" class="numeric" id="start_hours" required>
            <div class="hint-inline" id="start-hours-hint"></div>
          </div>
          <div>
            <label>Кінець</label>
            <input type="number" step="0.1" class="numeric" id="end_hours" value="${prefill ? prefill.end_hours : ''}" required>
            <div class="hint-inline" id="end-hours-hint"></div>
          </div>
        </div>

        <div class="discrepancy-box hidden" id="discrepancy-box">
          <div class="flag">⚠ ЗНАЧЕННЯ ВІДРІЗНЯЄТЬСЯ ВІД ОЧІКУВАНОГО</div>
          <label style="margin-top:0">Причина розбіжності</label>
          <textarea id="start_hours_note" placeholder="Наприклад: лічильник скинуто, попередній запис невірний тощо">${prefill && prefill.start_hours_note ? prefill.start_hours_note : ''}</textarea>
        </div>
      </div>

      <div class="section">
        <div class="section-title"><span class="n">3</span><span class="icon">🕐</span>Час роботи</div>

        <div class="row2">
          <div>
            <label>Початок</label>
            <input type="time" id="start_time" value="${prefill ? formatTimeUA(prefill.start_time) : ''}" required>
          </div>
          <div>
            <label>Кінець</label>
            <input type="time" id="end_time" value="${prefill ? formatTimeUA(prefill.end_time) : ''}" required>
          </div>
        </div>
        <label>Обід, год</label>
        <input type="number" step="0.1" id="lunch_hours" value="${prefill ? prefill.lunch_hours : '0'}">
      </div>

      <div class="section">
        <div class="section-title"><span class="n">4</span><span class="icon">🚗</span>Перебазування техніки</div>
        <label>Години</label>
        <input type="number" step="0.1" id="travel_hours" value="${prefill ? (prefill.travel_hours || 0) : '0'}">
        <label>Опис маршруту</label>
        <input type="text" id="travel_route" placeholder="Звідки → куди" value="${prefill && prefill.travel_route ? prefill.travel_route : ''}">
      </div>

      <div class="section">
        <div class="section-title"><span class="n">5</span><span class="icon">🚌</span>Перевезення людей</div>

        <div class="checkbox-row" style="margin-top:0; border-top:none; padding-top:0">
          <input type="checkbox" id="transported_people"${prefill && prefill.transported_people ? ' checked' : ''}>
          <label for="transported_people">Перевозив людей (автобус)</label>
        </div>

        <div id="transport-block" class="${prefill && prefill.transported_people ? '' : 'hidden'}">
          <label>Маршрут</label>
          <input type="text" id="transport_route" placeholder="Звідки → куди" value="${prefill && prefill.transport_route ? prefill.transport_route : ''}">
          <label>Години</label>
          <input type="number" step="0.1" id="transport_hours" value="${prefill && prefill.transport_hours ? prefill.transport_hours : '0'}">
        </div>
      </div>

      <div class="section">
        <div class="section-title"><span class="n">6</span><span class="icon">⏸</span>Простій</div>
        <label>Години</label>
        <input type="number" step="0.1" id="downtime_hours" value="${prefill ? (prefill.downtime_hours || 0) : '0'}">
        <label>Причина</label>
        <input type="text" id="downtime_reason" value="${prefill && prefill.downtime_reason ? prefill.downtime_reason : ''}">
      </div>

      <div class="section">
        <div class="section-title"><span class="n">7</span><span class="icon">⛽</span>Заправка та поломки</div>
        <label>Заправка, л</label>
        <input type="number" step="0.1" id="fueling_liters" value="${prefill ? (prefill.fueling_liters || 0) : '0'}">
        <label>Звідки заправились</label>
        <input type="text" id="fueling_source" placeholder="Наша заправна станція / з іншої техніки / каністри тощо" value="${prefill && prefill.fueling_source ? prefill.fueling_source : ''}">

        <div class="checkbox-row">
          <input type="checkbox" id="has_breakdown"${prefill && prefill.has_breakdown ? ' checked' : ''}>
          <label for="has_breakdown">Була поломка</label>
        </div>

        <div id="repair-block" class="${prefill && prefill.has_breakdown ? '' : 'hidden'}">
          <label>Опис поломки</label>
          <textarea id="breakdown_description" placeholder="Що сталось, який вузол/компонент">${prefill && prefill.breakdown_description ? prefill.breakdown_description : ''}</textarea>
          <label>Ремонт, год</label>
          <input type="number" step="0.1" id="repair_hours" value="${prefill ? (prefill.repair_hours || 0) : '0'}">
        </div>
      </div>

      <div class="section">
        <div class="section-title"><span class="n">8</span><span class="icon">📝</span>Примітка</div>
        <textarea id="operator_note" placeholder="Довільний коментар до звіту">${prefill && prefill.operator_note ? prefill.operator_note : ''}</textarea>
      </div>

      <button type="submit" id="submit-btn">Перевірити звіт</button>
      <div class="error-text hidden" id="error-box"></div>

    </form>
    </div>
  `;

  document.getElementById('back-to-menu-form').addEventListener('click', () => renderOperatorHome(user));

  document.getElementById('has_breakdown').addEventListener('change', (e) => {
    document.getElementById('repair-block').classList.toggle('hidden', !e.target.checked);
  });

  document.getElementById('transported_people').addEventListener('change', (e) => {
    document.getElementById('transport-block').classList.toggle('hidden', !e.target.checked);
  });

  // Підказка і автопідстановка початкових мотогодин при виборі техніки
  function applySuggestedStartHours() {
    const equipmentId = document.getElementById('equipment_id').value;
    const confirmed = confirmedHoursMap[equipmentId];
    const startInput = document.getElementById('start_hours');
    const hint = document.getElementById('start-hours-hint');

    startInput.dataset.suggested = confirmed;
    startInput.value = confirmed;
    hint.innerHTML = `Підтверджене значення техніки: <b>${confirmed}</b>`;
    checkDiscrepancy();
  }

  function checkDiscrepancy() {
    const startInput = document.getElementById('start_hours');
    const suggested = parseFloat(startInput.dataset.suggested);
    const current = parseFloat(startInput.value);
    const box = document.getElementById('discrepancy-box');
    const isDifferent = !isNaN(current) && !isNaN(suggested) && Math.abs(current - suggested) > HOURS_EPSILON;
    box.classList.toggle('hidden', !isDifferent);
  }

  document.getElementById('equipment_id').addEventListener('change', applySuggestedStartHours);
  document.getElementById('start_hours').addEventListener('input', () => { checkDiscrepancy(); checkEndHours(); });

  applySuggestedStartHours();

  // Якщо є чернетка (редагування або повернення з перегляду) — підставляємо
  // реальне значення, яке оператор вводив раніше (могло відрізнятись від
  // підтвердженого техніки).
  if (prefill) {
    document.getElementById('start_hours').value = prefill.start_hours;
    checkDiscrepancy();
  }

  function checkEndHours() {
    const start = parseFloat(document.getElementById('start_hours').value);
    const end = parseFloat(document.getElementById('end_hours').value);
    const hint = document.getElementById('end-hours-hint');
    if (!isNaN(start) && !isNaN(end) && end < start) {
      hint.innerHTML = `<span style="color: var(--danger)">⚠ Менше за початкові (${start})</span>`;
    } else {
      hint.textContent = '';
    }
  }
  document.getElementById('end_hours').addEventListener('input', checkEndHours);
  checkEndHours();

  // Автовизначення замовника і списку відповідальних при виборі об'єкта
  function applySuggestedCustomer() {
    const objectId = document.getElementById('object_id').value;
    const selectedObject = objects.find(o => o.id === objectId);
    document.getElementById('customer_name').value = selectedObject?.customers?.name || '';
  }

  async function updateResponsibleOptions() {
    const objectId = document.getElementById('object_id').value;
    const respSelect = document.getElementById('responsible_id');
    respSelect.innerHTML = '<option value="">Завантаження...</option>';
    try {
      const links = await supaGet(
        'object_responsible',
        `object_id=eq.${objectId}&status=eq.Активний&select=user_id,users(full_name,role)`
      );
      if (links && links.length > 0) {
        respSelect.innerHTML = links
          .map(l => `<option value="${l.user_id}">${l.users.full_name} (${l.users.role})</option>`)
          .join('');
        if (prefill && prefill.responsible_id && links.some(l => l.user_id === prefill.responsible_id)) {
          respSelect.value = prefill.responsible_id;
        }
      } else {
        respSelect.innerHTML = '<option value="">Не призначено</option>';
      }
    } catch (e) {
      respSelect.innerHTML = '<option value="">Помилка визначення</option>';
    }
  }

  document.getElementById('object_id').addEventListener('change', () => {
    applySuggestedCustomer();
    updateResponsibleOptions();
  });

  // Початкове заповнення при відкритті форми: якщо є чернетка — зберігаємо
  // раніше введений замовник (якщо оператор його правив вручну), інакше — з об'єкта.
  if (prefill && prefill.customer_name) {
    document.getElementById('customer_name').value = prefill.customer_name;
  } else {
    applySuggestedCustomer();
  }
  await updateResponsibleOptions();

  // Відправка форми — валідація і перехід на екран перевірки звіту
  // (запис у базу відбувається пізніше, з екрана перегляду).
  document.getElementById('report-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-btn');
    const errorBox = document.getElementById('error-box');
    errorBox.classList.add('hidden');

    try {
      const responsibleId = document.getElementById('responsible_id').value;
      if (!responsibleId) {
        throw new Error('Оберіть відповідального за цей об\'єкт.');
      }

      const discrepancyVisible = !document.getElementById('discrepancy-box').classList.contains('hidden');
      const startHoursNote = document.getElementById('start_hours_note').value.trim();
      if (discrepancyVisible && !startHoursNote) {
        throw new Error('Вкажи причину розбіжності мотогодин перед відправкою.');
      }

      const startHoursVal = parseFloat(document.getElementById('start_hours').value);
      const endHoursVal = parseFloat(document.getElementById('end_hours').value);
      if (endHoursVal < startHoursVal) {
        throw new Error('Кінцеві мотогодини не можуть бути меншими за початкові.');
      }

      const hasBreakdown = document.getElementById('has_breakdown').checked;
      const breakdownDescription = document.getElementById('breakdown_description').value.trim();
      if (hasBreakdown && !breakdownDescription) {
        throw new Error('Опиши, що сталось при поломці.');
      }

      const transportedPeople = document.getElementById('transported_people').checked;
      const transportRoute = document.getElementById('transport_route').value.trim();
      const transportHours = parseFloat(document.getElementById('transport_hours').value) || 0;
      if (transportedPeople && (!transportRoute || transportHours <= 0)) {
        throw new Error('Вкажи маршрут і години перевезення людей.');
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Перевірка...';

      const startTime = document.getElementById('start_time').value;
      const endTime = document.getElementById('end_time').value;
      const lunchHours = parseFloat(document.getElementById('lunch_hours').value) || 0;
      const repairHours = hasBreakdown ? (parseFloat(document.getElementById('repair_hours')?.value) || 0) : 0;
      // Ремонт понад 30 хв повністю віднімається від загальних (людино)годин
      const repairDeduction = repairHours > 0.5 ? repairHours : 0;

      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      let diffHours = (eh + em / 60) - (sh + sm / 60);
      if (diffHours < 0) diffHours += 24;
      const totalPersonHours = Math.round((diffHours - lunchHours - repairDeduction) * 100) / 100;

      const payload = {
        work_date: document.getElementById('work_date').value,
        operator_id: user.id,
        equipment_id: document.getElementById('equipment_id').value,
        object_id: document.getElementById('object_id').value,
        customer_name: document.getElementById('customer_name').value.trim() || null,
        responsible_id: responsibleId,
        start_hours: startHoursVal,
        end_hours: endHoursVal,
        start_hours_note: discrepancyVisible ? startHoursNote : null,
        start_time: startTime,
        end_time: endTime,
        lunch_hours: lunchHours,
        total_person_hours: totalPersonHours,
        travel_hours: parseFloat(document.getElementById('travel_hours').value) || 0,
        travel_route: document.getElementById('travel_route').value || null,
        transported_people: transportedPeople,
        transport_route: transportedPeople ? transportRoute : null,
        transport_hours: transportedPeople ? transportHours : null,
        downtime_hours: parseFloat(document.getElementById('downtime_hours').value) || 0,
        downtime_reason: document.getElementById('downtime_reason').value || null,
        fueling_liters: parseFloat(document.getElementById('fueling_liters').value) || 0,
        fueling_source: document.getElementById('fueling_source').value || null,
        has_breakdown: hasBreakdown,
        breakdown_description: hasBreakdown ? breakdownDescription : null,
        repair_hours: repairHours,
        operator_note: document.getElementById('operator_note').value || null
      };

      const equipmentName = myEquipment.find(ue => ue.equipment.id === payload.equipment_id)?.equipment.name || '—';
      const objectName = objects.find(o => o.id === payload.object_id)?.name || '—';

      renderReportPreview(user, payload, isEdit, existingReport, equipmentName, objectName);
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Перевірити звіт';
    }
  });
}

// ---------- Екран перевірки звіту перед відправкою ----------
// payload: дані з форми (ще не записані в базу).
// isEdit/existingReport: те саме, що і у renderOperatorForm — чи це редагування
// вже поданого звіту (визначає, робити supaUpdate чи supaInsert при підтвердженні).
// equipmentName/objectName: назви для відображення (у payload лише id).

function renderReportPreview(user, payload, isEdit, existingReport, equipmentName, objectName) {
  const totalMotoHours = Math.round((payload.end_hours - payload.start_hours) * 100) / 100;

  const displayReport = {
    ...payload,
    total_moto_hours: totalMotoHours,
    users: { full_name: user.full_name },
    equipment: { name: equipmentName },
    objects: { name: objectName },
    submitted_at: new Date().toISOString()
  };

  app.innerHTML = `
    ${topbarHtml('Перевірка звіту', `Оператор: ${user.full_name}`)}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-form-preview" style="margin:0 0 14px">← Назад до редагування</div>
      <div class="report-card">
        <div class="top-row">
          <span class="date">${formatDateUA(payload.work_date)}</span>
          <span class="status-chip status-wait">Ще не відправлено</span>
        </div>
        ${reportDetailsHtml(displayReport)}
      </div>
      <div class="approval-actions">
        <button class="btn-reject" id="preview-edit-btn">Редагувати</button>
        <button class="btn-confirm" id="preview-confirm-btn">Підтвердити і відправити</button>
      </div>
      <div class="error-text hidden" id="preview-error-box"></div>
    </div>
  `;

  const goBackToForm = () => renderOperatorForm(user, existingReport, payload);
  document.getElementById('back-to-form-preview').addEventListener('click', goBackToForm);
  document.getElementById('preview-edit-btn').addEventListener('click', goBackToForm);

  document.getElementById('preview-confirm-btn').addEventListener('click', async () => {
    const confirmBtn = document.getElementById('preview-confirm-btn');
    const editBtn = document.getElementById('preview-edit-btn');
    const errorBox = document.getElementById('preview-error-box');
    errorBox.classList.add('hidden');

    confirmBtn.disabled = true;
    editBtn.disabled = true;
    confirmBtn.textContent = isEdit ? 'Збереження...' : 'Відправка...';

    try {
      let reportId;
      const dbPayload = { ...payload };

      if (isEdit) {
        reportId = existingReport.id;

        // Зберігаємо знімок старих даних перед перезаписом (аудиторський слід)
        const editLogId = await supaRpc('next_id', { p_prefix: 'EDIT' });
        await supaInsert('report_edit_log', {
          id: editLogId,
          report_id: reportId,
          edited_by: user.id,
          old_data: existingReport
        });

        dbPayload.status = 'Очікує відповідального';
        dbPayload.final_closed_at = null;

        await supaUpdate('daily_reports', `id=eq.${reportId}`, dbPayload);
      } else {
        reportId = await supaRpc('next_id', { p_prefix: 'REP' });
        dbPayload.id = reportId;
        await supaInsert('daily_reports', dbPayload);
      }

      app.innerHTML = `
        <div class="wrap">
        <div class="success-box">
          <div>✅ ${isEdit ? 'Звіт оновлено і повторно відправлено' : 'Звіт успішно подано'}</div>
          <div class="stamp">${reportId}</div>
          <div class="status">СТАТУС: ОЧІКУЄ ВІДПОВІДАЛЬНОГО</div>
        </div>
        <button type="button" id="back-home-btn" style="background:var(--asphalt);color:var(--brand-yellow);width:100%;padding:14px;border:none;border-radius:4px;font-family:'Oswald',sans-serif;font-weight:600;font-size:14px;text-transform:uppercase;letter-spacing:0.03em;cursor:pointer">На головну</button>
        </div>
      `;
      document.getElementById('back-home-btn').addEventListener('click', () => renderOperatorHome(user));
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove('hidden');
      confirmBtn.disabled = false;
      editBtn.disabled = false;
      confirmBtn.textContent = 'Підтвердити і відправити';
    }
  });
}

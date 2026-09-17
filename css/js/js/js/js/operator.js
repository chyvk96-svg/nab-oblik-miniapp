// ---------- Екрани ролі "Оператор" ----------

const HOURS_EPSILON = 0.05; // допустима похибка при порівнянні мотогодин

// ---------- Головне меню оператора ----------

function renderOperatorHome(user) {
  app.innerHTML = `
    ${topbarHtml('Головне меню', user.full_name)}
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

// ---------- Мої записи: історія звітів оператора ----------

async function renderMyReports(user) {
  app.innerHTML = `
    ${topbarHtml('Мої записи', user.full_name)}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-menu" style="padding:0 0 14px">← Назад до меню</div>
      <div id="reports-list" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-menu').addEventListener('click', () => renderOperatorHome(user));

  let reports;
  try {
    reports = await supaGet(
      'daily_reports',
      `operator_id=eq.${user.id}&select=id,work_date,status,start_hours,end_hours,total_moto_hours,submitted_at,equipment(name),objects(name)&order=work_date.desc`
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
      <div class="meta">${r.equipment?.name || '—'} · ${r.objects?.name || '—'}</div>
      <div class="hours">${r.start_hours} → ${r.end_hours} год (разом ${r.total_moto_hours})</div>
      <div class="meta" style="margin-top:4px">Подано: ${formatDateTimeUA(r.submitted_at)}</div>
    </div>
  `).join('');
}

// ---------- Екран оператора: форма щоденного звіту ----------

async function renderOperatorForm(user) {
  let myEquipment, objects;

  try {
    myEquipment = await supaGet(
      'user_equipment',
      `user_id=eq.${user.id}&status=eq.Активна&select=equipment_id,equipment(id,name,confirmed_hours)`
    );
    objects = await supaGet('objects', `status=eq.Активний&select=id,name`);
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
    .map(ue => `<option value="${ue.equipment.id}">${ue.equipment.name}</option>`)
    .join('');
  const objectOptions = objects
    .map(o => `<option value="${o.id}">${o.name}</option>`)
    .join('');

  app.innerHTML = `
    ${topbarHtml('Внести дані', user.full_name)}
    <div class="wrap">
    <div class="back-link" id="back-to-menu-form" style="padding:14px 0 0">← Назад до меню</div>
    <form id="report-form">

      <div class="section">
        <div class="section-title"><span class="n">1</span><span class="icon">🚜</span>Техніка та об'єкт</div>

        <label>Дата роботи</label>
        <input type="date" id="work_date" value="${today}" required>

        <label>Техніка</label>
        <select id="equipment_id" required>${equipmentOptions}</select>

        <label>Об'єкт</label>
        <select id="object_id" required>${objectOptions}</select>

        <label>Відповідальний за об'єкт</label>
        <input type="text" id="responsible_display" disabled placeholder="Визначається автоматично">
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
            <input type="number" step="0.1" class="numeric" id="end_hours" required>
            <div class="hint-inline" id="end-hours-hint"></div>
          </div>
        </div>

        <div class="discrepancy-box hidden" id="discrepancy-box">
          <div class="flag">⚠ ЗНАЧЕННЯ ВІДРІЗНЯЄТЬСЯ ВІД ОЧІКУВАНОГО</div>
          <label style="margin-top:0">Причина розбіжності</label>
          <textarea id="start_hours_note" placeholder="Наприклад: лічильник скинуто, попередній запис невірний тощо"></textarea>
        </div>
      </div>

      <div class="section">
        <div class="section-title"><span class="n">3</span><span class="icon">🕐</span>Час роботи</div>

        <div class="row2">
          <div>
            <label>Початок</label>
            <input type="time" id="start_time" required>
          </div>
          <div>
            <label>Кінець</label>
            <input type="time" id="end_time" required>
          </div>
        </div>
        <label>Обід, год</label>
        <input type="number" step="0.1" id="lunch_hours" value="0">
      </div>

      <div class="section">
        <div class="section-title"><span class="n">4</span><span class="icon">🚗</span>Переїзд</div>
        <label>Години</label>
        <input type="number" step="0.1" id="travel_hours" value="0">
        <label>Опис маршруту</label>
        <input type="text" id="travel_route" placeholder="Звідки → куди">
      </div>

      <div class="section">
        <div class="section-title"><span class="n">5</span><span class="icon">⏸</span>Простій</div>
        <label>Години</label>
        <input type="number" step="0.1" id="downtime_hours" value="0">
        <label>Причина</label>
        <input type="text" id="downtime_reason">
      </div>

      <div class="section">
        <div class="section-title"><span class="n">6</span><span class="icon">⛽</span>Заправка та поломки</div>
        <label>Заправка, л</label>
        <input type="number" step="0.1" id="fueling_liters" value="0">

        <div class="checkbox-row">
          <input type="checkbox" id="has_breakdown">
          <label for="has_breakdown">Була поломка</label>
        </div>

        <div id="repair-block" class="hidden">
          <label>Опис поломки</label>
          <textarea id="breakdown_description" placeholder="Що сталось, який вузол/компонент"></textarea>
          <label>Ремонт, год</label>
          <input type="number" step="0.1" id="repair_hours" value="0">
        </div>
      </div>

      <div class="section">
        <div class="section-title"><span class="n">7</span><span class="icon">📝</span>Примітка</div>
        <textarea id="operator_note" placeholder="Довільний коментар до звіту"></textarea>
      </div>

      <button type="submit" id="submit-btn">Подати звіт</button>
      <div class="error-text hidden" id="error-box"></div>

    </form>
    </div>
  `;

  // Показ/приховування блоку ремонту
  document.getElementById('back-to-menu-form').addEventListener('click', () => renderOperatorHome(user));
  document.getElementById('has_breakdown').addEventListener('change', (e) => {
    document.getElementById('repair-block').classList.toggle('hidden', !e.target.checked);
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
    if (!isDifferent) document.getElementById('start_hours_note').value = '';
  }

  document.getElementById('equipment_id').addEventListener('change', applySuggestedStartHours);
  document.getElementById('start_hours').addEventListener('input', () => { checkDiscrepancy(); checkEndHours(); });
  applySuggestedStartHours();

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

  // Автовизначення відповідального при виборі об'єкта
  async function updateResponsible() {
    const objectId = document.getElementById('object_id').value;
    const respDisplay = document.getElementById('responsible_display');
    respDisplay.value = 'Завантаження...';
    try {
      const links = await supaGet(
        'object_responsible',
        `object_id=eq.${objectId}&status=eq.Активний&select=user_id,users(full_name)`
      );
      if (links && links.length > 0) {
        respDisplay.value = links[0].users.full_name;
        respDisplay.dataset.userId = links[0].user_id;
      } else {
        respDisplay.value = 'Не призначено';
        respDisplay.dataset.userId = '';
      }
    } catch (e) {
      respDisplay.value = 'Помилка визначення';
    }
  }

  document.getElementById('object_id').addEventListener('change', updateResponsible);
  await updateResponsible();

  // Відправка форми
  document.getElementById('report-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-btn');
    const errorBox = document.getElementById('error-box');
    errorBox.classList.add('hidden');

    try {
      const responsibleId = document.getElementById('responsible_display').dataset.userId;
      if (!responsibleId) {
        throw new Error('Не визначено відповідального за цей об\'єкт.');
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

      submitBtn.disabled = true;
      submitBtn.textContent = 'Відправка...';

      const startTime = document.getElementById('start_time').value;
      const endTime = document.getElementById('end_time').value;
      const lunchHours = parseFloat(document.getElementById('lunch_hours').value) || 0;

      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      let diffHours = (eh + em / 60) - (sh + sm / 60);
      if (diffHours < 0) diffHours += 24;
      const totalPersonHours = Math.round((diffHours - lunchHours) * 100) / 100;

      const newId = await supaRpc('next_id', { p_prefix: 'REP' });

      const payload = {
        id: newId,
        work_date: document.getElementById('work_date').value,
        operator_id: user.id,
        equipment_id: document.getElementById('equipment_id').value,
        object_id: document.getElementById('object_id').value,
        responsible_id: responsibleId,
        start_hours: parseFloat(document.getElementById('start_hours').value),
        end_hours: parseFloat(document.getElementById('end_hours').value),
        start_hours_note: discrepancyVisible ? startHoursNote : null,
        start_time: startTime,
        end_time: endTime,
        lunch_hours: lunchHours,
        total_person_hours: totalPersonHours,
        travel_hours: parseFloat(document.getElementById('travel_hours').value) || 0,
        travel_route: document.getElementById('travel_route').value || null,
        downtime_hours: parseFloat(document.getElementById('downtime_hours').value) || 0,
        downtime_reason: document.getElementById('downtime_reason').value || null,
        fueling_liters: parseFloat(document.getElementById('fueling_liters').value) || 0,
        has_breakdown: hasBreakdown,
        breakdown_description: hasBreakdown ? breakdownDescription : null,
        repair_hours: parseFloat(document.getElementById('repair_hours')?.value) || 0,
        operator_note: document.getElementById('operator_note').value || null
      };

      await supaInsert('daily_reports', payload);

      app.innerHTML = `
        <div class="wrap">
        <div class="success-box">
          <div>✅ Звіт успішно подано</div>
          <div class="stamp">${newId}</div>
          <div class="status">СТАТУС: ОЧІКУЄ ВІДПОВІДАЛЬНОГО</div>
        </div>
        <button type="button" id="back-home-btn" style="background:var(--asphalt);color:var(--brand-yellow);width:100%;padding:14px;border:none;border-radius:4px;font-family:'Oswald',sans-serif;font-weight:600;font-size:14px;text-transform:uppercase;letter-spacing:0.03em;cursor:pointer">На головну</button>
        </div>
      `;
      document.getElementById('back-home-btn').addEventListener('click', () => renderOperatorHome(user));
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Подати звіт';
    }
  });
}

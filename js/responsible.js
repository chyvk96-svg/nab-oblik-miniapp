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
    </div>
  `;
  document.getElementById('btn-pending').addEventListener('click', () => renderPendingApprovals(user));
  document.getElementById('btn-history').addEventListener('click', () => renderApprovalHistory(user));
}

// ---------- Деталі одного звіту (спільна розмітка для обох списків) ----------

function reportDetailsHtml(r) {
  const breakdownLine = r.has_breakdown
    ? `<div class="detail-row"><span class="label">Поломка:</span> ${r.breakdown_description || '—'}</div>`
    : '';
  const startNoteLine = r.start_hours_note
    ? `<div class="detail-row"><span class="label">Причина розбіжності мотогодин:</span> ${r.start_hours_note}</div>`
    : '';
  const downtimeLine = (r.downtime_hours && r.downtime_hours > 0)
    ? `<div class="detail-row"><span class="label">Простій:</span> ${r.downtime_hours} год — ${r.downtime_reason || '—'}</div>`
    : '';
  const noteLine = r.operator_note
    ? `<div class="detail-row"><span class="label">Примітка:</span> ${r.operator_note}</div>`
    : '';

  return `
    <div class="operator-name">${r.users?.full_name || '—'}</div>
    <div class="meta">${r.equipment?.name || '—'} · ${r.objects?.name || '—'}</div>
    <div class="hours">${r.start_hours} → ${r.end_hours} год (разом ${r.total_moto_hours})</div>
    <div class="detail-row"><span class="label">Час роботи:</span> ${r.start_time} – ${r.end_time}, людиногодин: ${r.total_person_hours}</div>
    ${downtimeLine}
    ${breakdownLine}
    ${startNoteLine}
    ${noteLine}
    <div class="meta" style="margin-top:4px">Подано: ${formatDateTimeUA(r.submitted_at)}</div>
  `;
}

// ---------- Мої підтвердження: звіти, що очікують дії ----------

const REPORT_SELECT_FIELDS = 'id,work_date,status,start_hours,end_hours,total_moto_hours,start_time,end_time,' +
  'total_person_hours,downtime_hours,downtime_reason,has_breakdown,breakdown_description,start_hours_note,' +
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
        <button class="btn-confirm" data-report-id="${r.id}">Підтвердити</button>
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
    btn.addEventListener('click', () => confirmReport(user, btn.dataset.reportId, btn));
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

async function confirmReport(user, reportId, btn) {
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

    await supaUpdate('daily_reports', `id=eq.${reportId}`, {
      status: 'Підтверджено відповідальним'
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

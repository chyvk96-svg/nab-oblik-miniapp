// ---------- Екрани ролі "Оператор" ----------
// Використовує спільні reportDetailsHtml(), REPORT_SELECT_FIELDS з responsible.js
// (той самий файл вже завантажений у сторінку) для показу розгорнутих деталей звіту.

const HOURS_EPSILON = 0.05; // допустима похибка при порівнянні мотогодин

// ---------- Головне меню оператора ----------

function renderOperatorHome(user) {
  app.innerHTML = `
    ${topbarHtml('Головне меню', roleSubtitle(user))}
    <div class="wrap" style="padding-top:14px" id="drafts-banner-wrap"></div>
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
      <button class="menu-btn" id="btn-my-hours">
        <span class="emoji">🕒</span>
        <span>
          Мої години
          <span class="sub">Підтверджені години за місяць і відомість у Telegram</span>
        </span>
      </button>
    </div>
  `;
  document.getElementById('btn-new-report').addEventListener('click', () => renderOperatorForm(user));
  document.getElementById('btn-my-reports').addEventListener('click', () => renderMyReports(user));
  document.getElementById('btn-my-hours').addEventListener('click', () => renderMyHours(user));

  loadDraftsBanner(user);
}

// ---------- Банер незавершених чернеток на головному екрані оператора ----------
async function loadDraftsBanner(user) {
  const wrap = document.getElementById('drafts-banner-wrap');
  if (!wrap) return;

  let drafts;
  try {
    drafts = await supaGet(
      'daily_reports',
      `operator_id=eq.${user.id}&status=eq.Чернетка&select=id,work_date,equipment_id,equipment(name)&order=work_date.desc`
    );
  } catch (e) {
    return; // індикатор не критичний — тихо пропускаємо помилку
  }

  if (!drafts || drafts.length === 0) return;

  wrap.innerHTML = `
    <div class="discrepancy-box" style="margin:0 0 14px">
      <div class="flag">📝 НЕЗАВЕРШЕНІ ЧЕРНЕТКИ (${drafts.length})</div>
      ${drafts.map(d => `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:8px">
          <span>${formatDateUA(d.work_date)} · ${d.equipment?.name || '—'}</span>
          <span style="display:flex;gap:6px">
            <button class="btn-confirm" style="padding:6px 10px" data-continue-id="${d.id}">Продовжити</button>
            <button class="btn-reject" style="padding:6px 10px" data-delete-id="${d.id}">Видалити</button>
          </span>
        </div>
      `).join('')}
    </div>
  `;

  wrap.querySelectorAll('[data-continue-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Завантаження...';
      try {
        const rows = await supaGet('daily_reports', `id=eq.${btn.dataset.continueId}&select=*`);
        if (rows && rows.length > 0) {
          renderOperatorForm(user, rows[0]);
        } else {
          alert('Чернетку не знайдено.');
          btn.disabled = false;
          btn.textContent = 'Продовжити';
        }
      } catch (e) {
        alert('Помилка завантаження: ' + e.message);
        btn.disabled = false;
        btn.textContent = 'Продовжити';
      }
    });
  });

  wrap.querySelectorAll('[data-delete-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Видалити цю чернетку без збереження?')) return;
      btn.disabled = true;
      btn.textContent = 'Видалення...';
      try {
        await supaDelete('daily_reports', `id=eq.${btn.dataset.deleteId}`);
        loadDraftsBanner(user);
      } catch (e) {
        alert('Помилка видалення: ' + e.message);
        btn.disabled = false;
        btn.textContent = 'Видалити';
      }
    });
  });
}

// ---------- Мої записи: історія звітів оператора (розгорнуті картки) ----------

async function renderMyReports(user) {
  app.innerHTML = `
    ${topbarHtml('Мої записи', roleSubtitle(user))}
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
      `operator_id=eq.${user.id}&status=neq.Чернетка&select=${REPORT_SELECT_FIELDS}&order=work_date.desc`
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

  // Для звітів, повернутих на коригування, підтягуємо причину відхилення
  // (вона зберігається окремо, в таблиці approvals, а не в самому звіті).
  const correctionIds = reports.filter(r => r.status === 'Повернено на коригування').map(r => r.id);
  const rejectionComments = await fetchLatestRejectionComments(correctionIds);

  listEl.className = '';
  listEl.innerHTML = reports.map(r => `
    <div class="report-card">
      <div class="top-row">
        <span class="date">${formatDateUA(r.work_date)}</span>
        <span class="status-chip ${statusChipClass(r.status)}">${r.status}</span>
      </div>
      ${reportDetailsHtml(r)}
      ${r.status === 'Повернено на коригування'
        ? `<div class="discrepancy-box" style="margin-top:10px">
             <div class="flag">⚠ ПРИЧИНА ПОВЕРНЕННЯ НА КОРИГУВАННЯ</div>
             ${rejectionComments[r.id] || 'Причину не вказано.'}
           </div>
           <button class="btn-confirm" style="margin-top:10px" data-edit-id="${r.id}">Редагувати</button>`
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

// Повертає мапу { report_id: останній коментар відхилення } для переданого
// списку id звітів (запит в таблицю approvals, result = "Відхилено").
async function fetchLatestRejectionComments(reportIds) {
  if (!reportIds || reportIds.length === 0) return {};
  try {
    const rows = await supaGet(
      'approvals',
      `report_id=in.(${reportIds.join(',')})&result=eq.Відхилено&select=report_id,comment,confirmed_at&order=confirmed_at.desc`
    );
    const map = {};
    (rows || []).forEach(row => {
      if (!map[row.report_id]) map[row.report_id] = row.comment; // перший запис по кожному id — найновіший (сортовано desc)
    });
    return map;
  } catch (e) {
    return {};
  }
}

// ---------- Мої години: підтверджені людиногодини за період + відомість у Telegram ----------
// Рядок = один звіт "Фінально підтверджено" (два об'єкти за день = два рядки).
// Внизу — "Разом" (лише підтверджені). Окремим блоком — "Ще не зараховано"
// (очікують відповідального / повернені на коригування), у "Разом" не входять.
// Чернетки не показуються.
// Кнопка "Надіслати в Telegram": .xlsx → Storage "exports" → рядок у
// export_files → Database Webhook → Make → файл у чат з ботом.
// Той самий екран використовує адміністратор ("Години оператора" в admin.js):
// renderHoursScreen({ viewer, subject, onBack }) — viewer (хто дивиться)
// отримує файл у бот, subject — чиї години (export_files.subject_user_id).
// Використовує спільні з admin.js: isoDateLocal, fmtNum, loadExcelJsLib,
// xlNewSheet / xlTable / xlFinishSheet / xlSectionTitle, XLSX_MIME
// (admin.js підключений на сторінці для всіх ролей).

const HOURS_CONFIRMED_STATUS = 'Фінально підтверджено';
const HOURS_PENDING_STATUSES = ['Очікує відповідального', 'Повернено на коригування'];

let hoursLoadSeq = 0;

function escHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

// Періоди: "this" — з 1-го числа поточного місяця по сьогодні;
// "prev" — увесь минулий місяць
function monthPeriod(kind) {
  const today = new Date();
  if (kind === 'prev') {
    const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const last = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: isoDateLocal(first), to: isoDateLocal(last) };
  }
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  return { from: isoDateLocal(first), to: isoDateLocal(today) };
}

function sumField(rows, key) {
  return rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function renderMyHours(user) {
  renderHoursScreen({ viewer: user, subject: user, onBack: () => renderOperatorHome(user) });
}

async function renderHoursScreen({ viewer, subject, onBack }) {
  const isOwn = viewer.id === subject.id;
  const title = isOwn ? 'Мої години' : 'Години оператора';
  const subtitle = isOwn ? roleSubtitle(viewer) : `${escHtml(subject.role || 'Оператор')}: ${escHtml(subject.full_name)}`;
  app.innerHTML = `
    ${topbarHtml(title, subtitle)}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-menu" style="margin:0 0 4px">← ${isOwn ? 'Назад до меню' : 'Назад до списку'}</div>
      <div class="section" style="padding-bottom:12px">
        <div style="display:flex;gap:6px">
          <button type="button" class="btn-reject" style="padding:8px 4px" data-mh-quick="this">Цей місяць</button>
          <button type="button" class="btn-reject" style="padding:8px 4px" data-mh-quick="prev">Минулий місяць</button>
        </div>
        <div class="row2" style="margin-top:8px">
          <div>
            <label>З</label>
            <input type="date" id="mh-from">
          </div>
          <div>
            <label>По</label>
            <input type="date" id="mh-to">
          </div>
        </div>
      </div>
      <div id="mh-result" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-menu').addEventListener('click', onBack);

  const fromEl = document.getElementById('mh-from');
  const toEl = document.getElementById('mh-to');

  const show = (from, to) => {
    fromEl.value = from;
    toEl.value = to;
    loadMyHours(viewer, subject, from, to);
  };

  document.querySelectorAll('[data-mh-quick]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = monthPeriod(btn.getAttribute('data-mh-quick'));
      show(p.from, p.to);
    });
  });

  const onDateChange = () => {
    if (!fromEl.value || !toEl.value) return;
    if (fromEl.value > toEl.value) {
      document.getElementById('mh-result').className = 'msg';
      document.getElementById('mh-result').textContent = 'Дата "з" не може бути пізнішою за "по".';
      return;
    }
    loadMyHours(viewer, subject, fromEl.value, toEl.value);
  };
  fromEl.addEventListener('change', onDateChange);
  toEl.addEventListener('change', onDateChange);

  const p = monthPeriod('this');
  show(p.from, p.to);
}

async function loadMyHours(viewer, subject, from, to) {
  const seq = ++hoursLoadSeq;
  const resultEl = document.getElementById('mh-result');
  if (!resultEl) return;
  resultEl.className = 'msg';
  resultEl.textContent = 'Завантаження...';

  let reports;
  try {
    reports = await supaGet(
      'daily_reports',
      `operator_id=eq.${subject.id}&work_date=gte.${from}&work_date=lte.${to}&status=neq.Чернетка` +
      `&select=id,work_date,status,start_time,total_person_hours,travel_hours,transport_hours,equipment(name),objects(name)` +
      `&order=work_date.asc,start_time.asc`
    );
  } catch (e) {
    if (seq !== hoursLoadSeq) return;
    resultEl.textContent = 'Помилка завантаження: ' + e.message;
    return;
  }
  if (seq !== hoursLoadSeq) return; // користувач уже вибрав інший період

  const confirmed = (reports || []).filter(r => r.status === HOURS_CONFIRMED_STATUS);
  const pending = (reports || []).filter(r => HOURS_PENDING_STATUSES.includes(r.status));

  const totals = {
    person: round2(sumField(confirmed, 'total_person_hours')),
    travel: round2(sumField(confirmed, 'travel_hours')),
    transport: round2(sumField(confirmed, 'transport_hours')),
    days: new Set(confirmed.map(r => r.work_date)).size,
    pendingPerson: round2(sumField(pending, 'total_person_hours'))
  };

  resultEl.className = '';

  if (confirmed.length === 0 && pending.length === 0) {
    resultEl.innerHTML = `<div class="msg" style="padding:30px 10px">За цей період звітів немає.</div>`;
    return;
  }

  const cell = 'padding:6px 4px;border-bottom:1px solid var(--line);vertical-align:top';
  const num = cell + ';text-align:right;font-family:\'Space Mono\',monospace;white-space:nowrap';
  const head = 'padding:6px 4px;border-bottom:2px solid var(--asphalt);font-family:Oswald,sans-serif;font-weight:600;font-size:11px;text-transform:uppercase;text-align:left';
  const headNum = head + ';text-align:right';

  const rowHtml = (r, withStatus) => `
    <tr>
      <td style="${cell};white-space:nowrap">${formatDateUA(r.work_date).slice(0, 5)}</td>
      <td style="${cell}">
        ${escHtml(r.objects?.name || '—')}
        <div style="font-size:11px;color:var(--ink-soft)">${escHtml(r.equipment?.name || '')}</div>
        ${withStatus ? `<span class="status-chip ${statusChipClass(r.status)}" style="font-family:'Space Mono',monospace;font-size:9px;padding:1px 5px;border-radius:3px;display:inline-block;margin-top:3px">${escHtml(r.status)}</span>` : ''}
      </td>
      <td style="${num}">${fmtNum(r.total_person_hours)}</td>
      <td style="${num}">${Number(r.travel_hours) ? fmtNum(r.travel_hours) : ''}</td>
      <td style="${num}">${Number(r.transport_hours) ? fmtNum(r.transport_hours) : ''}</td>
    </tr>
  `;

  const tableHead = `
    <tr>
      <th style="${head}">Дата</th>
      <th style="${head}">Об'єкт / техніка</th>
      <th style="${headNum}">Люд.-год</th>
      <th style="${headNum}">Переб.</th>
      <th style="${headNum}">Перев.</th>
    </tr>
  `;

  const confirmedHtml = confirmed.length === 0
    ? `<div class="hint-inline" style="margin:8px 0 0">Підтверджених звітів за цей період ще немає.</div>`
    : `
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;background:#fff">
        <thead>${tableHead}</thead>
        <tbody>${confirmed.map(r => rowHtml(r, false)).join('')}</tbody>
        <tfoot>
          <tr style="font-weight:700">
            <td style="${cell};border-top:2px solid var(--asphalt)" colspan="2">
              РАЗОМ
              <div style="font-size:11px;font-weight:400;color:var(--ink-soft)">Робочих днів: ${totals.days}</div>
            </td>
            <td style="${num};border-top:2px solid var(--asphalt)">${fmtNum(totals.person)}</td>
            <td style="${num};border-top:2px solid var(--asphalt)">${totals.travel ? fmtNum(totals.travel) : ''}</td>
            <td style="${num};border-top:2px solid var(--asphalt)">${totals.transport ? fmtNum(totals.transport) : ''}</td>
          </tr>
        </tfoot>
      </table>
    `;

  const pendingHtml = pending.length === 0 ? '' : `
    <div class="discrepancy-box" style="margin-top:16px">
      <div class="flag">⏳ ЩЕ НЕ ЗАРАХОВАНО (${pending.length}) · ${fmtNum(totals.pendingPerson)} люд.-год</div>
      <div class="hint-inline" style="margin:0 0 6px">Ці звіти ще не підтверджені — у "Разом" не входять.</div>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;background:#fff">
        <thead>${tableHead}</thead>
        <tbody>${pending.map(r => rowHtml(r, true)).join('')}</tbody>
      </table>
    </div>
  `;

  resultEl.innerHTML = `
    <div class="report-card" style="border-left-color:var(--brand-yellow)">
      <div class="top-row">
        <span class="date">${formatDateUA(from)} – ${formatDateUA(to)}</span>
      </div>
      <div class="hours">Людиногодини: <b>${fmtNum(totals.person)}</b></div>
      <div class="detail-row"><span class="label">Робочих днів:</span> ${totals.days}</div>
      ${totals.travel ? `<div class="detail-row"><span class="label">Перебазування:</span> ${fmtNum(totals.travel)} год</div>` : ''}
      ${totals.transport ? `<div class="detail-row"><span class="label">Перевезення людей:</span> ${fmtNum(totals.transport)} год</div>` : ''}
    </div>
    ${confirmedHtml}
    ${pendingHtml}
    <button type="button" class="btn-add-top" id="mh-send-btn" style="margin-top:18px">📥 Надіслати в Telegram</button>
    <div class="hint-inline" id="mh-send-hint" style="text-align:center;margin-bottom:10px">
      ${viewer.id === subject.id
        ? 'Файл Excel прийде в чат з ботом — там зберігається історія ваших відомостей.'
        : 'Файл Excel прийде вам (не оператору) у чат з ботом.'}
    </div>
  `;

  const sendBtn = document.getElementById('mh-send-btn');
  sendBtn.addEventListener('click', () => sendHoursToTelegram(sendBtn, viewer, subject, from, to, confirmed, pending, totals));
}

// ---------- Відомість годин: Excel → Storage → export_files → бот ----------

// Випадковий UUID (для папки файлу у сховищі; формат перевіряє база)
function exportUuid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// Відомість годин (оформлена, ExcelJS; спільні xlNewSheet / xlTable /
// xlFinishSheet з admin.js): аркуш "Години" — підтверджені звіти з рядком
// "РАЗОМ" і кількістю робочих днів; нижче окремою таблицею — "Ще не
// зараховано" (у "РАЗОМ" не входить).
function buildHoursWorkbook(ExcelJS, user, from, to, confirmed, pending, totals) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'НАБ ТехОблік';
  wb.created = new Date();

  const baseColumns = [
    { header: 'Дата', width: 12, type: 'date', get: r => r.work_date },
    { header: "Об'єкт", width: 38, type: 'long', get: r => r.objects?.name || '' },
    { header: 'Техніка', width: 26, type: 'name', get: r => r.equipment?.name || '' },
    { header: 'Людиногодини', width: 13, type: 'hours', get: r => r.total_person_hours, total: true },
    { header: 'Перебазування, год', width: 15, type: 'hours', get: r => r.travel_hours, total: true },
    { header: 'Перевезення людей, год', width: 15, type: 'hours', get: r => r.transport_hours, total: true }
  ];
  const pendingColumns = baseColumns.concat([
    { header: 'Статус', width: 23, type: 'status', get: r => r.status }
  ]);

  const { ws, nextRow } = xlNewSheet(wb, 'Години', {
    title: `Відомість годин: ${user.full_name}`,
    subtitle: `Період: ${formatDateUA(from)} – ${formatDateUA(to)}`,
    note: 'лише звіти "Фінально підтверджено"'
  });
  ws.columns = pendingColumns.map(c => ({ width: c.width }));

  const t = xlTable(ws, nextRow, {
    columns: baseColumns,
    rows: confirmed,
    totalsLabel: 'РАЗОМ',
    emptyText: 'Підтверджених звітів за цей період немає'
  });

  // Робочих днів — під рядком "РАЗОМ"
  let row = t.nextRow;
  if (confirmed.length > 0) {
    const cellLabel = ws.getCell(row, 1);
    cellLabel.value = 'Робочих днів';
    const cellValue = ws.getCell(row, 4);
    cellValue.value = totals.days;
    cellValue.numFmt = '0';
    [cellLabel, cellValue].forEach(c => {
      c.font = { name: 'Calibri', size: 10, bold: true };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    row += 1;
  }

  xlFinishSheet(ws, {
    headerRow: t.headerRow,
    lastDataRow: confirmed.length ? t.lastDataRow : t.headerRow,
    colCount: baseColumns.length,
    filter: false
  });

  if (pending.length > 0) {
    row += 1;
    xlSectionTitle(ws, row, `Ще не зараховано (${pending.length}) — у "РАЗОМ" не входить`);
    xlTable(ws, row + 1, {
      columns: pendingColumns,
      rows: pending,
      totalsLabel: 'РАЗОМ'
    });
  }

  return wb;
}

function hoursCaption(user, from, to, pending, totals) {
  const lines = [
    `🕒 Відомість годин: ${user.full_name}`,
    `📅 ${formatDateUA(from)} – ${formatDateUA(to)}`,
    `✅ Людиногодини: ${fmtNum(totals.person)} · робочих днів: ${totals.days}`
  ];
  if (totals.travel) lines.push(`🚛 Перебазування: ${fmtNum(totals.travel)} год`);
  if (totals.transport) lines.push(`🚌 Перевезення людей: ${fmtNum(totals.transport)} год`);
  if (pending.length > 0) {
    lines.push(`⏳ Ще не зараховано: ${pending.length} звіт(и), ${fmtNum(totals.pendingPerson)} люд.-год`);
  }
  return lines.join('\n');
}

async function sendHoursToTelegram(btn, viewer, subject, from, to, confirmed, pending, totals) {
  const original = btn.textContent;
  const hint = document.getElementById('mh-send-hint');
  btn.disabled = true;
  btn.textContent = 'Формування файлу...';

  try {
    const ExcelJS = await loadExcelJsLib();
    const wb = buildHoursWorkbook(ExcelJS, subject, from, to, confirmed, pending, totals);
    const buffer = await wb.xlsx.writeBuffer();

    const fileName = `Hodyny_${subject.id}_${from}_${to}.xlsx`;
    const path = `${exportUuid()}/${fileName}`;

    btn.textContent = 'Надсилання...';

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
      throw new Error('не вдалося зберегти файл у сховище: ' + (await res.text()));
    }

    await supaInsert('export_files', {
      user_id: viewer.id,             // хто вивантажує — йому бот надішле файл
      subject_user_id: subject.id,    // чиї години
      export_type: 'Години оператора',
      period_from: from,
      period_to: to,
      file_path: path,
      file_name: fileName,
      caption: hoursCaption(subject, from, to, pending, totals)
    });

    btn.textContent = '✅ Надіслано в чат з ботом';
    if (hint) hint.textContent = 'Файл прийде в чат з ботом за кілька секунд. Щоб побачити його — закрийте Mini App.';
    setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 4000);
  } catch (e) {
    alert('Не вдалося надіслати відомість: ' + e.message);
    btn.textContent = original;
    btn.disabled = false;
  }
}

// ---------- Екран оператора: форма щоденного звіту ----------
// existingReport: якщо передано — форма працює в режимі редагування вже
// поданого (і відхиленого) звіту, замість створення нового (визначає isEdit).
// draftOverride: якщо передано — форма підставляє значення з нього (чернетка,
// з якою оператор повернувся з екрана попереднього перегляду через "Редагувати"),
// не впливає на isEdit/режим збереження.

async function renderOperatorForm(user, existingReport = null, draftOverride = null, existingDraftId = null) {
  const isDraftContinuation = existingReport !== null && existingReport.status === 'Чернетка';
  const isEdit = existingReport !== null && !isDraftContinuation;
  const prefill = draftOverride || existingReport;
  // currentDraftId відстежує рядок-чернетку в daily_reports протягом усієї
  // роботи з формою (навіть якщо форма відкрита як "нова" — чернетка могла
  // з'явитись сама, через автозбереження, ще до явного "Продовжити").
  let currentDraftId = isDraftContinuation ? existingReport.id : existingDraftId;
  let autosaveTimer = null;

  let myEquipment, objects;

  try {
    myEquipment = await supaGet(
      'user_equipment',
      `user_id=eq.${user.id}&status=eq.Активна&select=equipment_id,equipment(id,name,confirmed_hours,tracks_moto_hours,confirmed_km,tracks_odometer)`
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
  const tracksMotoHoursMap = {};
  const confirmedKmMap = {};
  const tracksOdometerMap = {};
  myEquipment.forEach(ue => {
    confirmedHoursMap[ue.equipment.id] = ue.equipment.confirmed_hours;
    tracksMotoHoursMap[ue.equipment.id] = ue.equipment.tracks_moto_hours !== false;
    confirmedKmMap[ue.equipment.id] = ue.equipment.confirmed_km;
    tracksOdometerMap[ue.equipment.id] = ue.equipment.tracks_odometer === true;
  });

  // Якщо це редагування раніше відхиленого звіту — підтягуємо причину коригування,
  // щоб оператор одразу бачив, що саме треба виправити.
  let rejectionComment = null;
  if (isEdit) {
    const comments = await fetchLatestRejectionComments([existingReport.id]);
    rejectionComment = comments[existingReport.id] || null;
  }

  const today = new Date().toISOString().split('T')[0];

  const equipmentOptions = myEquipment
    .map(ue => `<option value="${ue.equipment.id}"${prefill && prefill.equipment_id === ue.equipment.id ? ' selected' : ''}>${ue.equipment.name}</option>`)
    .join('');
  const objectOptions = objects
    .map(o => `<option value="${o.id}"${prefill && prefill.object_id === o.id ? ' selected' : ''}>${o.name}</option>`)
    .join('');

  app.innerHTML = `
    ${topbarHtml(isEdit ? 'Редагування звіту' : (isDraftContinuation ? 'Продовження чернетки' : 'Внести дані'), roleSubtitle(user))}
    <div class="wrap">
    <div class="back-link" id="back-to-menu-form" style="margin:14px 0 0">← Назад до меню</div>
    <div class="hint-inline" id="draft-save-status" style="margin-top:6px"></div>
    ${isDraftContinuation ? `<button type="button" id="delete-draft-btn" style="margin:4px 0 10px;background:none;border:1px solid var(--danger);color:var(--danger);padding:8px 14px;border-radius:4px;cursor:pointer">🗑 Видалити чернетку</button>` : ''}
    ${isEdit ? `
      <div class="discrepancy-box" style="margin-top:14px">
        <div class="flag">⚠ ПРИЧИНА ПОВЕРНЕННЯ НА КОРИГУВАННЯ</div>
        ${rejectionComment || 'Причину не вказано.'}
      </div>
    ` : ''}
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

        <div class="checkbox-row">
          <input type="checkbox" id="on_base_only"${prefill && !isDraftContinuation && prefill.start_hours == null && prefill.start_km == null ? ' checked' : ''}>
          <label for="on_base_only">Робота на базі / ремонт (тільки людиногодини)</label>
        </div>
        <div class="hint-inline">Познач, якщо сьогодні технікою не працювали по факту (стояла на базі, в ремонті тощо) — мотогодини й спідометр не вказуються, рахуються лише відпрацьовані години. Деталі вкажи в примітці.</div>
      </div>

      <div class="section">
        <div class="section-title"><span class="n">2</span><span class="icon">⏱️</span>Мотогодини</div>
        <div class="hint-inline hidden" id="moto-hours-disabled-note">Ця техніка не рахує мотогодини — поле недоступне.</div>

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

      <div class="section hidden" id="odometer-section">
        <div class="section-title"><span class="n">3</span><span class="icon">🛣️</span>Показники спідометра</div>

        <div class="row2">
          <div>
            <label>Початок, км</label>
            <input type="number" step="0.1" class="numeric" id="start_km">
            <div class="hint-inline" id="start-km-hint"></div>
          </div>
          <div>
            <label>Кінець, км</label>
            <input type="number" step="0.1" class="numeric" id="end_km" value="${prefill ? prefill.end_km : ''}">
            <div class="hint-inline" id="end-km-hint"></div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title"><span class="n">4</span><span class="icon">🕐</span>Час роботи</div>

        <div class="row2">
          <div>
            <label>Початок</label>
            <input type="text" inputmode="numeric" id="start_time" placeholder="ГГ:ХВ" maxlength="5" value="${prefill ? formatTimeUA(prefill.start_time) : ''}" required>
          </div>
          <div>
            <label>Кінець</label>
            <input type="text" inputmode="numeric" id="end_time" placeholder="ГГ:ХВ" maxlength="5" value="${prefill ? formatTimeUA(prefill.end_time) : ''}" required>
          </div>
        </div>
        <div class="hint-inline">Вводь час вручну у форматі ГГ:ХВ, наприклад 07:45</div>
        <label>Обід, год</label>
        <input type="number" step="0.1" id="lunch_hours" value="${prefill ? prefill.lunch_hours : '0'}">
      </div>

      <div class="section">
        <div class="section-title"><span class="n">5</span><span class="icon">🚗</span>Перебазування техніки</div>
        <label>Години</label>
        <input type="number" step="0.1" id="travel_hours" value="${prefill ? (prefill.travel_hours || 0) : '0'}">
        <label>Опис маршруту</label>
        <input type="text" id="travel_route" placeholder="Звідки → куди" value="${prefill && prefill.travel_route ? prefill.travel_route : ''}">
      </div>

      <div class="section">
        <div class="section-title"><span class="n">6</span><span class="icon">🚌</span>Перевезення людей</div>

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
        <div class="section-title"><span class="n">7</span><span class="icon">⏸</span>Простій</div>
        <label>Години</label>
        <input type="number" step="0.1" id="downtime_hours" value="${prefill ? (prefill.downtime_hours || 0) : '0'}">
        <label>Причина</label>
        <input type="text" id="downtime_reason" value="${prefill && prefill.downtime_reason ? prefill.downtime_reason : ''}">
      </div>

      <div class="section">
        <div class="section-title"><span class="n">8</span><span class="icon">⛽</span>Заправка та поломки</div>
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
        <div class="section-title"><span class="n">9</span><span class="icon">📝</span>Примітка</div>
        <textarea id="operator_note" placeholder="Довільний коментар до звіту">${prefill && prefill.operator_note ? prefill.operator_note : ''}</textarea>
      </div>

      <button type="submit" id="submit-btn">Перевірити звіт</button>
      <div class="error-text hidden" id="error-box"></div>

    </form>
    </div>
  `;

  document.getElementById('back-to-menu-form').addEventListener('click', () => {
    clearTimeout(autosaveTimer);
    renderOperatorHome(user);
  });

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

  // Вмикає/вимикає поля мотогодин залежно від того, чи техніка їх взагалі
  // рахує (tracks_moto_hours). Для техніки без мотогодин (наприклад,
  // водовозки без справного спідометра) поля стають неактивними й
  // необов'язковими, замість того щоб змушувати оператора вводити фіктивні дані.
  function applyMotoHoursAvailability() {
    const equipmentId = document.getElementById('equipment_id').value;
    const onBaseOnly = document.getElementById('on_base_only').checked;
    const tracksMotoHours = !onBaseOnly && tracksMotoHoursMap[equipmentId] !== false;

    const startInput = document.getElementById('start_hours');
    const endInput = document.getElementById('end_hours');
    const startHint = document.getElementById('start-hours-hint');
    const endHint = document.getElementById('end-hours-hint');
    const disabledNote = document.getElementById('moto-hours-disabled-note');
    const box = document.getElementById('discrepancy-box');

    if (tracksMotoHours) {
      startInput.disabled = false;
      endInput.disabled = false;
      startInput.required = true;
      endInput.required = true;
      disabledNote.classList.add('hidden');
      applySuggestedStartHours();
    } else {
      startInput.disabled = true;
      endInput.disabled = true;
      startInput.required = false;
      endInput.required = false;
      startInput.value = '';
      endInput.value = '';
      delete startInput.dataset.suggested;
      startHint.textContent = '';
      endHint.textContent = '';
      box.classList.add('hidden');
      disabledNote.classList.remove('hidden');
    }
  }

  function checkDiscrepancy() {
    const startInput = document.getElementById('start_hours');
    if (startInput.disabled) return;
    const suggested = parseFloat(startInput.dataset.suggested);
    const current = parseFloat(startInput.value);
    const box = document.getElementById('discrepancy-box');
    const isDifferent = !isNaN(current) && !isNaN(suggested) && Math.abs(current - suggested) > HOURS_EPSILON;
    box.classList.toggle('hidden', !isDifferent);
  }

  // Вмикає/вимикає блок "Показники спідометра" залежно від tracks_odometer
  // обраної техніки. На відміну від мотогодин, тут немає розбіжностей —
  // просто підставляємо підтверджене значення як початок.
  function applyOdometerAvailability() {
    const equipmentId = document.getElementById('equipment_id').value;
    const onBaseOnly = document.getElementById('on_base_only').checked;
    const tracksOdometer = !onBaseOnly && tracksOdometerMap[equipmentId] === true;

    const section = document.getElementById('odometer-section');
    const startInput = document.getElementById('start_km');
    const endInput = document.getElementById('end_km');
    const startHint = document.getElementById('start-km-hint');
    const endHint = document.getElementById('end-km-hint');

    if (tracksOdometer) {
      section.classList.remove('hidden');
      startInput.required = true;
      endInput.required = true;
      const confirmed = confirmedKmMap[equipmentId];
      startInput.dataset.suggested = confirmed;
      startInput.value = confirmed;
      startHint.innerHTML = `Підтверджене значення техніки: <b>${confirmed}</b>`;
    } else {
      section.classList.add('hidden');
      startInput.required = false;
      endInput.required = false;
      startInput.value = '';
      endInput.value = '';
      delete startInput.dataset.suggested;
      startHint.textContent = '';
      endHint.textContent = '';
    }
  }

  function checkEndKm() {
    const startInput = document.getElementById('start_km');
    if (!tracksOdometerMap[document.getElementById('equipment_id').value]) return;
    const start = parseFloat(startInput.value);
    const end = parseFloat(document.getElementById('end_km').value);
    const hint = document.getElementById('end-km-hint');
    if (!isNaN(start) && !isNaN(end) && end < start) {
      hint.innerHTML = `<span style="color: var(--danger)">⚠ Менше за початкові (${start})</span>`;
    } else {
      hint.textContent = '';
    }
  }
  document.getElementById('end_km').addEventListener('input', checkEndKm);

  document.getElementById('equipment_id').addEventListener('change', () => {
    applyMotoHoursAvailability();
    applyOdometerAvailability();
  });
  document.getElementById('on_base_only').addEventListener('change', () => {
    applyMotoHoursAvailability();
    applyOdometerAvailability();
  });
  document.getElementById('start_hours').addEventListener('input', () => { checkDiscrepancy(); checkEndHours(); });

  applyMotoHoursAvailability();
  applyOdometerAvailability();

  // Якщо є чернетка (редагування або повернення з перегляду) — підставляємо
  // реальне значення, яке оператор вводив раніше (могло відрізнятись від
  // підтвердженого техніки). Лише для техніки, яка рахує мотогодини, і якщо
  // це не був звіт "тільки людиногодини".
  if (prefill && !document.getElementById('on_base_only').checked && tracksMotoHoursMap[document.getElementById('equipment_id').value] !== false) {
    document.getElementById('start_hours').value = prefill.start_hours;
    checkDiscrepancy();
  }
  if (prefill && !document.getElementById('on_base_only').checked && tracksOdometerMap[document.getElementById('equipment_id').value] === true) {
    document.getElementById('start_km').value = prefill.start_km;
    checkEndKm();
  }

  function checkEndHours() {
    const startInput = document.getElementById('start_hours');
    if (startInput.disabled) return;
    const start = parseFloat(startInput.value);
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

  // Автоформатування ручного вводу часу (ГГ:ХВ) — користувач вводить лише цифри,
  // двокрапка підставляється автоматично.
  function attachTimeAutoFormat(inputEl) {
    inputEl.addEventListener('input', () => {
      let digits = inputEl.value.replace(/\D/g, '').slice(0, 4);
      if (digits.length >= 3) {
        inputEl.value = digits.slice(0, 2) + ':' + digits.slice(2);
      } else {
        inputEl.value = digits;
      }
    });
  }
  attachTimeAutoFormat(document.getElementById('start_time'));
  attachTimeAutoFormat(document.getElementById('end_time'));

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

  // ---------- Автозбереження чернетки ----------
  // Періодично (з паузою після останньої дії оператора) зберігає поточний
  // стан форми в daily_reports зі статусом "Чернетка" — без валідації, щоб
  // оператор міг заповнити частину даних, вийти, і повернутись пізніше.
  // Реальна відправка (валідація, статус "Очікує відповідального") лишається
  // виключно в обробнику submit нижче.

  function setDraftStatus(text) {
    const el = document.getElementById('draft-save-status');
    if (el) el.textContent = text;
  }

  async function saveDraft() {
    if (!document.getElementById('report-form')) return; // форму вже закрито/замінено іншим екраном
    const equipmentId = document.getElementById('equipment_id').value;
    const objectId = document.getElementById('object_id').value;
    if (!equipmentId || !objectId) return; // ще нема з чим зберігати чернетку

    const num = (id) => {
      const v = parseFloat(document.getElementById(id)?.value);
      return isNaN(v) ? null : v;
    };

    const onBaseOnly = document.getElementById('on_base_only').checked;
    const tracksMotoHours = !onBaseOnly && tracksMotoHoursMap[equipmentId] !== false;
    const tracksOdometer = !onBaseOnly && tracksOdometerMap[equipmentId] === true;
    const hasBreakdown = document.getElementById('has_breakdown').checked;
    const transportedPeople = document.getElementById('transported_people').checked;

    const draftPayload = {
      work_date: document.getElementById('work_date').value || today,
      operator_id: user.id,
      equipment_id: equipmentId,
      object_id: objectId,
      customer_name: document.getElementById('customer_name').value.trim() || null,
      responsible_id: document.getElementById('responsible_id').value || null,
      start_hours: tracksMotoHours ? num('start_hours') : null,
      end_hours: tracksMotoHours ? num('end_hours') : null,
      start_hours_note: document.getElementById('start_hours_note')?.value.trim() || null,
      start_km: tracksOdometer ? num('start_km') : null,
      end_km: tracksOdometer ? num('end_km') : null,
      start_time: document.getElementById('start_time').value || null,
      end_time: document.getElementById('end_time').value || null,
      lunch_hours: num('lunch_hours') || 0,
      travel_hours: num('travel_hours') || 0,
      travel_route: document.getElementById('travel_route').value || null,
      transported_people: transportedPeople,
      transport_route: transportedPeople ? (document.getElementById('transport_route').value.trim() || null) : null,
      transport_hours: transportedPeople ? num('transport_hours') : null,
      downtime_hours: num('downtime_hours') || 0,
      downtime_reason: document.getElementById('downtime_reason').value || null,
      fueling_liters: num('fueling_liters') || 0,
      fueling_source: document.getElementById('fueling_source').value || null,
      has_breakdown: hasBreakdown,
      breakdown_description: hasBreakdown ? (document.getElementById('breakdown_description').value.trim() || null) : null,
      repair_hours: hasBreakdown ? (num('repair_hours') || 0) : 0,
      operator_note: document.getElementById('operator_note').value || null,
      status: 'Чернетка'
    };

    try {
      setDraftStatus('Збереження чернетки...');
      if (currentDraftId) {
        await supaUpdate('daily_reports', `id=eq.${currentDraftId}`, draftPayload);
      } else {
        currentDraftId = await supaRpc('next_id', { p_prefix: 'REP' });
        draftPayload.id = currentDraftId;
        draftPayload.submitted_at = null;
        await supaInsert('daily_reports', draftPayload);
      }
      const now = new Date();
      setDraftStatus(`Чернетку збережено о ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    } catch (e) {
      setDraftStatus('Не вдалось зберегти чернетку (перевір з\'єднання).');
    }
  }

  function scheduleAutosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(saveDraft, 2500);
  }

  // Автозбереження вимкнене для редагування вже поданого (і відхиленого)
  // звіту — це не чернетка, а реальний звіт, що чекає повторної відправки
  // через звичайний флоу коригування, без проміжного статусу "Чернетка".
  if (!isEdit) {
    document.getElementById('report-form').addEventListener('input', scheduleAutosave);
    document.getElementById('report-form').addEventListener('change', scheduleAutosave);
  }

  const deleteDraftBtn = document.getElementById('delete-draft-btn');
  if (deleteDraftBtn) {
    deleteDraftBtn.addEventListener('click', async () => {
      if (!confirm('Видалити цю чернетку без збереження?')) return;
      deleteDraftBtn.disabled = true;
      deleteDraftBtn.textContent = 'Видалення...';
      try {
        await supaDelete('daily_reports', `id=eq.${currentDraftId}`);
        renderOperatorHome(user);
      } catch (e) {
        alert('Помилка видалення: ' + e.message);
        deleteDraftBtn.disabled = false;
        deleteDraftBtn.textContent = '🗑 Видалити чернетку';
      }
    });
  }

  // Відправка форми — валідація і перехід на екран перевірки звіту
  // (запис у базу відбувається пізніше, з екрана перегляду).
  document.getElementById('report-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearTimeout(autosaveTimer);
    const submitBtn = document.getElementById('submit-btn');
    const errorBox = document.getElementById('error-box');
    errorBox.classList.add('hidden');

    try {
      const responsibleId = document.getElementById('responsible_id').value;
      if (!responsibleId) {
        throw new Error('Оберіть відповідального за цей об\'єкт.');
      }

      const equipmentId = document.getElementById('equipment_id').value;
      const onBaseOnly = document.getElementById('on_base_only').checked;
      const tracksMotoHours = !onBaseOnly && tracksMotoHoursMap[equipmentId] !== false;

      let startHoursVal = null;
      let endHoursVal = null;
      let startHoursNote = null;

      if (tracksMotoHours) {
        const discrepancyVisible = !document.getElementById('discrepancy-box').classList.contains('hidden');
        const noteVal = document.getElementById('start_hours_note').value.trim();
        if (discrepancyVisible && !noteVal) {
          throw new Error('Вкажи причину розбіжності мотогодин перед відправкою.');
        }

        startHoursVal = parseFloat(document.getElementById('start_hours').value);
        endHoursVal = parseFloat(document.getElementById('end_hours').value);
        if (endHoursVal < startHoursVal) {
          throw new Error('Кінцеві мотогодини не можуть бути меншими за початкові.');
        }
        startHoursNote = discrepancyVisible ? noteVal : null;
      }

      const tracksOdometer = !onBaseOnly && tracksOdometerMap[equipmentId] === true;
      let startKmVal = null;
      let endKmVal = null;

      if (tracksOdometer) {
        startKmVal = parseFloat(document.getElementById('start_km').value);
        endKmVal = parseFloat(document.getElementById('end_km').value);
        if (isNaN(startKmVal) || isNaN(endKmVal)) {
          throw new Error('Вкажи показники спідометра (початок і кінець).');
        }
        if (endKmVal < startKmVal) {
          throw new Error('Кінцеві кілометри не можуть бути меншими за початкові.');
        }
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

      const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
      const startTime = document.getElementById('start_time').value.trim();
      const endTime = document.getElementById('end_time').value.trim();
      if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
        throw new Error('Вкажи час початку і кінця роботи у форматі ГГ:ХВ (наприклад, 07:45).');
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Перевірка...';
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
        equipment_id: equipmentId,
        object_id: document.getElementById('object_id').value,
        customer_name: document.getElementById('customer_name').value.trim() || null,
        responsible_id: responsibleId,
        start_hours: startHoursVal,
        end_hours: endHoursVal,
        start_hours_note: startHoursNote,
        start_km: startKmVal,
        end_km: endKmVal,
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

      renderReportPreview(user, payload, isEdit, existingReport, equipmentName, objectName, currentDraftId);
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

function renderReportPreview(user, payload, isEdit, existingReport, equipmentName, objectName, draftId = null) {
  const hasDraftRow = !isEdit && draftId !== null; // рядок-чернетка вже існує в БД — потрібен UPDATE, а не новий INSERT
  const totalMotoHours = (payload.start_hours !== null && payload.end_hours !== null)
    ? Math.round((payload.end_hours - payload.start_hours) * 100) / 100
    : null;
  const totalKm = (payload.start_km !== null && payload.end_km !== null)
    ? Math.round((payload.end_km - payload.start_km) * 100) / 100
    : null;

  const displayReport = {
    ...payload,
    total_moto_hours: totalMotoHours,
    total_km: totalKm,
    users: { full_name: user.full_name },
    equipment: { name: equipmentName },
    objects: { name: objectName },
    submitted_at: new Date().toISOString()
  };

  app.innerHTML = `
    ${topbarHtml('Перевірка звіту', roleSubtitle(user))}
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

  const goBackToForm = () => renderOperatorForm(user, existingReport, payload, draftId);
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
      } else if (hasDraftRow) {
        // Чернетка (продовжена вручну або створена автозбереженням) перетворюється
        // на реально поданий звіт — той самий рядок, без запису в report_edit_log
        // (це не коригування відхиленого звіту).
        reportId = draftId;
        dbPayload.status = 'Очікує відповідального';
        dbPayload.final_closed_at = null;
        dbPayload.submitted_at = new Date().toISOString();

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

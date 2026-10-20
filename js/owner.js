// ---------- 👑 Власник системи: екран "Журнал" (з 2026-10-20) ----------
// Лише для власника (users.is_owner, USR-001). Дві вкладки:
//   "Зміни" — таблиця change_log: хто, коли, що створив / подав / змінив /
//             видалив ("було → стало"; при видаленні — повна копія);
//   "Входи" — успішні входи і відмови входу (чужі, неактивні, підроблені) —
//             функція nab_owner_logins.
// Читати журнал база дозволяє лише власнику (RLS / перевірка у функції), тож
// навіть якщо хтось інший відкриє цей екран — побачить помилку, а не дані.
// Excel — тип вивантаження "Журнал змін" (лише власник, тригер export_files).

const JOURNAL_SCREEN_LIMIT = 300;   // записів на екрані
const JOURNAL_EXCEL_LIMIT = 5000;   // записів у файлі

const JOURNAL_TABLES = {
  daily_reports: 'Звіти',
  approvals: 'Підтвердження',
  report_edit_log: 'Виправлення звітів',
  users: 'Користувачі',
  equipment: 'Техніка',
  objects: 'Об\'єкти',
  customers: 'Замовники',
  object_responsible: 'Відповідальні за об\'єкти',
  user_equipment: 'Закріплення техніки',
  export_files: 'Вивантаження Excel',
  incidents: 'Поломки',
  maintenance: 'ТО',
  menu_buttons: 'Кнопки меню',
  roles: 'Ролі'
};

const JOURNAL_ACTIONS = ['Створено', 'Подано', 'Змінено', 'Видалено'];

// Зрозумілі назви найчастіших полів (решта — як у базі)
const JOURNAL_FIELDS = {
  status: 'Статус', full_name: 'ПІБ', role: 'Роль', telegram_id: 'Telegram ID', phone: 'Телефон',
  name: 'Назва', code: 'Код / номер', edrpou: 'ЄДРПОУ', customer_id: 'Замовник', is_owner: 'Власник',
  work_date: 'Дата роботи', operator_id: 'Оператор', equipment_id: 'Техніка', object_id: 'Об\'єкт',
  responsible_id: 'Відповідальний', user_id: 'Користувач',
  start_hours: 'М/г початок', end_hours: 'М/г кінець', start_km: 'Км початок', end_km: 'Км кінець',
  confirmed_hours: 'Підтверджені м/г', confirmed_km: 'Підтверджені км',
  start_time: 'Початок', end_time: 'Кінець', total_person_hours: 'Час роботи',
  fueling: 'Заправка', result: 'Результат', comment: 'Коментар', note: 'Примітка',
  export_type: 'Тип вивантаження', file_name: 'Файл'
};

const journalState = { tab: 'changes', from: null, to: null, actor: '', table: '', action: '' };
let journalLoadSeq = 0;
let journalUsers = [];

// Період з урахуванням сьогодні: today / week (7 днів) / month (30 днів)
function journalPeriod(kind) {
  const today = new Date();
  const from = new Date(today);
  if (kind === 'week') from.setDate(from.getDate() - 6);
  if (kind === 'month') from.setDate(from.getDate() - 29);
  return { from: isoDateLocal(from), to: isoDateLocal(today) };
}

// Межі періоду для бази: з 00:00 першого дня до 00:00 дня після останнього (місцевий час)
function journalRange(from, to) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return { fromIso: start.toISOString(), toIso: end.toISOString() };
}

function journalFieldLabel(key) {
  return JOURNAL_FIELDS[key] || key;
}

function journalValue(v, maxLen = 0) {
  if (v === null || v === undefined || v === '') return '—';
  let s;
  if (typeof v === 'boolean') s = v ? 'так' : 'ні';
  else if (typeof v === 'object') s = JSON.stringify(v);
  else s = String(v);
  return maxLen && s.length > maxLen ? s.slice(0, maxLen) + '…' : s;
}

// Список "поле: було → стало" (Змінено) або "поле: значення" (інші дії)
function journalLines(row) {
  const ch = row.changes || {};
  if (row.action === 'Змінено') {
    return Object.keys(ch).map(k => ({
      label: journalFieldLabel(k),
      text: `${journalValue(ch[k]?.['було'])} → ${journalValue(ch[k]?.['стало'])}`
    }));
  }
  return Object.keys(ch)
    .filter(k => ch[k] !== null && ch[k] !== '' && ch[k] !== undefined)
    .map(k => ({ label: journalFieldLabel(k), text: journalValue(ch[k]) }));
}

function journalDetailsText(row) {
  return journalLines(row).map(l => `${l.label}: ${l.text}`).join('; ');
}

// Короткий опис запису для картки: ПІБ / назва / дата роботи
function journalRecordTitle(row) {
  const ch = row.changes || {};
  const src = row.action === 'Змінено' ? {} : ch;
  return src.full_name || src.name || (src.work_date ? `дата ${formatDateUA(String(src.work_date).slice(0, 10))}` : '');
}

function journalChipClass(action) {
  if (action === 'Видалено' || action === 'Відмова входу') return 'status-corr';
  if (action === 'Змінено') return 'status-wait';
  return 'status-final';
}

// ---------- Екран ----------

async function renderOwnerJournal(user) {
  if (!user.is_owner) {
    renderAdminHome(user);
    return;
  }
  if (!journalState.from) Object.assign(journalState, journalPeriod('week'));

  if (!journalUsers.length) {
    try {
      journalUsers = await supaGet('users', 'select=id,full_name,role&order=full_name.asc');
    } catch (e) {
      journalUsers = [];
    }
  }

  const isChanges = journalState.tab === 'changes';
  const tabBtn = (tab, label) =>
    `<button type="button" class="${journalState.tab === tab ? 'btn-confirm' : 'btn-reject'}" style="padding:8px 4px" data-jl-tab="${tab}">${label}</button>`;

  const filters = isChanges ? `
    <div class="section" style="padding-bottom:12px">
      <label>Хто</label>
      <select id="jl-actor">
        <option value="">Усі</option>
        <option value="system"${journalState.actor === 'system' ? ' selected' : ''}>Make / система</option>
        ${journalUsers.map(u => `<option value="${escHtml(u.id)}"${journalState.actor === u.id ? ' selected' : ''}>${escHtml(u.full_name)} (${escHtml(u.role)})</option>`).join('')}
      </select>
      <div class="row2" style="margin-top:8px">
        <div>
          <label>Що</label>
          <select id="jl-table">
            <option value="">Усе</option>
            ${Object.entries(JOURNAL_TABLES).map(([k, v]) => `<option value="${k}"${journalState.table === k ? ' selected' : ''}>${escHtml(v)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label>Дія</label>
          <select id="jl-action">
            <option value="">Усі</option>
            ${JOURNAL_ACTIONS.map(a => `<option value="${a}"${journalState.action === a ? ' selected' : ''}>${a}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>` : '';

  app.innerHTML = `
    ${topbarHtml('📜 Журнал', 'Лише власник системи')}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-menu-journal" style="margin:0 0 14px">← Назад до меню</div>
      <div style="display:flex;gap:6px;margin-bottom:12px">
        ${tabBtn('changes', '✏️ Зміни')}
        ${tabBtn('logins', '🔑 Входи')}
      </div>
      <div class="section" style="padding-bottom:12px">
        <div style="display:flex;gap:6px">
          <button type="button" class="btn-reject" style="padding:8px 4px" data-jl-quick="today">Сьогодні</button>
          <button type="button" class="btn-reject" style="padding:8px 4px" data-jl-quick="week">7 днів</button>
          <button type="button" class="btn-reject" style="padding:8px 4px" data-jl-quick="month">30 днів</button>
        </div>
        <div class="row2" style="margin-top:8px">
          <div>
            <label>З</label>
            <input type="date" id="jl-from" value="${journalState.from}">
          </div>
          <div>
            <label>По</label>
            <input type="date" id="jl-to" value="${journalState.to}">
          </div>
        </div>
      </div>
      ${filters}
      <button type="button" class="btn-confirm" id="jl-show" style="width:100%;margin-bottom:14px">Показати</button>
      <div id="jl-list" class="msg">Завантаження...</div>
    </div>
  `;

  document.getElementById('back-to-menu-journal').addEventListener('click', () => renderAdminHome(user));

  document.querySelectorAll('[data-jl-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      readJournalForm();
      journalState.tab = btn.getAttribute('data-jl-tab');
      renderOwnerJournal(user);
    });
  });

  document.querySelectorAll('[data-jl-quick]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = journalPeriod(btn.getAttribute('data-jl-quick'));
      document.getElementById('jl-from').value = p.from;
      document.getElementById('jl-to').value = p.to;
      showJournal(user);
    });
  });

  document.getElementById('jl-show').addEventListener('click', () => showJournal(user));
  ['jl-actor', 'jl-table', 'jl-action'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => showJournal(user));
  });

  showJournal(user);
}

function readJournalForm() {
  const val = id => document.getElementById(id)?.value ?? null;
  journalState.from = val('jl-from') || journalState.from;
  journalState.to = val('jl-to') || journalState.to;
  if (journalState.tab === 'changes') {
    journalState.actor = val('jl-actor') ?? '';
    journalState.table = val('jl-table') ?? '';
    journalState.action = val('jl-action') ?? '';
  }
}

function showJournal(user) {
  readJournalForm();
  if (!journalState.from || !journalState.to) {
    alert('Вкажи дати "з" і "по".');
    return;
  }
  if (journalState.from > journalState.to) {
    alert('Дата "з" не може бути пізнішою за "по".');
    return;
  }
  if (journalState.tab === 'changes') loadJournalChanges(user);
  else loadJournalLogins(user);
}

// Запит до change_log з фільтрами
function journalChangesQuery(limit) {
  const { fromIso, toIso } = journalRange(journalState.from, journalState.to);
  let q = 'select=id,changed_at,actor_id,actor_name,source,table_name,record_id,action,changes'
    + `&changed_at=gte.${encodeURIComponent(fromIso)}&changed_at=lt.${encodeURIComponent(toIso)}`
    + `&order=changed_at.desc&limit=${limit}`;
  if (journalState.actor === 'system') q += '&actor_id=is.null';
  else if (journalState.actor) q += `&actor_id=eq.${encodeURIComponent(journalState.actor)}`;
  if (journalState.table) q += `&table_name=eq.${encodeURIComponent(journalState.table)}`;
  if (journalState.action) q += `&action=eq.${encodeURIComponent(journalState.action)}`;
  return q;
}

function journalPeriodText() {
  return `${formatDateUA(journalState.from)} – ${formatDateUA(journalState.to)}`;
}

async function loadJournalChanges(user) {
  const listEl = document.getElementById('jl-list');
  const seq = ++journalLoadSeq;
  listEl.className = 'msg';
  listEl.textContent = 'Завантаження...';

  let rows;
  try {
    rows = await supaGet('change_log', journalChangesQuery(JOURNAL_SCREEN_LIMIT));
  } catch (e) {
    if (seq !== journalLoadSeq) return;
    listEl.textContent = 'Помилка завантаження: ' + e.message;
    return;
  }
  if (seq !== journalLoadSeq) return;

  if (!rows || rows.length === 0) {
    listEl.textContent = `За ${journalPeriodText()} змін немає.`;
    return;
  }

  listEl.className = '';
  listEl.innerHTML = `
    <div class="meta" style="margin:0 0 8px">Період: ${journalPeriodText()} · записів: ${rows.length}${rows.length >= JOURNAL_SCREEN_LIMIT ? ` (показано останні ${JOURNAL_SCREEN_LIMIT} — звузь період або фільтр; у Excel — до ${JOURNAL_EXCEL_LIMIT})` : ''}</div>
    <button type="button" class="btn-add-top" id="jl-excel-btn">📥 Надіслати в Telegram</button>
    <div class="hint-inline" style="text-align:center;margin:-10px 0 14px">Файл Excel прийде вам у чат з ботом.</div>
    ${rows.map(journalChangeCardHtml).join('')}
  `;

  listEl.querySelectorAll('[data-jl-more]').forEach(btn => {
    btn.addEventListener('click', () => {
      const box = document.getElementById(`jl-more-${btn.getAttribute('data-jl-more')}`);
      const hidden = box.classList.toggle('hidden');
      btn.textContent = hidden ? 'Деталі ▾' : 'Сховати ▴';
    });
  });

  const excelBtn = document.getElementById('jl-excel-btn');
  excelBtn.addEventListener('click', () => exportJournalChangesExcel(excelBtn, user));
}

function journalChangeCardHtml(row) {
  const lines = journalLines(row);
  const title = journalRecordTitle(row);
  const summary = row.action === 'Змінено'
    ? lines.slice(0, 3).map(l => `${escHtml(l.label)}: ${escHtml(journalValue(l.text, 80))}`).join('<br>')
      + (lines.length > 3 ? `<br><span class="meta">…ще полів: ${lines.length - 3}</span>` : '')
    : '';
  const source = row.source && row.source !== 'Mini App' ? ` · ${escHtml(row.source)}` : '';

  return `
    <div class="report-card">
      <div class="top-row">
        <span class="date">${formatDateTimeUA(row.changed_at)}</span>
        <span class="status-chip ${journalChipClass(row.action)}">${escHtml(row.action)}</span>
      </div>
      <div class="meta">${escHtml(row.actor_name || '—')}${source}</div>
      <div class="detail-row"><b>${escHtml(JOURNAL_TABLES[row.table_name] || row.table_name)}</b> ${escHtml(row.record_id || '')}${title ? ' · ' + escHtml(title) : ''}</div>
      ${summary ? `<div class="detail-row">${summary}</div>` : ''}
      <button type="button" class="btn-reject" style="width:100%;margin-top:10px;padding:8px" data-jl-more="${row.id}">Деталі ▾</button>
      <div class="hidden" id="jl-more-${row.id}" style="margin-top:8px">
        ${lines.map(l => `<div class="detail-row">${escHtml(l.label)}: ${escHtml(l.text)}</div>`).join('') || '<div class="detail-row">—</div>'}
      </div>
    </div>
  `;
}

async function loadJournalLogins(user) {
  const listEl = document.getElementById('jl-list');
  const seq = ++journalLoadSeq;
  listEl.className = 'msg';
  listEl.textContent = 'Завантаження...';

  let rows;
  try {
    const { fromIso, toIso } = journalRange(journalState.from, journalState.to);
    rows = await supaRpc('nab_owner_logins', { p_from: fromIso, p_to: toIso });
  } catch (e) {
    if (seq !== journalLoadSeq) return;
    listEl.textContent = 'Помилка завантаження: ' + e.message;
    return;
  }
  if (seq !== journalLoadSeq) return;

  if (!rows || rows.length === 0) {
    listEl.textContent = `За ${journalPeriodText()} входів немає.`;
    return;
  }

  const failed = rows.filter(r => r.kind !== 'Вхід').length;
  listEl.className = '';
  listEl.innerHTML = `
    <div class="meta" style="margin:0 0 8px">Період: ${journalPeriodText()} · входів: ${rows.length - failed} · відмов: <b${failed ? ' style="color:var(--danger)"' : ''}>${failed}</b></div>
    <button type="button" class="btn-add-top" id="jl-excel-btn">📥 Надіслати в Telegram</button>
    <div class="hint-inline" style="text-align:center;margin:-10px 0 14px">Файл Excel прийде вам у чат з ботом.</div>
    ${rows.map(r => `
      <div class="report-card"${r.kind !== 'Вхід' ? ' style="border-left-color:var(--danger)"' : ''}>
        <div class="top-row">
          <span class="date">${formatDateTimeUA(r.at)}</span>
          <span class="status-chip ${journalChipClass(r.kind)}">${escHtml(r.kind)}</span>
        </div>
        <div class="meta">${escHtml(r.user_name || '—')}</div>
        ${r.details ? `<div class="detail-row">${escHtml(r.details)}</div>` : ''}
      </div>
    `).join('')}
  `;

  const excelBtn = document.getElementById('jl-excel-btn');
  excelBtn.addEventListener('click', () => exportJournalLoginsExcel(excelBtn, user, rows));
}

// ---------- Excel ----------

function exportJournalChangesExcel(btn, user) {
  runExport(btn, async () => {
    const rows = await supaGet('change_log', journalChangesQuery(JOURNAL_EXCEL_LIMIT));
    const ExcelJS = await loadExcelJsLib();
    const wb = new ExcelJS.Workbook();
    wb.creator = 'НАБ ТехОблік';
    wb.created = new Date();

    const filterText = [
      journalState.actor === 'system' ? 'хто: Make / система'
        : journalState.actor ? `хто: ${(journalUsers.find(u => u.id === journalState.actor) || {}).full_name || journalState.actor}` : '',
      journalState.table ? `що: ${JOURNAL_TABLES[journalState.table]}` : '',
      journalState.action ? `дія: ${journalState.action}` : ''
    ].filter(Boolean).join(' · ');

    xlStyledSheet(wb, 'Зміни', {
      title: 'Журнал змін',
      subtitle: filterText ? `Фільтр: ${filterText}` : 'Усі зміни (без чернеток і технічних записів)',
      note: `Період: ${journalPeriodText()} · записів: ${rows.length}${rows.length >= JOURNAL_EXCEL_LIMIT ? ` (останні ${JOURNAL_EXCEL_LIMIT})` : ''}`,
      columns: [
        { header: 'Дата і час', width: 17, type: 'text', get: r => formatDateTimeUA(r.changed_at) },
        { header: 'Хто', width: 28, type: 'name', get: r => r.actor_name || '' },
        { header: 'Джерело', width: 14, type: 'text', get: r => r.source || '' },
        { header: 'Що', width: 20, type: 'text', get: r => JOURNAL_TABLES[r.table_name] || r.table_name },
        { header: 'Запис', width: 13, type: 'text', get: r => r.record_id || '' },
        { header: 'Дія', width: 11, type: 'text', get: r => r.action,
          fillOf: r => (r.action === 'Видалено' ? XL.statusCorr : r.action === 'Змінено' ? XL.statusWait : XL.statusFinal) },
        { header: 'Деталі', width: 80, type: 'long', get: r => journalDetailsText(r) }
      ],
      rows
    });

    const buffer = await wb.xlsx.writeBuffer();
    await sendXlsxBufferToBot(buffer, {
      fileName: `Zhurnal_zmin_${journalState.from}_${journalState.to}.xlsx`,
      viewer: user,
      exportType: 'Журнал змін',
      from: journalState.from,
      to: journalState.to,
      caption: ['📜 Журнал змін', `📅 ${journalPeriodText()}`, filterText, `Записів: ${rows.length}`].filter(Boolean).join('\n')
    });
  });
}

function exportJournalLoginsExcel(btn, user, rows) {
  runExport(btn, async () => {
    const ExcelJS = await loadExcelJsLib();
    const wb = new ExcelJS.Workbook();
    wb.creator = 'НАБ ТехОблік';
    wb.created = new Date();
    const failed = rows.filter(r => r.kind !== 'Вхід').length;

    xlStyledSheet(wb, 'Входи', {
      title: 'Журнал входів',
      subtitle: 'Вхід — пропуск видано; Відмова входу — немає в системі, неактивний, підроблені або застарілі дані Telegram',
      note: `Період: ${journalPeriodText()} · входів: ${rows.length - failed} · відмов: ${failed}`,
      columns: [
        { header: 'Дата і час', width: 17, type: 'text', get: r => formatDateTimeUA(r.at) },
        { header: 'Хто', width: 32, type: 'name', get: r => r.user_name || '' },
        { header: 'Подія', width: 16, type: 'text', get: r => r.kind,
          fillOf: r => (r.kind === 'Вхід' ? XL.statusFinal : XL.statusCorr) },
        { header: 'Деталі', width: 60, type: 'long', get: r => r.details || '' }
      ],
      rows
    });

    const buffer = await wb.xlsx.writeBuffer();
    await sendXlsxBufferToBot(buffer, {
      fileName: `Zhurnal_vhodiv_${journalState.from}_${journalState.to}.xlsx`,
      viewer: user,
      exportType: 'Журнал змін',
      from: journalState.from,
      to: journalState.to,
      caption: ['🔑 Журнал входів', `📅 ${journalPeriodText()}`, `Входів: ${rows.length - failed} · відмов: ${failed}`].join('\n')
    });
  });
}

// ---------- Екрани ролі "Обліковець" ----------
// Обліковець переглядає і звіряє звіти операторів. Нічого не погоджує,
// не повертає на коригування і не керує довідниками.
//
// Меню — тут. Два екрани спільні з адміністратором (admin.js):
//   renderAdminPendingReports(user)  — "Непідтверджені звіти" (лише перегляд)
//   renderAdminClosedReports(user)   — "Усі закриті звіти"
// "Звіт по об'єкту" в обліковця — ВЛАСНИЙ екран (renderMultiObjectReport,
// нижче): один або кілька об'єктів галочками, техніка зведена
// (рішення 2026-09-24: замість окремого "Зведеного", щоб не було дублів).
// Адмін-екран renderObjectReport обліковцю більше не показується.
// Кнопка "← Назад до меню" на цих екранах викликає backToRoleMenu(user) —
// обліковець повертається сюди, адміністратор — у своє меню.
// Сповіщень у Telegram обліковець не отримує (рішення 2026-09-24).

// Повернення в головне меню своєї ролі (для спільних екранів admin.js)
function backToRoleMenu(user) {
  if (user.role === 'Обліковець') {
    renderAccountantHome(user);
  } else {
    renderAdminHome(user);
  }
}

// ---------- Головне меню обліковця ----------

function renderAccountantHome(user) {
  app.innerHTML = `
    ${topbarHtml('Головне меню', roleSubtitle(user))}
    <div class="menu-list">
      <button class="menu-btn" id="btn-acc-pending">
        <span class="emoji">⏳</span>
        <span>
          Непідтверджені звіти
          <span class="sub">По всій компанії, лише перегляд</span>
        </span>
      </button>
      <button class="menu-btn" id="btn-acc-closed">
        <span class="emoji">📊</span>
        <span>
          Усі закриті звіти
          <span class="sub">Фінально підтверджені звіти по всій компанії</span>
        </span>
      </button>
      <button class="menu-btn" id="btn-acc-object-report">
        <span class="emoji">🏗️</span>
        <span>
          Звіт по об'єкту
          <span class="sub">Один або кілька об'єктів за день / період, техніка зведено, Excel у Telegram</span>
        </span>
      </button>
    </div>
  `;
  document.getElementById('btn-acc-pending').addEventListener('click', () => renderAdminPendingReports(user));
  document.getElementById('btn-acc-closed').addEventListener('click', () => renderAdminClosedReports(user));
  document.getElementById('btn-acc-object-report').addEventListener('click', () => renderMultiObjectReport(user));
}

// ======================================================
// ЗВІТ ПО ОБ'ЄКТУ ДЛЯ ОБЛІКОВЦЯ (один або кілька об'єктів, 2026-09-24)
// Обліковець вибирає день або період і один чи кілька об'єктів (галочками;
// у списку лише об'єкти, де за період є звіти). Excel:
//   "Техніка"         — одна техніка = один рядок по всіх вибраних об'єктах
//                       і операторах (лише фінально підтверджені звіти);
//   "По об'єктах"     — підсумок по кожному об'єкту (підтверджені);
//   "Звіти"           — кожен підтверджений звіт окремим рядком;
//   "Не підтверджені" — чернетки, очікують відповідального, повернені на
//                       коригування (окремо, у підсумки не входять).
// Тип у журналі export_files — "Звіт по об'єкту" (дозволений обліковцю).
// ======================================================

const MULTI_CONFIRMED_STATUS = 'Фінально підтверджено';
let multiLoadSeq = 0;

function objectDisplayName(obj) {
  if (!obj) return '—';
  return obj.customers?.name ? `${obj.name} (${obj.customers.name})` : obj.name;
}

async function renderMultiObjectReport(user) {
  app.innerHTML = `
    ${topbarHtml("Звіт по об'єкту", roleSubtitle(user))}
    <div class="wrap" style="padding-top:14px">
      <div class="back-link" id="back-to-menu-multi" style="margin:0 0 14px">← Назад до меню</div>
      ${periodPickerHtml('mo')}
      <div id="mo-body" class="msg">Завантаження...</div>
    </div>
  `;
  document.getElementById('back-to-menu-multi').addEventListener('click', () => renderAccountantHome(user));

  wirePeriodPicker('mo', (from, to) => loadMultiObjectPeriod(user, from, to));
  // За замовчуванням — вчорашній день (типовий сценарій: звірка за день)
  const yesterdayBtn = document.querySelector('[data-mo-quick="yesterday"]');
  if (yesterdayBtn) yesterdayBtn.click();
}

async function loadMultiObjectPeriod(user, from, to) {
  const seq = ++multiLoadSeq;
  const bodyEl = document.getElementById('mo-body');
  if (!bodyEl) return;
  bodyEl.className = 'msg';
  bodyEl.textContent = 'Завантаження...';

  let reports;
  try {
    reports = await supaGet(
      'daily_reports',
      `work_date=gte.${from}&work_date=lte.${to}` +
      `&select=id,work_date,status,object_id,objects(id,name,customers(name)),equipment_id,equipment(name),` +
      `users!daily_reports_operator_id_fkey(full_name),total_moto_hours,total_person_hours,travel_hours,travel_route,operator_note` +
      `&order=work_date.asc`
    );
  } catch (e) {
    if (seq !== multiLoadSeq) return;
    bodyEl.textContent = 'Помилка завантаження: ' + e.message;
    return;
  }
  if (seq !== multiLoadSeq) return;

  const list = reports || [];
  if (list.length === 0) {
    bodyEl.textContent = `За ${formatDateUA(from)} – ${formatDateUA(to)} звітів немає.`;
    return;
  }

  // Об'єкти, де за період є звіти
  const objMap = new Map();
  list.forEach(r => {
    const id = r.object_id || '—';
    if (!objMap.has(id)) objMap.set(id, { id, name: objectDisplayName(r.objects), confirmed: 0, other: 0 });
    const o = objMap.get(id);
    if (r.status === MULTI_CONFIRMED_STATUS) o.confirmed += 1; else o.other += 1;
  });
  const objects = Array.from(objMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'uk'));

  bodyEl.className = '';
  bodyEl.innerHTML = `
    <div class="section" style="padding-bottom:8px;margin-top:0">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">
        <span class="meta" style="font-size:12.5px;color:var(--ink-soft)">Об'єкти з роботами (${objects.length}):</span>
        <button type="button" class="btn-reject" id="mo-toggle-all" style="flex:0 0 auto;padding:6px 10px">Зняти всі</button>
      </div>
      ${objects.map(o => `
        <label class="checkbox-row" style="margin:0;padding:8px 0;cursor:pointer">
          <input type="checkbox" class="mo-obj" value="${escHtml(o.id)}" checked>
          <span style="color:var(--ink);font-size:14px">
            ${escHtml(o.name)}
            <span style="display:block;font-size:11.5px;color:var(--ink-soft)">
              підтверджено: ${o.confirmed}${o.other ? ` · не підтверджено: ${o.other}` : ''}
            </span>
          </span>
        </label>
      `).join('')}
    </div>
    <div id="mo-summary"></div>
    <button type="button" class="btn-add-top" id="mo-excel-btn" style="margin-top:6px">📥 Надіслати в Telegram</button>
    <div class="hint-inline" style="text-align:center;margin:-10px 0 14px">Файл Excel прийде вам у чат з ботом.</div>
  `;

  const checks = () => Array.from(bodyEl.querySelectorAll('.mo-obj'));
  const selectedIds = () => checks().filter(c => c.checked).map(c => c.value);
  const toggleBtn = document.getElementById('mo-toggle-all');
  const excelBtn = document.getElementById('mo-excel-btn');

  const refresh = () => {
    const ids = new Set(selectedIds());
    const sel = list.filter(r => ids.has(r.object_id || '—'));
    const confirmed = sel.filter(r => r.status === MULTI_CONFIRMED_STATUS);
    const other = sel.filter(r => r.status !== MULTI_CONFIRMED_STATUS);
    const sum = (arr, k) => arr.reduce((a, r) => a + (Number(r[k]) || 0), 0);
    const allChecked = checks().every(c => c.checked);
    toggleBtn.textContent = allChecked ? 'Зняти всі' : 'Вибрати всі';
    excelBtn.disabled = ids.size === 0;

    document.getElementById('mo-summary').innerHTML = ids.size === 0
      ? `<div class="hint-inline" style="margin:4px 0 14px">Виберіть хоча б один об'єкт.</div>`
      : `
        <div class="report-card" style="border-left-color:var(--brand-yellow)">
          <div class="top-row">
            <span class="date">${formatDateUA(from)} – ${formatDateUA(to)}</span>
            <span class="status-chip status-final">Разом</span>
          </div>
          <div class="meta">Об'єктів: ${ids.size} · техніки: ${new Set(confirmed.map(r => r.equipment_id)).size} · підтверджених звітів: ${confirmed.length}</div>
          <div class="detail-row">Мотогодини: <b>${fmtNum(sum(confirmed, 'total_moto_hours'))}</b></div>
          <div class="detail-row">Людиногодини: <b>${fmtNum(sum(confirmed, 'total_person_hours'))}</b></div>
          <div class="detail-row">Перебазування: ${fmtNum(sum(confirmed, 'travel_hours'))} год</div>
          ${other.length ? `<div class="detail-row" style="color:var(--caution)">⏳ Не підтверджено (окремо, у підсумок не входить): ${other.length}</div>` : ''}
        </div>
      `;
  };

  checks().forEach(c => c.addEventListener('change', refresh));
  toggleBtn.addEventListener('click', () => {
    const allChecked = checks().every(c => c.checked);
    checks().forEach(c => { c.checked = !allChecked; });
    refresh();
  });
  excelBtn.addEventListener('click', () => {
    const ids = new Set(selectedIds());
    const sel = list.filter(r => ids.has(r.object_id || '—'));
    const chosen = objects.filter(o => ids.has(o.id));
    exportMultiObjectExcel(excelBtn, user, sel, chosen.map(o => o.id), chosen.map(o => o.name), from, to);
  });
  refresh();
}

function exportMultiObjectExcel(btn, user, sel, objectIds, objectNames, from, to) {
  runExport(btn, async () => {
    const ExcelJS = await loadExcelJsLib();
    const confirmed = sel.filter(r => r.status === MULTI_CONFIRMED_STATUS);
    const other = sel.filter(r => r.status !== MULTI_CONFIRMED_STATUS);

    const wb = buildMultiObjectWorkbook(ExcelJS, { confirmed, other, objectNames, from, to });

    const buffer = await wb.xlsx.writeBuffer();

    const sum = (arr, k) => arr.reduce((a, r) => a + (Number(r[k]) || 0), 0);
    const shortNames = objectNames.length <= 3 ? objectNames.join('; ') : `${objectNames.slice(0, 3).join('; ')} … (+${objectNames.length - 3})`;
    const single = objectIds.length === 1;
    const fileName = single
      ? `Zvit_obiekt_${String(objectIds[0]).replace(/[^A-Za-z0-9_-]/g, '')}_${from}_${to}.xlsx`
      : `Zvit_obiekty_${objectIds.length}_${from}_${to}.xlsx`;
    await sendXlsxBufferToBot(buffer, {
      fileName,
      viewer: user,
      exportType: "Звіт по об'єкту",
      from,
      to,
      caption: [
        single ? `🏗️ Звіт по об'єкту: ${objectNames[0]}` : `🏗️ Звіт по об'єктах (${objectNames.length}): ${shortNames}`,
        `📅 ${formatDateUA(from)} – ${formatDateUA(to)}`,
        `Техніки: ${new Set(confirmed.map(r => r.equipment_id)).size} · підтверджених звітів: ${confirmed.length}`,
        `Мотогодини: ${fmtNum(sum(confirmed, 'total_moto_hours'))} · людиногодини: ${fmtNum(sum(confirmed, 'total_person_hours'))}`,
        other.length ? `⏳ Не підтверджено (окремий аркуш): ${other.length}` : ''
      ].filter(Boolean).join('\n')
    });
  });
}

// Книга "Звіт по об'єкту" обліковця (оформлена, xl*-функції з admin.js)
function buildMultiObjectWorkbook(ExcelJS, { confirmed, other, objectNames, from, to }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'НАБ ТехОблік';
  wb.created = new Date();

  const period = from === to ? `Дата: ${formatDateUA(from)}` : `Період: ${formatDateUA(from)} – ${formatDateUA(to)}`;
  const note = `${period} · об'єктів: ${objectNames.length}`;
  const subtitle = `Об'єкти: ${objectNames.join('; ')}`;
  const objName = r => objectDisplayName(r.objects);
  const shortObj = r => r.objects?.name || '—';

  // Техніка — один рядок на техніку (усі об'єкти й оператори разом)
  const byEq = new Map();
  confirmed.forEach(r => {
    const k = r.equipment_id || '—';
    if (!byEq.has(k)) {
      byEq.set(k, { name: r.equipment?.name || '—', objects: new Set(), ops: new Set(), dates: new Set(), first: r.work_date, last: r.work_date, moto: 0, person: 0, travel: 0 });
    }
    const g = byEq.get(k);
    g.objects.add(shortObj(r));
    if (r.users?.full_name) g.ops.add(r.users.full_name);
    g.dates.add(r.work_date);
    if (r.work_date < g.first) g.first = r.work_date;
    if (r.work_date > g.last) g.last = r.work_date;
    g.moto += Number(r.total_moto_hours) || 0;
    g.person += Number(r.total_person_hours) || 0;
    g.travel += Number(r.travel_hours) || 0;
  });
  const eqRows = Array.from(byEq.values()).sort((a, b) => a.name.localeCompare(b.name, 'uk'));

  xlStyledSheet(wb, 'Техніка', {
    title: "Звіт по об'єкту — техніка (зведено)",
    subtitle,
    note: `${note} · одна техніка = один рядок · лише підтверджені звіти`,
    columns: [
      { header: 'Техніка', width: 28, type: 'name', get: g => g.name },
      { header: "Об'єкти", width: 36, type: 'long', get: g => Array.from(g.objects).join('; ') },
      { header: 'Оператори', width: 32, type: 'long', get: g => Array.from(g.ops).join('; ') },
      { header: 'Перша дата', width: 12, type: 'date', get: g => g.first },
      { header: 'Остання дата', width: 12, type: 'date', get: g => g.last },
      { header: 'Днів', width: 8, type: 'int', get: g => g.dates.size },
      { header: 'Мотогодини', width: 12, type: 'hours', get: g => g.moto, total: true },
      { header: 'Людиногодини', width: 13, type: 'hours', get: g => g.person, total: true },
      { header: 'Перебазування, год', width: 15, type: 'hours', get: g => g.travel, total: true }
    ],
    rows: eqRows,
    totalsLabel: 'РАЗОМ',
    freezeCols: 1
  });

  // По об'єктах
  const byObj = new Map();
  confirmed.forEach(r => {
    const k = r.object_id || '—';
    if (!byObj.has(k)) byObj.set(k, { name: objName(r), eq: new Set(), n: 0, moto: 0, person: 0, travel: 0 });
    const g = byObj.get(k);
    g.eq.add(r.equipment_id);
    g.n += 1;
    g.moto += Number(r.total_moto_hours) || 0;
    g.person += Number(r.total_person_hours) || 0;
    g.travel += Number(r.travel_hours) || 0;
  });
  const objRows = Array.from(byObj.values()).sort((a, b) => a.name.localeCompare(b.name, 'uk'));

  xlStyledSheet(wb, "По об'єктах", {
    title: "Звіт по об'єкту — по об'єктах",
    subtitle: "Скільки техніки й годин на кожному об'єкті",
    note: `${note} · лише підтверджені звіти`,
    columns: [
      { header: "Об'єкт (замовник)", width: 46, type: 'long', get: g => g.name },
      { header: 'Одиниць техніки', width: 11, type: 'int', get: g => g.eq.size },
      { header: 'Звітів', width: 8, type: 'int', get: g => g.n, total: true },
      { header: 'Мотогодини', width: 12, type: 'hours', get: g => g.moto, total: true },
      { header: 'Людиногодини', width: 13, type: 'hours', get: g => g.person, total: true },
      { header: 'Перебазування, год', width: 15, type: 'hours', get: g => g.travel, total: true }
    ],
    rows: objRows,
    totalsLabel: 'РАЗОМ',
    freezeCols: 1
  });

  const reportColumns = [
    { header: 'Дата', width: 11, type: 'date', get: r => r.work_date },
    { header: 'Звіт', width: 10, type: 'text', get: r => r.id },
    { header: 'Статус', width: 23, type: 'status', get: r => r.status },
    { header: "Об'єкт (замовник)", width: 40, type: 'long', get: r => objName(r) },
    { header: 'Техніка', width: 26, type: 'name', get: r => r.equipment?.name || '' },
    { header: 'Оператор', width: 24, type: 'name', get: r => r.users?.full_name || '' },
    { header: 'Мотогодини', width: 12, type: 'hours', get: r => r.total_moto_hours, total: true },
    { header: 'Людиногодини', width: 13, type: 'hours', get: r => r.total_person_hours, total: true },
    { header: 'Перебазування, год', width: 15, type: 'hours', get: r => r.travel_hours, total: true },
    { header: 'Маршрут перебазування', width: 26, type: 'long', get: r => r.travel_route || '' },
    { header: 'Примітка', width: 28, type: 'long', get: r => r.operator_note || '' }
  ];

  xlStyledSheet(wb, 'Звіти', {
    title: "Звіт по об'єкту — підтверджені звіти",
    subtitle: 'Кожен звіт окремим рядком',
    note,
    columns: reportColumns,
    rows: confirmed,
    totalsLabel: 'РАЗОМ',
    freezeCols: 1
  });

  if (other.length > 0) {
    xlStyledSheet(wb, 'Не підтверджені', {
      title: "Звіт по об'єкту — не підтверджені звіти",
      subtitle: 'Чернетки, очікують відповідального, повернені на коригування — у підсумки не входять',
      note,
      columns: reportColumns,
      rows: other,
      totalsLabel: 'РАЗОМ',
      freezeCols: 1
    });
  }

  return wb;
}

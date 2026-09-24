// ---------- Екрани ролі "Обліковець" ----------
// Обліковець переглядає і звіряє звіти операторів. Нічого не погоджує,
// не повертає на коригування і не керує довідниками.
//
// Меню — тут. Самі екрани спільні з адміністратором (admin.js):
//   renderAdminPendingReports(user)  — "Непідтверджені звіти" (лише перегляд)
//   renderAdminClosedReports(user)   — "Усі закриті звіти"
//   renderObjectReport(user)         — "Звіт по об'єкту" (+ Excel у бот;
//                                      тригер export_files дозволяє обліковцю;
//                                      формат файлу для обліковця — нижче,
//                                      exportObjectExcelAccountant)
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
          <span class="sub">Техніка й оператори на об'єкті за період, Excel у Telegram</span>
        </span>
      </button>
    </div>
  `;
  document.getElementById('btn-acc-pending').addEventListener('click', () => renderAdminPendingReports(user));
  document.getElementById('btn-acc-closed').addEventListener('click', () => renderAdminClosedReports(user));
  document.getElementById('btn-acc-object-report').addEventListener('click', () => renderObjectReport(user));
}

// ---------- Excel "Звіт по об'єкту" для обліковця ----------
// Відмінності від адмін-версії (рішення 2026-09-24):
//   - без аркуша "Разом";
//   - "Техніка" — ОДИН рядок на техніку за період (кілька операторів
//     зводяться докупи): перша/остання дата, днів, мотогодини,
//     людиногодини, перебазування;
//   - "Звіти" — кожен звіт окремим рядком, скорочений набір колонок.
// Дані — усі звіти об'єкта за період, крім чернеток (як і на екрані).
// Оформлення — ExcelJS (loadExcelJsLib / xlStyledSheet / sendXlsxBufferToBot
// з admin.js), як і в адмін-версії.

function exportObjectExcelAccountant(btn, user, objectId, objectName, from, to) {
  runExport(btn, async () => {
    const ExcelJS = await loadExcelJsLib();

    const reports = await supaGet(
      'daily_reports',
      `object_id=eq.${objectId}&work_date=gte.${from}&work_date=lte.${to}&status=neq.Чернетка` +
      `&select=id,work_date,status,customer_name,equipment_id,equipment(name),users!daily_reports_operator_id_fkey(full_name),` +
      `total_moto_hours,total_person_hours,travel_hours,travel_route,operator_note` +
      `&order=work_date.asc`
    );
    const list = reports || [];

    const equipmentRows = groupReportsByEquipment(list);
    const wb = buildAccountantObjectWorkbook(ExcelJS, { objectName, from, to, list, equipmentRows });
    const buffer = await wb.xlsx.writeBuffer();

    const r2 = n => Math.round(n * 100) / 100;
    const totalMoto = r2(equipmentRows.reduce((a, g) => a + g.moto, 0));
    const totalPerson = r2(equipmentRows.reduce((a, g) => a + g.person, 0));

    await sendXlsxBufferToBot(buffer, {
      fileName: `Zvit_obiekt_${String(objectId).replace(/[^A-Za-z0-9_-]/g, '')}_${from}_${to}.xlsx`,
      viewer: user,
      exportType: "Звіт по об'єкту",
      from,
      to,
      caption: [
        `🏗️ Звіт по об'єкту: ${objectName}`,
        `📅 ${formatDateUA(from)} – ${formatDateUA(to)}`,
        `Техніки: ${equipmentRows.length} · звітів: ${list.length}`,
        `Мотогодини: ${fmtNum(totalMoto)} · людиногодини: ${fmtNum(totalPerson)}`
      ].join('\n')
    });
  });
}

// Зведення звітів по техніці (незалежно від операторів)
function groupReportsByEquipment(list) {
  const byEquipment = new Map();
  list.forEach(r => {
    const key = r.equipment_id || '—';
    if (!byEquipment.has(key)) {
      byEquipment.set(key, {
        name: r.equipment?.name || '—',
        dates: new Set(),
        first: r.work_date,
        last: r.work_date,
        moto: 0,
        person: 0,
        travel: 0
      });
    }
    const g = byEquipment.get(key);
    g.dates.add(r.work_date);
    if (r.work_date < g.first) g.first = r.work_date;
    if (r.work_date > g.last) g.last = r.work_date;
    g.moto += Number(r.total_moto_hours) || 0;
    g.person += Number(r.total_person_hours) || 0;
    g.travel += Number(r.travel_hours) || 0;
  });
  return Array.from(byEquipment.values()).sort((a, b) => a.name.localeCompare(b.name, 'uk'));
}

// Книга обліковця (оформлена): аркуші "Техніка" і "Звіти"
function buildAccountantObjectWorkbook(ExcelJS, { objectName, from, to, list, equipmentRows }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'НАБ ТехОблік';
  wb.created = new Date();
  const period = `Період: ${formatDateUA(from)} – ${formatDateUA(to)}`;

  xlStyledSheet(wb, 'Техніка', {
    title: "Звіт по об'єкту — техніка",
    subtitle: objectName,
    note: `${period} · кілька операторів на одній техніці зведено в один рядок`,
    columns: [
      { header: 'Техніка', width: 30, type: 'name', get: g => g.name },
      { header: 'Перша дата', width: 12, type: 'date', get: g => g.first },
      { header: 'Остання дата', width: 12, type: 'date', get: g => g.last },
      { header: 'Днів', width: 8, type: 'int', get: g => g.dates.size },
      { header: 'Мотогодини', width: 12, type: 'hours', get: g => g.moto, total: true },
      { header: 'Людиногодини', width: 13, type: 'hours', get: g => g.person, total: true },
      { header: 'Перебазування, год', width: 15, type: 'hours', get: g => g.travel, total: true }
    ],
    rows: equipmentRows,
    totalsLabel: 'РАЗОМ',
    freezeCols: 1
  });

  xlStyledSheet(wb, 'Звіти', {
    title: "Звіт по об'єкту — усі звіти",
    subtitle: objectName,
    note: `${period} · чернетки не включено`,
    columns: [
      { header: 'Дата', width: 11, type: 'date', get: r => r.work_date },
      { header: 'Звіт', width: 10, type: 'text', get: r => r.id },
      { header: 'Статус', width: 23, type: 'status', get: r => r.status },
      { header: 'Техніка', width: 26, type: 'name', get: r => r.equipment?.name || '' },
      { header: 'Оператор', width: 26, type: 'name', get: r => r.users?.full_name || '' },
      { header: 'Замовник', width: 20, type: 'name', get: r => r.customer_name || '' },
      { header: 'Мотогодини', width: 12, type: 'hours', get: r => r.total_moto_hours, total: true },
      { header: 'Людиногодини', width: 13, type: 'hours', get: r => r.total_person_hours, total: true },
      { header: 'Перебазування, год', width: 15, type: 'hours', get: r => r.travel_hours, total: true },
      { header: 'Маршрут перебазування', width: 30, type: 'long', get: r => r.travel_route || '' },
      { header: 'Примітка', width: 32, type: 'long', get: r => r.operator_note || '' }
    ],
    rows: list,
    totalsLabel: 'РАЗОМ',
    freezeCols: 1
  });

  return wb;
}

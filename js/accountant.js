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
// Допоміжні loadXlsxLib / makeSheet / xNum / runExport / sendWorkbookToBot —
// з admin.js.

function exportObjectExcelAccountant(btn, user, objectId, objectName, from, to) {
  runExport(btn, async () => {
    const XLSX = await loadXlsxLib();

    const reports = await supaGet(
      'daily_reports',
      `object_id=eq.${objectId}&work_date=gte.${from}&work_date=lte.${to}&status=neq.Чернетка` +
      `&select=id,work_date,status,customer_name,equipment_id,equipment(name),users!daily_reports_operator_id_fkey(full_name),` +
      `total_moto_hours,total_person_hours,travel_hours,travel_route,operator_note` +
      `&order=work_date.asc`
    );
    const list = reports || [];

    // Зведення по техніці (незалежно від операторів)
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
    const r2 = n => Math.round(n * 100) / 100;
    const equipmentRows = Array.from(byEquipment.values())
      .sort((a, b) => a.name.localeCompare(b.name, 'uk'));

    const equipmentSheet = makeSheet(XLSX, equipmentRows, [
      { title: 'Техніка', get: g => g.name },
      { title: 'Перша дата', get: g => formatDateUA(g.first) },
      { title: 'Остання дата', get: g => formatDateUA(g.last) },
      { title: 'Днів', get: g => g.dates.size },
      { title: 'Мотогодини', get: g => r2(g.moto) },
      { title: 'Людиногодини', get: g => r2(g.person) },
      { title: 'Перебазування, год', get: g => r2(g.travel) }
    ]);

    const reportsSheet = makeSheet(XLSX, list, [
      { title: 'Дата', get: r => formatDateUA(r.work_date) },
      { title: 'Звіт', get: r => r.id },
      { title: 'Статус', get: r => r.status },
      { title: 'Техніка', get: r => r.equipment?.name || '' },
      { title: 'Оператор', get: r => r.users?.full_name || '' },
      { title: 'Замовник', get: r => r.customer_name || '' },
      { title: 'Мотогодини', get: r => xNum(r.total_moto_hours) },
      { title: 'Людиногодини', get: r => xNum(r.total_person_hours) },
      { title: 'Перебазування, год', get: r => xNum(r.travel_hours) },
      { title: 'Маршрут перебазування', get: r => r.travel_route || '' },
      { title: 'Примітка', get: r => r.operator_note || '' }
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, equipmentSheet, 'Техніка');
    XLSX.utils.book_append_sheet(wb, reportsSheet, 'Звіти');

    const totalMoto = r2(equipmentRows.reduce((a, g) => a + g.moto, 0));
    const totalPerson = r2(equipmentRows.reduce((a, g) => a + g.person, 0));

    await sendWorkbookToBot(XLSX, wb, {
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

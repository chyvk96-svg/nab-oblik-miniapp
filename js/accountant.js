// ---------- Екрани ролі "Обліковець" ----------
// Обліковець переглядає і звіряє звіти операторів. Нічого не погоджує,
// не повертає на коригування і не керує довідниками.
//
// Меню — тут. Самі екрани спільні з адміністратором (admin.js):
//   renderAdminPendingReports(user)  — "Непідтверджені звіти" (лише перегляд)
//   renderAdminClosedReports(user)   — "Усі закриті звіти"
//   renderObjectReport(user)         — "Звіт по об'єкту" (+ Excel у бот;
//                                      тригер export_files дозволяє обліковцю)
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

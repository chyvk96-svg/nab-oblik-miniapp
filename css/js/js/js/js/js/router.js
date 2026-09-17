// ---------- Точка входу: ідентифікація користувача і роутинг за роллю ----------

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

async function main() {
  const tgUser = tg.initDataUnsafe?.user;

  if (!tgUser) {
    renderMessage('Не вдалося визначити користувача. Відкрий цю сторінку через кнопку меню бота в Telegram.');
    return;
  }

  let users;
  try {
    users = await supaGet('users', `telegram_id=eq.${tgUser.id}&select=id,full_name,role,status`);
  } catch (e) {
    renderMessage('Помилка з\'єднання з базою даних: ' + e.message);
    return;
  }

  if (!users || users.length === 0) {
    renderMessage('Тебе не знайдено в системі. Зверніться до адміністратора.');
    return;
  }

  const currentUser = users[0];

  if (currentUser.status !== 'Активний') {
    renderMessage('Твій обліковий запис неактивний. Зверніться до адміністратора.');
    return;
  }

  if (currentUser.role === 'Оператор') {
    renderOperatorHome(currentUser);
  } else {
    renderMessage(`Роль "${currentUser.role}" поки не реалізована в цій версії Mini App. Скоро буде.`);
  }
}

main();

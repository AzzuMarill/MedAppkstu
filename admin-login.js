let tempToken = null;

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('adminLoginForm');
  const loginInput = document.getElementById('adminLogin');
  const passwordInput = document.getElementById('adminPassword');
  const message = document.getElementById('adminLoginMessage');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const login = loginInput.value.trim();
    const password = passwordInput.value.trim();

    if (!login || !password) {
      message.textContent = 'Заполните все поля';
      return;
    }

    try {
      const res = await fetch('https://medapp-to7o.onrender.com/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password })
      });

      const data = await res.json();

      if (!res.ok) {
        message.textContent = data.message || 'Ошибка входа';
        return;
      }

      tempToken = data.tempToken;
      showCodeModal();
    } catch (err) {
      console.error('Ошибка при входе:', err);
      message.textContent = 'Ошибка сервера';
    }
  });

  document.getElementById('verifyCodeBtn')?.addEventListener('click', submitTelegramCode);
  document.getElementById('cancelCodeBtn')?.addEventListener('click', closeModal);
});

function showCodeModal() {
  document.getElementById('codeModal').style.display = 'flex';
  document.getElementById('telegramCodeInput').value = '';
  document.getElementById('codeError').textContent = '';
}

function closeModal() {
  document.getElementById('codeModal').style.display = 'none';
}

function submitTelegramCode() {
  const code = document.getElementById('telegramCodeInput').value.trim();
  const error = document.getElementById('codeError');
  const message = document.getElementById('adminLoginMessage');

  if (!code) {
    error.textContent = 'Введите код';
    return;
  }

  fetch('https://medapp-to7o.onrender.com/api/admin-verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, tempToken })
  })
    .then(res => res.json().then(data => ({ res, data })))
    .then(({ res, data }) => {
      if (res.ok) {
        localStorage.setItem('role', 'admin');
        localStorage.setItem('userId', document.getElementById('adminLogin').value.trim());
        window.location.href = 'admin.html';
      } else {
        error.textContent = data.message || 'Неверный код';
      }
    })
    .catch(err => {
      console.error('Ошибка при подтверждении кода:', err);
      error.textContent = 'Ошибка сервера';
    });
}

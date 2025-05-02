document.getElementById('changePasswordForm').addEventListener('submit', function (e) {
    e.preventDefault();
  
    const oldPassword = document.getElementById('oldPassword').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    const role = localStorage.getItem('role');
    const userId = localStorage.getItem(`${role}Id`);
  
    if (!oldPassword || !newPassword || !confirmPassword) {
      return alert('Пожалуйста, заполните все поля');
    }
  
    if (newPassword !== confirmPassword) {
      return alert('Новый пароль и подтверждение не совпадают');
    }
  
    fetch(`http://localhost:3000/api/${role}-change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, oldPassword, newPassword })
    })
    .then(res => res.json())
    .then(data => {
      document.getElementById('passwordChangeMessage').textContent = data.message;
    })
    .catch(() => {
      alert('Ошибка при смене пароля');
    });
  });
  
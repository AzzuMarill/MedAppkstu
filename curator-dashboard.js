// curator-dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    
    const role = localStorage.getItem('role');
    const id = localStorage.getItem('userId');
    const allowedRole = 'curator';
    const messageBlock = document.getElementById('accessDeniedMessage');
  
    if (!id || role !== allowedRole) {
      messageBlock.style.display = 'block';
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 3000);
    }
  
  // === DOM-элементы ===
  const studentListEl       = document.getElementById('studentList');
  const notificationsEl     = document.getElementById('notifications');
  const studentsTitleEl     = document.getElementById('studentsTitle');
  const groupEl             = document.getElementById('curatorGroupInfo');
  const showStudentsBtn     = document.getElementById('showStudents');
  const showNotifsBtn       = document.getElementById('showNotifications');
  const changePwdBtn        = document.getElementById('changePasswordBtn');
  const passwordModal       = document.getElementById('passwordModal');
  const closePwdModalBtn    = document.getElementById('closePasswordModal');
  const submitPwdChangeBtn  = document.getElementById('submitPasswordChange');
  const oldPwdInput         = document.getElementById('oldPassword');
  const newPwdInput         = document.getElementById('newPassword');
  const pwdErrorBlock       = document.getElementById('passwordError');
  const openAssignModalBtn  = document.getElementById('openAssignModal');
  const assignModal         = document.getElementById('assignModal');
  const closeAssignModalBtn = document.getElementById('closeAssignModal');
  const searchInput         = document.getElementById('assignSearch');
  const suggestionsList     = document.getElementById('assignSuggestions');
  const assignErrorBlock    = document.getElementById('assignError');
  const assignConfirmBtn    = document.getElementById('assignConfirmBtn');

  let selectedStudentId = null;
  let searchDebounce;

  // === 1. Загрузка списка студентов куратора ===
  function loadStudentList() {
    const group = localStorage.getItem('curatorGroup');
    if (!group) {
      alert('Вы не авторизованы как куратор');
      window.location.href = 'login.html';
      return;
    }
    groupEl.textContent = `Ваша группа: ${group}`;
    fetch(`https://medapp-to7o.onrender.com/api/curator/students/${encodeURIComponent(group)}`)
      .then(res => res.json())
      .then(data => {
        studentListEl.innerHTML = '';
        if (!data.length) {
          studentListEl.innerHTML = '<p>Нет студентов в вашей группе.</p>';
          return;
        }
        data.forEach(student => {
          const card = document.createElement('div');
          card.className = 'student-card';
          card.style.border = '1px solid #ccc';
          card.style.padding = '1rem';
          card.style.marginBottom = '1rem';

          const fioP = document.createElement('p');
          fioP.innerHTML = `<strong>ФИО:</strong> ${student.fio}`;
          card.appendChild(fioP);

          if (student.image_path) {
            const img = document.createElement('img');
            img.src = `https://medapp-to7o.onrender.com${student.image_path}`;
            img.style.maxWidth = '200px';
            card.appendChild(img);

            const downloadLink = document.createElement('a');
            downloadLink.textContent    = 'Скачать снимок';
            downloadLink.href           = `https://medapp-to7o.onrender.com${student.image_path}`;
            const cleanName             = student.fio.replace(/\s+/g, '_').replace(/[^\w\dа-яА-ЯёЁ_]/g, '');
            downloadLink.download       = `${cleanName}_fluorography.jpg`;
            downloadLink.style.display        = 'inline-block';
            downloadLink.style.marginTop      = '0.5rem';
            downloadLink.style.color          = '#007BFF';
            downloadLink.style.textDecoration = 'underline';
            card.appendChild(downloadLink);
          } else {
            const noImg = document.createElement('p');
            noImg.textContent = 'Снимок флюорографии не загружен.';
            card.appendChild(noImg);
          }

          studentListEl.appendChild(card);
        });
      })
      .catch(err => {
        console.error('Ошибка при получении студентов:', err);
        studentListEl.innerHTML = '<p>Ошибка загрузки списка студентов.</p>';
      });
  }

  // === 2. Загрузка уведомлений ===
  function loadNotifications() {
    const curatorId = localStorage.getItem('userId');
    fetch(`/api/notifications/${curatorId}`)
      .then(res => res.json())
      .then(data => {
        const ul = document.getElementById('notificationList');
        ul.innerHTML = '';
        if (!data.length) {
          ul.innerHTML = '<li>Нет новых уведомлений.</li>';
          return;
        }
        data.forEach(n => {
          const li = document.createElement('li');
          li.textContent = `${new Date(n.created_at).toLocaleString()}: ${n.message}`;
          if (n.is_read === 0) li.classList.add('unread');
          li.addEventListener('click', () => {
            fetch(`/api/notifications/${n.id}/read`, { method: 'POST' })
              .then(() => li.classList.remove('unread'));
          });
          ul.appendChild(li);
        });
      })
      .catch(err => {
        console.error('Ошибка загрузки уведомлений:', err);
        document.getElementById('notificationList').innerHTML = '<li>Ошибка загрузки.</li>';
      });
  }

  // === 3. Переключение между видами ===
  showStudentsBtn.addEventListener('click', e => {
    e.preventDefault();
    studentsTitleEl.style.display   = '';
    notificationsEl.style.display   = 'none';
    studentListEl.style.display     = 'block';
    loadStudentList();
  });
  showNotifsBtn.addEventListener('click', e => {
    e.preventDefault();
    studentsTitleEl.style.display   = 'none';
    studentListEl.style.display     = 'none';
    notificationsEl.style.display   = 'block';
    loadNotifications();
  });

  // === 4. Смена пароля ===
  changePwdBtn.addEventListener('click', () => passwordModal.style.display = 'flex');
  closePwdModalBtn.addEventListener('click', () => passwordModal.style.display = 'none');
  submitPwdChangeBtn.addEventListener('click', () => {
    const oldPwd = oldPwdInput.value.trim();
    const newPwd = newPwdInput.value.trim();
    pwdErrorBlock.textContent = '';
    if (!oldPwd || !newPwd) {
      pwdErrorBlock.textContent = 'Заполните все поля';
      return;
    }
    const role = localStorage.getItem('role');
    const id   = localStorage.getItem(`${role}Id`);
    fetch('https://medapp-to7o.onrender.com/api/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, id, oldPassword: oldPwd, newPassword: newPwd })
    })
      .then(res => res.json())
      .then(data => {
        if (data.message.includes('Пароль должен')) {
          pwdErrorBlock.textContent = data.message;
        } else {
          alert(data.message);
          passwordModal.style.display = 'none';
        }
      })
      .catch(() => { pwdErrorBlock.textContent = 'Ошибка при смене пароля'; });
  });

  // === 5. Модалка добавления студента ===
  openAssignModalBtn.addEventListener('click', () => {
    assignModal.style.display     = 'flex';
    searchInput.value             = '';
    suggestionsList.innerHTML     = '';
    assignErrorBlock.textContent  = '';
    selectedStudentId             = null;
  });
  closeAssignModalBtn.addEventListener('click', () => assignModal.style.display = 'none');

  // Поиск студентов по ФИО (дебаунс)
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    const q = searchInput.value.trim();
    suggestionsList.innerHTML = '';
    selectedStudentId         = null;
    if (!q) return;
    searchDebounce = setTimeout(() => {
      fetch(`https://medapp-to7o.onrender.com/api/search-students?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(list => {
          suggestionsList.innerHTML = '';
          list.forEach(student => {
            const li = document.createElement('li');
            li.textContent      = student.fio;
            li.dataset.id       = student.id;
            li.addEventListener('click', () => {
              searchInput.value             = student.fio;
              selectedStudentId             = student.id;
              suggestionsList.innerHTML     = '';
            });
            suggestionsList.appendChild(li);
          });
        })
        .catch(err => console.error('Ошибка поиска студентов:', err));
    }, 300);
  });

  // Подтверждение добавления
  assignConfirmBtn.addEventListener('click', () => {
    assignErrorBlock.textContent = '';
    if (!selectedStudentId) {
      assignErrorBlock.textContent = 'Пожалуйста, выберите студента из списка.';
      return;
    }
    const curatorId = localStorage.getItem('userId');
    fetch('/api/assign-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curatorId, studentId: selectedStudentId })
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Ошибка');
        assignErrorBlock.style.color  = 'green';
        assignErrorBlock.textContent  = data.message;
        loadStudentList();
        setTimeout(() => assignModal.style.display = 'none', 1000);
      })
      .catch(err => {
        assignErrorBlock.style.color  = 'red';
        assignErrorBlock.textContent  = err.message;
      });
  });

  // === 6. Инициализация ===
  notificationsEl.style.display = 'none';
  studentListEl.style.display   = 'block';
  loadStudentList();
});

document.addEventListener('DOMContentLoaded', () => {
  // === Элементы страницы ===
  const studentListEl   = document.getElementById('studentList');
  const notificationsEl = document.getElementById('notifications');
  const showStudentsBtn = document.getElementById('showStudents');
  const showNotifsBtn   = document.getElementById('showNotifications');
  const assignForm      = document.getElementById('assignForm');
  const assignMsg       = document.getElementById('assignMessage');

  // Модалка добавления
  const openAssignModalBtn = document.getElementById('openAssignModal');
  const assignModal        = document.getElementById('assignModal');
  const closeAssignModal   = document.getElementById('closeAssignModal');
  const searchInput        = document.getElementById('assignSearch');
  const suggestionsList    = document.getElementById('assignSuggestions');
  const assignError        = document.getElementById('assignError');
  const assignConfirmBtn   = document.getElementById('assignConfirmBtn');

  let selectedStudentId = null;

  // === 1. Загрузка и отображение списка студентов куратора ===
  function loadStudentList() {
    const group = localStorage.getItem('curatorGroup');
    if (!group) {
      alert("Вы не авторизованы как куратор");
      window.location.href = "login.html";
      return;
    }

    fetch(`https://medapp-to7o.onrender.com/api/curator/students/${encodeURIComponent(group)}`)
      .then(res => res.json())
      .then(data => {
        if (!data || data.length === 0) {
          studentListEl.innerHTML = "<p>Нет студентов в вашей группе.</p>";
          return;
        }
        studentListEl.innerHTML = '';
        data.forEach(student => {
          const card = document.createElement('div');
          card.className = 'student-card';
          card.style.border = '1px solid #ccc';
          card.style.padding = '1rem';
          card.style.marginBottom = '1rem';

          // ФИО
          const fioP = document.createElement('p');
          fioP.innerHTML = `<strong>ФИО:</strong> ${student.fio}`;
          card.appendChild(fioP);

          // Изображение и ссылка на скачивание
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
            downloadLink.style.display       = 'inline-block';
            downloadLink.style.marginTop     = '0.5rem';
            downloadLink.style.color         = '#007BFF';
            downloadLink.style.textDecoration= 'underline';
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
        studentListEl.innerHTML = "<p>Ошибка загрузки списка студентов.</p>";
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
        document.getElementById('notificationList').innerHTML =
          '<li class="text-danger">Ошибка загрузки.</li>';
      });
  }

  // === 3. Переключение между видами ===
  showStudentsBtn.addEventListener('click', e => {
    e.preventDefault();
    notificationsEl.style.display = 'none';
    studentListEl.style.display   = 'block';
    loadStudentList();
  });
  showNotifsBtn.addEventListener('click', e => {
    e.preventDefault();
    studentListEl.style.display   = 'none';
    notificationsEl.style.display = 'block';
    loadNotifications();
  });

  // === Инициализация при загрузке страницы ===
  notificationsEl.style.display = 'none';
  studentListEl.style.display   = 'block';
  loadStudentList();

  // === 4. Модальное окно добавления студента ===
  openAssignModalBtn.addEventListener('click', () => {
    assignModal.style.display = 'flex';
    searchInput.value = '';
    suggestionsList.innerHTML = '';
    assignError.textContent = '';
    selectedStudentId = null;
  });
  closeAssignModal.addEventListener('click', () => {
    assignModal.style.display = 'none';
  });

  // Поиск студентов по ФИО (дебаунс)
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = searchInput.value.trim();
    suggestionsList.innerHTML = '';
    selectedStudentId = null;
    if (!q) return;
    searchTimeout = setTimeout(() => {
      fetch(`/api/search-students?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(list => {
          suggestionsList.innerHTML = '';
          list.forEach(student => {
            const li = document.createElement('li');
            li.textContent = student.fio;
            li.dataset.id  = student.id;
            li.addEventListener('click', () => {
              searchInput.value        = student.fio;
              selectedStudentId        = student.id;
              suggestionsList.innerHTML = '';
            });
            suggestionsList.appendChild(li);
          });
        })
        .catch(err => console.error('Ошибка поиска студентов:', err));
    }, 300);
  });

  // Подтверждение добавления
  assignConfirmBtn.addEventListener('click', () => {
    if (!selectedStudentId) {
      assignError.textContent = 'Пожалуйста, выберите студента из списка.';
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
        assignError.style.color   = 'green';
        assignError.textContent   = data.message;
        loadStudentList();        // обновляем список
        setTimeout(() => assignModal.style.display = 'none', 1000);
      })
      .catch(err => {
        console.error(err);
        assignError.style.color   = 'red';
        assignError.textContent   = err.message;
      });
  });
});

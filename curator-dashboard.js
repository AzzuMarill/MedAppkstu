const group = localStorage.getItem('curatorGroup'); // Сохраняем при входе куратора

if (!group) {
  alert("Вы не авторизованы как куратор");
  window.location.href = "login.html";
}

fetch(`https://medapp-to7o.onrender.com/api/curator/students/${group}`)
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById('studentList');
    if (!data || data.length === 0) {
      container.innerHTML = "<p>Нет студентов в вашей группе.</p>";
      return;
    }

    container.innerHTML = '';
data.forEach(student => {
  const card = document.createElement('div');
  card.classList.add('student-card');
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

    const br = document.createElement('br');
    card.appendChild(br);

    const downloadLink = document.createElement('a');
    downloadLink.textContent = 'Скачать снимок';
    downloadLink.href = `https://medapp-to7o.onrender.com${student.image_path}`;
    
    const cleanName = student.fio.replace(/\s+/g, '_').replace(/[^\w\dа-яА-ЯёЁ_]/g, '');
    downloadLink.download = `${cleanName}_fluorography.jpg`;

    downloadLink.style.display = 'inline-block';
    downloadLink.style.marginTop = '0.5rem';
    downloadLink.style.color = '#007BFF';
    downloadLink.style.textDecoration = 'underline';

    card.appendChild(downloadLink);
  } else {
    const noImg = document.createElement('p');
    noImg.textContent = 'Снимок флюорографии не загружен.';
    card.appendChild(noImg);
  }

  container.appendChild(card);
});

  })
  .catch(err => {
    console.error('Ошибка при получении студентов:', err);
    document.getElementById('studentList').innerHTML = "<p>Ошибка загрузки списка студентов.</p>";
  });
const studentListEl = document.getElementById('studentList');
const notificationsEl = document.getElementById('notifications');

function showStudentsView() {
  notificationsEl.style.display = 'none';
  studentListEl.style.display = 'block';
}

function showNotificationsView() {
  studentListEl.style.display = 'none';
  notificationsEl.style.display = 'block';
  loadNotifications();  // подгрузить список уведомлений
}

function loadNotifications() {
  const curatorId = localStorage.getItem('userId');
  fetch(`/api/notifications/${curatorId}`)
    .then(res => res.json())
    .then(data => {
      const ul = document.getElementById('notificationList');
      ul.innerHTML = '';
      const unread = data.filter(n => n.is_read === 0).length;
      count.textContent = unread;
      if (!data.length) {
        ul.innerHTML = '<li>Нет новых уведомлений.</li>';
        return;
      }
      data.forEach(n => {
        const li = document.createElement('li');
        li.textContent = `${new Date(n.created_at).toLocaleString()}: ${n.message}`;
        if (n.is_read === 0) li.classList.add('unread');

        li.onclick = () => {
          fetch(`/api/notifications/${n.id}/read`, { method: 'POST' })
            .then(() => li.style.fontWeight = 'normal');
        };
        ul.appendChild(li);
      });
    })
    .catch(() => {
      document.getElementById('notificationList').innerHTML =
        '<li class="text-danger">Ошибка загрузки.</li>';
    });
}
document.getElementById('showStudents')
  .addEventListener('click', e => {
    e.preventDefault();
    showStudentsView();
  });

document.getElementById('showNotifications')
  .addEventListener('click', e => {
    e.preventDefault();
    showNotificationsView();
  });

// при первой загрузке показываем студентов
showStudentsView();

// === Привязка формы добавления студента ===
const assignForm = document.getElementById('assignForm');
const assignMsg  = document.getElementById('assignMessage');

assignForm.addEventListener('submit', e => {
  e.preventDefault();
  const studentId = document.getElementById('assignStudentId').value.trim();
  const curatorId = localStorage.getItem('userId');

  fetch('/api/assign-student', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ curatorId, studentId })
  })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка');
      assignMsg.style.color = 'green';
      assignMsg.textContent = data.message;
      // опционально: перезагрузить список студентов
      loadStudentList?.();
    })
    .catch(err => {
      console.error(err);
      assignMsg.style.color = 'red';
      assignMsg.textContent = err.message;
    });
});

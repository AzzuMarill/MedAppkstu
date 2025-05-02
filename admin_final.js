const BASE_URL = "http://localhost:3000";

document.addEventListener('DOMContentLoaded', () => {
  showHome();
  document.getElementById('addStudentBtn')?.addEventListener('click', addStudent);
  document.getElementById('menuAddStudent')?.addEventListener('click', (e) => {
    e.preventDefault();
    showAddStudent();
  });
  document.getElementById('menuPublishNews')?.addEventListener('click', (e) => {
    e.preventDefault();
    showNewsBlock();
  });
  document.getElementById('menuCurators')?.addEventListener('click', (e) => {
    e.preventDefault();
    showCurators();
  });  
  document.getElementById('menuDoctors')?.addEventListener('click', (e) => {
    e.preventDefault();
    showDoctors();
  });  
  document.getElementById('menuHome')?.addEventListener('click', (e) => {
    e.preventDefault();
    showHome();
  });  
  document.getElementById('saveEditBtn')?.addEventListener('click', saveStudentChanges);
  document.getElementById('closeModal')?.addEventListener('click', closeEditModal);
  document.getElementById('addCuratorBtn')?.addEventListener('click', addCurator);
  document.getElementById('addDoctorBtn')?.addEventListener('click', addDoctor);
  document.getElementById('submitNewsBtn')?.addEventListener('click', submitNews);
});

function isStrongPassword(password) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  return regex.test(password);
}

function hideAllSections() {
  ['addStudentFormBlock', 'studentsTableContainer', 'newsBlock', 'addDoctorBlock', 'curatorsBlock', 'cardsBlock'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function showAddStudent() {
  hideAllSections();
  showElement('addStudentFormBlock');
  showElement('studentsTableContainer');}

function showNewsBlock() {
  hideAllSections();
  showElement('newsBlock');
}

function showDoctors() {
  hideAllSections();
  showElement('addDoctorBlock');
  loadDoctors();
}

function showCurators() {
  hideAllSections();
  showElement('curatorsBlock');
  loadCurators();
}

function showElement(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'block';
}

function loadStudents() {
  fetch(`${BASE_URL}/api/students`)
    .then(res => res.json())
    .then(data => {
      const tbody = document.getElementById('studentTableBody');
      tbody.innerHTML = '';
      data.forEach(student => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
        <td>${student.id}</td>
        <td>${student.fio}</td>
        <td>${student.login}</td>
        <td>${student.email}</td>
        <td>
          <button onclick='openEditModal(${JSON.stringify(student)})'>Изменить</button>
          <button onclick='deleteStudent(${student.id})'>Удалить</button>
        </td>`;
        tbody.appendChild(tr);
      });

      const count = document.getElementById('activeCount');
      if (count) count.textContent = data.length;
    })
    .catch(err => console.error('Ошибка при загрузке студентов:', err));
}

function addStudent() {
  const fio = document.getElementById('fioInput').value.trim();
  const login = document.getElementById('loginInput').value.trim();
  const password = document.getElementById('passwordInput').value.trim();
  const email = document.getElementById('emailInput').value.trim();

  if (!fio || !login || !password || !email) {
    alert('Заполните все поля!');
    return;
  }

  const passErr = document.getElementById('studentPasswordError');
  if (!isStrongPassword(password)) {
    passErr.textContent = 'Пароль должен содержать минимум 8 символов, включая заглавные и строчные буквы, цифры и спецсимволы.';
    return;
  } else {
    passErr.textContent = '';
  }

  fetch(`${BASE_URL}/api/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fio, login, password, email })
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message || 'Студент добавлен');

      loadStudents();

      document.getElementById('fioInput').value = '';
      document.getElementById('loginInput').value = '';
      document.getElementById('passwordInput').value = '';
      document.getElementById('emailInput').value = '';
    })
    .catch(err => {
      console.error('Ошибка при добавлении студента:', err);
      alert('Не удалось добавить студента.');
    });
}

function deleteStudent(id) {
  if (!confirm('Удалить этого студента?')) return;

  fetch(`${BASE_URL}/api/students/${id}`, {
    method: 'DELETE'
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message || 'Студент удалён');
      loadStudents();
    })
    .catch(err => {
      console.error('Ошибка при удалении студента:', err);
      alert('Не удалось удалить студента');
    });
}

window.deleteStudent = deleteStudent;

function loadDoctors() {
  fetch(`${BASE_URL}/api/doctors`)
    .then(res => res.json())
    .then(data => {
      const tbody = document.getElementById('doctorsTableBody');
      tbody.innerHTML = '';
      data.forEach(doc => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
        <td>${doc.id}</td>
        <td>${doc.fio}</td>
        <td>${doc.login}</td>
        <td>${doc.email}</td>
        <td>
          <button onclick='openEditDoctorModal(${JSON.stringify(doc)})'>Изменить</button>
          <button onclick='deleteDoctor(${doc.id})'>Удалить</button>
        </td>`;
        tbody.appendChild(tr);
      });
    })
    .catch(err => console.error('Ошибка при загрузке врачей:', err));
}

function loadCurators() {
  fetch(`${BASE_URL}/api/curators`)
    .then(res => res.json())
    .then(data => {
      const tbody = document.getElementById('curatorsTableBody');
      tbody.innerHTML = '';
      data.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
        <td>${c.id}</td>
        <td>${c.fio}</td>
        <td>${c.login}</td>
        <td>${c.email}</td>
        <td>${c.group_name}</td>
        <td>
          <button onclick='openEditCuratorModal(${JSON.stringify(c)})'>Изменить</button>
          <button onclick='deleteCurator(${c.id})'>Удалить</button>
        </td>`;      
        tbody.appendChild(tr);
      });
    })
    .catch(err => console.error('Ошибка при загрузке кураторов:', err));
}

function addDoctor() {
  const fio = document.getElementById('doctorName').value.trim();
  const login = document.getElementById('doctorLogin').value.trim();
  const password = document.getElementById('doctorPassword').value.trim();
  const email = document.getElementById('doctorEmail').value.trim();

  if (!fio || !login || !password || !email) return alert('Заполните все поля');
  const passErr = document.getElementById('doctorPasswordError');
  if (!isStrongPassword(password)) {
    passErr.textContent = 'Пароль должен содержать минимум 8 символов, включая заглавные и строчные буквы, цифры и спецсимволы.';
    return;
  } else {
    passErr.textContent = '';
  }


  fetch(`${BASE_URL}/api/doctors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fio, login, password, email })
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message || 'Врач добавлен');
      loadDoctors();
    })
    .catch(err => alert('Ошибка при добавлении врача'));
}

function addCurator() {
  const fio = document.getElementById('curatorName').value.trim();
  const login = document.getElementById('curatorLogin').value.trim();
  const password = document.getElementById('curatorPassword').value.trim();
  const email = document.getElementById('curatorEmail').value.trim();
  const group = document.getElementById('curatorGroup').value.trim();

  if (!fio || !login || !password || !email || !group) return alert('Заполните все поля');
  const passErr = document.getElementById('curatorPasswordError');
  if (!isStrongPassword(password)) {
    passErr.textContent = 'Пароль должен содержать минимум 8 символов, включая заглавные и строчные буквы, цифры и спецсимволы.';
    return;
  } else {
    passErr.textContent = '';
  }

  fetch(`${BASE_URL}/api/curators`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fio, login, password, email, group_name: group })
  })
    .then(res => res.json()) // 👈 УБРАЛ .ok
    .then(data => {
      alert(data.message || 'Куратор добавлен');
      loadCurators();
    })
    .catch(err => {
      console.error('Ошибка при добавлении куратора:', err);
      alert('Ошибка при добавлении куратора');
    });
}

function showNewsBlock() {
  hideAllSections();
  showElement('newsBlock');
  loadNewsList();
}

function loadNewsList() {
  fetch(`${BASE_URL}/api/news`)
    .then(res => res.json())
    .then(news => {
      const container = document.getElementById('newsList');
      if (!container) return;
      container.innerHTML = '';

      if (news.length === 0) {
        container.innerHTML = '<p>Нет опубликованных новостей.</p>';
        return;
      }

      news.forEach(item => {
        const div = document.createElement('div');
        div.classList.add('news-item');
        div.innerHTML = `
        <strong>${item.title}</strong> — ${new Date(item.date).toLocaleString()}<br>
        <p>${item.content}</p>
        ${item.imageUrl ? `<img src="${item.imageUrl}" style="max-width: 100%; margin: 10px 0;" />` : ''}
        <button onclick="editNews(${item.id}, \`${item.title}\`, \`${item.content}\`)"> Редактировать</button>
        <button onclick="deleteNews(${item.id})" style="margin-left: 10px; color: red;"> Удалить</button>`;
        container.appendChild(div);
      });
    })
    .catch(err => {
      console.error("Ошибка при загрузке новостей:", err);
    });
}

function editNews(id, title, content) {
  document.getElementById('newsId').value = id;
  document.getElementById('newsTitle').value = title;
  document.getElementById('newsContent').value = content;
  document.getElementById('submitNewsBtn').textContent = 'Обновить';
}

function deleteNews(id) {
  if (!confirm('Удалить эту новость?')) return;

  fetch(`${BASE_URL}/api/news/${id}`, {
    method: 'DELETE'
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message || 'Новость удалена');
      loadNewsList();
    })
    .catch(err => {
      console.error("Ошибка при удалении новости:", err);
      alert("Ошибка при удалении новости");
    });
}

function submitNews() {
  const id = document.getElementById('newsId').value;
  const title = document.getElementById('newsTitle').value.trim();
  const content = document.getElementById('newsContent').value.trim();
  const imageFile = document.getElementById('newsImage').files[0];

  if (!title || !content) {
    alert("Заполните заголовок и содержание!");
    return;
  }

  const method = id ? 'PUT' : 'POST';
  const endpoint = id ? `/api/news/${id}` : '/api/news';

  const formData = new FormData();
  formData.append('title', title);
  formData.append('content', content);
  if (imageFile) formData.append('image', imageFile);

  fetch(`${BASE_URL}${endpoint}`, {
    method,
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message || (id ? 'Новость обновлена' : 'Новость добавлена'));
      document.getElementById('newsTitle').value = '';
      document.getElementById('newsContent').value = '';
      document.getElementById('newsImage').value = '';
      document.getElementById('newsId').value = '';
      document.getElementById('submitNewsBtn').textContent = 'Сохранить';
      loadNewsList();
    })
    .catch(err => {
      console.error("Ошибка при сохранении новости:", err);
      alert("Не удалось сохранить новость");
    });
}

// === ВРАЧИ ===
function deleteDoctor(id) {
  if (!confirm('Удалить врача?')) return;

  fetch(`${BASE_URL}/api/doctors/${id}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      loadDoctors();
    })
    .catch(err => {
      console.error('Ошибка при удалении врача:', err);
      alert('Не удалось удалить врача.');
    });
}

function editDoctor(doctor) {
  const newLogin = prompt("Новый логин:", doctor.login);
  const newEmail = prompt("Новая почта:", doctor.email);
  const newPassword = prompt("Новый пароль (оставь пустым, если без изменений):");

  if (!newLogin || !newEmail) {
    alert("Логин и почта обязательны!");
    return;
  }

  const update = { login: newLogin, email: newEmail };
  if (newPassword) update.password = newPassword;

  fetch(`${BASE_URL}/api/doctors/${doctor.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update)
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      loadDoctors();
    })
    .catch(err => {
      console.error("Ошибка при обновлении:", err);
      alert("Не удалось изменить данные врача.");
    });
}
// === КУРАТОРЫ ===
function deleteCurator(id) {
  if (!confirm('Удалить куратора?')) return;

  fetch(`${BASE_URL}/api/curators/${id}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      loadCurators();
    })
    .catch(err => {
      console.error('Ошибка при удалении куратора:', err);
      alert('Не удалось удалить куратора.');
    });
}

function editCurator(curator) {
  const newLogin = prompt("Новый логин:", curator.login);
  const newEmail = prompt("Новая почта:", curator.email);
  const newGroup = prompt("Новая группа:", curator.group_name);
  const newPassword = prompt("Новый пароль (оставь пустым, если без изменений):");

  if (!newLogin || !newEmail || !newGroup) {
    alert("Все поля обязательны!");
    return;
  }

  const update = { login: newLogin, email: newEmail, group_name: newGroup };
  if (newPassword) update.password = newPassword;

  fetch(`${BASE_URL}/api/curators/${curator.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update)
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      loadCurators();
    })
    .catch(err => {
      console.error("Ошибка при обновлении:", err);
      alert("Не удалось изменить данные куратора.");
    });
}

let currentCuratorId = null;

function openEditCuratorModal(curator) {
  currentCuratorId = curator.id;
  document.getElementById('editCuratorLogin').value = curator.login;
  document.getElementById('editCuratorEmail').value = curator.email;
  document.getElementById('editCuratorGroup').value = curator.group_name;
  document.getElementById('editCuratorPassword').value = '';
  document.getElementById('editCuratorModal').style.display = 'block';
}

function closeEditCuratorModal() {
  document.getElementById('editCuratorModal').style.display = 'none';
}

function saveCuratorChanges() {
  const login = document.getElementById('editCuratorLogin').value.trim();
  const email = document.getElementById('editCuratorEmail').value.trim();
  const group = document.getElementById('editCuratorGroup').value.trim();
  const password = document.getElementById('editCuratorPassword').value.trim();
  const passErr = document.getElementById('editCuratorPasswordError');
  if (password && !isStrongPassword(password)) {
    passErr.textContent = 'Пароль должен содержать минимум 8 символов, включая заглавные, строчные буквы, цифры и спецсимволы.';
    return;
  } else {
    passErr.textContent = '';
  }

  if (!login || !email || !group) {
    alert('Все поля обязательны');
    return;
  }

  const update = { login, email, group_name: group };
  if (password) update.password = password;

  fetch(`${BASE_URL}/api/curators/${currentCuratorId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update)
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message || 'Куратор обновлён');
      closeEditCuratorModal();
      loadCurators();
    })
    .catch(err => {
      console.error('Ошибка при обновлении:', err);
      alert('Не удалось обновить данные');
    });
}

let currentDoctorId = null;

function openEditDoctorModal(doctor) {
  currentDoctorId = doctor.id;
  document.getElementById('editDoctorLogin').value = doctor.login;
  document.getElementById('editDoctorEmail').value = doctor.email;
  document.getElementById('editDoctorPassword').value = '';
  document.getElementById('editDoctorModal').style.display = 'block';
}

function closeEditDoctorModal() {
  document.getElementById('editDoctorModal').style.display = 'none';
}

function saveDoctorChanges() {
  const login = document.getElementById('editDoctorLogin').value.trim();
  const email = document.getElementById('editDoctorEmail').value.trim();
  const password = document.getElementById('editDoctorPassword').value.trim();
  const passErr = document.getElementById('editDoctorPasswordError');
  if (password && !isStrongPassword(password)) {
    passErr.textContent = 'Пароль должен содержать минимум 8 символов, включая заглавные, строчные буквы, цифры и спецсимволы.';
    return;
  } else {
    passErr.textContent = '';
  }

  if (!login || !email) {
    alert('Логин и почта обязательны');
    return;
  }

  const update = { login, email };
  if (password) update.password = password;

  fetch(`${BASE_URL}/api/doctors/${currentDoctorId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update)
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message || 'Данные врача обновлены');
      closeEditDoctorModal();
      loadDoctors();
    })
    .catch(err => {
      console.error('Ошибка при обновлении:', err);
      alert('Не удалось обновить данные врача');
    });
}

let currentEditId = null;

function openEditModal(student) {
  currentEditId = student.id;
  document.getElementById('editLogin').value = student.login;
  document.getElementById('editPassword').value = '';
  document.getElementById('editEmail').value = student.email;
  document.getElementById('editModal').style.display = 'block';
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
}

function saveStudentChanges() {
  const login = document.getElementById('editLogin').value.trim();
  const password = document.getElementById('editPassword').value.trim();
  const email = document.getElementById('editEmail').value.trim();
  const passErr = document.getElementById('editStudentPasswordError');
  if (password && !isStrongPassword(password)) {
    passErr.textContent = 'Пароль должен содержать минимум 8 символов, включая заглавные, строчные буквы, цифры и спецсимволы.';
    return;
  } else {
    passErr.textContent = '';
  }

  const update = {};
  if (login) update.login = login;
  if (password) update.password = password;
  if (email) update.email = email;

  fetch(`${BASE_URL}/api/students/${currentEditId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update)
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message || 'Данные студента обновлены');
      closeEditModal();
      loadStudents();
    })
    .catch(err => {
      console.error('Ошибка при обновлении студента:', err);
      alert('Не удалось обновить студента');
    });
}

function showHome() {
  hideAllSections();
  showElement('cardsBlock'); // ← твоя главная админка (блок со счётчиком)
  showElement('studentsTableContainer');
  loadStudents(); // ← загружаем студентов
}

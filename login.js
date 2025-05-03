document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector('.login-form');

  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const login = document.getElementById('login').value.trim();
    const password = document.getElementById('password').value.trim();
    localStorage.clear();

    // Попробовать авторизацию по очереди: студент → врач → куратор
    tryLoginAsStudent(login, password)
    .catch(() => {
      return tryLoginAsDoctor(login, password);
    })
    .catch(() => {
      return tryLoginAsCurator(login, password);
    })
    .catch(err => {
      console.error("Ошибка входа:", err);
      alert(err.message || "Ошибка входа. Попробуйте снова.");
    });

  });

  function tryLoginAsStudent(login, password) {
    return fetch("https://medapp-to7o.onrender.com/api/student-login", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка авторизации');

      localStorage.setItem('role', 'student');
      localStorage.setItem('studentId', data.studentId);
      localStorage.setItem('userId', data.studentId);
      localStorage.setItem('studentFio', data.fio);
      localStorage.setItem('studentEmail', data.email);
      window.location.href = "home.html";
    });
  }

  function tryLoginAsDoctor(login, password) {
    return fetch("https://medapp-to7o.onrender.com/api/doctor-login", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка авторизации');

      localStorage.setItem('role', 'doctor');
      localStorage.setItem('doctorId', data.doctorId);
      localStorage.setItem('userId', data.doctorId);
      localStorage.setItem('doctorFio', data.fio);
      localStorage.setItem('doctorEmail', data.email);
      window.location.href = "home.html";
    });
  }

  function tryLoginAsCurator(login, password) {
    return fetch("https://medapp-to7o.onrender.com/api/curator-login", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка авторизации');

      localStorage.setItem('role', 'curator');
      localStorage.setItem('curatorId', data.curatorId);
      localStorage.setItem('userId', data.curatorId);
      localStorage.setItem('curatorFio', data.fio);
      localStorage.setItem('curatorGroup', data.group);
      window.location.href = "home.html";
    });
  }
});

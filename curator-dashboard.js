const group = localStorage.getItem('curatorGroup'); // Сохраняем при входе куратора

if (!group) {
  alert("Вы не авторизованы как куратор");
  window.location.href = "login.html";
}

fetch(`http://localhost:3000/api/curator/students/${group}`)
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
    img.src = `http://localhost:3000${student.image_path}`;
    img.style.maxWidth = '200px';
    card.appendChild(img);

    const br = document.createElement('br');
    card.appendChild(br);

    const downloadLink = document.createElement('a');
    downloadLink.textContent = 'Скачать снимок';
    downloadLink.href = `http://localhost:3000${student.image_path}`;
    
    // Чистим имя от лишних символов
    const cleanName = student.fio.replace(/\s+/g, '_').replace(/[^\w\d_]/g, '');
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

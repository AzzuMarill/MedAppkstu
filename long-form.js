document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.big-form');
  
    form.addEventListener('submit', (event) => {
      event.preventDefault();
  
      // Получаем studentId из localStorage (записанный при логине)
      const studentId = localStorage.getItem('studentId');
  
      // Собираем значения полей формы
      const fullName = document.getElementById('fullName').value.trim();
      const email = document.getElementById('email').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const dob = document.getElementById('dob').value;
      const gender = document.querySelector('input[name="gender"]:checked')?.value || '';
      const faculty = document.getElementById('faculty').value.trim();
      const occupation = document.getElementById('occupation').value.trim();
      const address = document.getElementById('address').value.trim();
      const emergencyContact = document.getElementById('emergencyContact').value.trim();
      const emergencyNumber = document.getElementById('emergencyNumber').value.trim();
      const primaryPhysician = document.getElementById('primaryPhysician').value.trim();
      const insuranceProvider = document.getElementById('insuranceProvider').value.trim();
      const policyNumber = document.getElementById('policyNumber').value.trim();
      const allergies = document.getElementById('allergies').value.trim();
      const currentMedication = document.getElementById('currentMedication').value.trim();
      const familyHistory = document.getElementById('familyHistory').value.trim();
      const pastHistory = document.getElementById('pastHistory').value.trim();
    
      const payload = {
        student_id: studentId, 
        full_name: fullName,
        email,
        phone,
        dob,
        gender,
        faculty,
        occupation,
        address,
        emergency_contact: emergencyContact,
        emergency_number: emergencyNumber,
        primary_physician: primaryPhysician,
        insurance_provider: insuranceProvider,
        policy_number: policyNumber,
        allergies,
        current_medication: currentMedication,
        family_history: familyHistory,
        past_history: pastHistory
      };
      
  
      // Отправляем запрос на сервер
      fetch('http://localhost:3000/api/medical-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
        .then(res => res.json())
        .then(data => {
          // Если сервер ответил успешно
          alert(data.message || 'Данные сохранены!');
          // Можно перенаправить на другую страницу, если нужно
          // window.location.href = 'thank-you.html';
        })
        .catch(err => {
          console.error('Ошибка при отправке формы:', err);
          alert('Не удалось сохранить данные. Попробуйте снова.');
        });
    });
  });
  
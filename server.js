const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const adminCodes = {};

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const TELEGRAM_BOT_TOKEN = '8195401830:AAHOJLrlYdzMdIzIRvSBObnvpicId-nFjn8';
const TELEGRAM_CHAT_ID = '1164239455'; 

// Раздача статических файлов
app.use(express.static(path.join(__dirname)));

// Подключение базы данных
const db = new sqlite3.Database('./studentdb.sqlite', (err) => {
  if (err) {
    console.error('Ошибка подключения к базе данных:', err.message);
  } else {
    console.log('База данных открыта');
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/api/admin-login', (req, res) => {
  const { login, password } = req.body;

  db.get('SELECT * FROM administrators WHERE login = ?', [login], async (err, admin) => {
    if (err || !admin) return res.status(401).json({ message: 'Неверный логин или пароль' });
    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ message: 'Неверный логин или пароль' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const tempToken = Date.now() + '_' + Math.random().toString(36).substring(2);
    adminCodes[tempToken] = { code, expires: Date.now() + 5 * 60 * 1000 };

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const text = `🔐 Ваш код входа: ${code}`;

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text })
    });

    res.json({ message: 'Код отправлен в Telegram', tempToken });
  });
});

app.post('/api/admin-verify-code', (req, res) => {
  const { code, tempToken } = req.body;
  const saved = adminCodes[tempToken];

  if (!saved) return res.status(400).json({ message: 'Сессия истекла' });
  if (saved.code !== code) return res.status(400).json({ message: 'Неверный код' });
  if (Date.now() > saved.expires) return res.status(400).json({ message: 'Код устарел' });

  delete adminCodes[tempToken];
  res.json({ message: 'Код подтверждён' });
});

// Загрузка файлов (освобождение)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Таблицы
// 1. Студенты
db.run(`CREATE TABLE IF NOT EXISTS medical_data (
  student_id INTEGER PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  dob TEXT,
  gender TEXT,
  occupation TEXT,
  address TEXT,
  emergency_contact TEXT,
  emergency_number TEXT,
  primary_physician TEXT,
  treatingDoctor TEXT,
  allergies TEXT,
  current_medication TEXT,
  family_history TEXT,
  past_history TEXT
)`);

// 4. Визиты
db.run(`CREATE TABLE IF NOT EXISTS doctor_visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doctor_id INTEGER,
  student_id INTEGER,
  visit_date TEXT,
  complaints TEXT,
  is_exempted INTEGER,
  exemption_file TEXT
)`);

// 5. Новости
db.run(`CREATE TABLE IF NOT EXISTS news (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  date TEXT NOT NULL,
  imageUrl TEXT
)`);

// 6. Уведомления кураторов
db.run(`CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  curator_id INTEGER,
  student_id INTEGER,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)`);

// Таблица для снимков флюорографии
db.run(`CREATE TABLE IF NOT EXISTS xray_images (
  student_id INTEGER PRIMARY KEY,
  image_path TEXT
)`);

db.run(`CREATE TABLE IF NOT EXISTS curators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fio TEXT NOT NULL,
  login TEXT NOT NULL,
  email TEXT,
  password TEXT NOT NULL,
  group_name TEXT NOT NULL
)`);

/* === API === */

app.get('/api/students', (req, res) => {
  db.all('SELECT id, fio, login, email FROM students', [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Ошибка получения студентов' });
    res.json(rows);
  });
});

// Добавить студента
app.post('/api/students', async (req, res) => {
  const { fio, login, password, email } = req.body;
  if (!fio || !login || !password || !email) return res.status(400).json({ message: 'Заполните все обязательные поля' });

  try {
    const hash = await bcrypt.hash(password, 10);
    db.run("INSERT INTO students (fio, login, password, email) VALUES (?, ?, ?, ?)", [fio, login, hash, email], function(err) {
      if (err) return res.status(500).json({ message: 'Ошибка при добавлении студента' });
      res.status(201).json({ message: 'Студент успешно добавлен', studentId: this.lastID });
    });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Флюорография — сохранить
app.post('/api/xray-upload', upload.single('image'), (req, res) => {
  const { studentId } = req.body;
  if (!studentId || !req.file) return res.status(400).json({ message: 'Неверные данные или файл не передан' });

  const filePath = `/uploads/${req.file.filename}`;

  // Проверяем, была ли уже загружена флюорография
  db.get("SELECT * FROM students WHERE id = ?", [studentId], (err, student) => {
    if (err || !student) return res.status(404).json({ message: 'Студент не найден' });

    // Обновим или создадим отдельную таблицу, если еще нет
    db.run(`CREATE TABLE IF NOT EXISTS xray_images (
      student_id INTEGER PRIMARY KEY,
      image_path TEXT
    )`, () => {
      // Сохраняем путь
      db.run(
        `INSERT INTO xray_images (student_id, image_path)
         VALUES (?, ?)
         ON CONFLICT(student_id) DO UPDATE SET image_path = excluded.image_path`,
        [studentId, filePath],
        (err) => {
          if (err) return res.status(500).json({ message: 'Ошибка при сохранении пути снимка' });
          res.json({ message: 'Снимок сохранен', imageUrl: filePath });
        }
      );
    });
  });
});

// Флюорография — получить
app.get('/api/xray/:studentId', (req, res) => {
  const studentId = req.params.studentId;
  db.get("SELECT image_path FROM xray_images WHERE student_id = ?", [studentId], (err, row) => {
    if (err) return res.status(500).json({ message: 'Ошибка при получении снимка' });
    if (!row) return res.status(404).json({ message: 'Снимок не найден' });
    res.json({ imageUrl: row.image_path });
  });
});

// Флюорография — удалить
app.delete('/api/xray/:studentId', (req, res) => {
  const studentId = req.params.studentId;
  db.get("SELECT image_path FROM xray_images WHERE student_id = ?", [studentId], (err, row) => {
    if (err || !row) return res.status(404).json({ message: 'Снимок не найден' });

    const fs = require('fs');
    const imagePath = path.join(__dirname, row.image_path);
    fs.unlink(imagePath, (unlinkErr) => {
      if (unlinkErr) console.error('Ошибка при удалении файла:', unlinkErr);

      db.run("DELETE FROM xray_images WHERE student_id = ?", [studentId], (dbErr) => {
        if (dbErr) return res.status(500).json({ message: 'Ошибка при удалении записи' });
        res.json({ message: 'Снимок удалён' });
      });
    });
  });
});

// Получить одну новость
app.get('/api/news/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM news WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ message: 'Ошибка сервера' });
    if (!row) return res.status(404).json({ message: 'Новость не найдена' });
    res.json(row);
  });
});

// Обновить новость
app.put('/api/news/:id', upload.single('image'), (req, res) => {
  const { title, content } = req.body;
  const id = req.params.id;

  if (!title || !content) {
    return res.status(400).json({ message: 'Заполните все поля' });
  }

  const fields = ['title = ?', 'content = ?'];
  const values = [title, content];

  if (req.file) {
    const imageUrl = `/uploads/${req.file.filename}`;
    fields.push('imageUrl = ?');
    values.push(imageUrl);

    values.push(id);
    db.run(`UPDATE news SET ${fields.join(', ')} WHERE id = ?`, values, function (err) {
      if (err) {
        console.error('Ошибка при обновлении новости:', err.message);
        return res.status(500).json({ message: 'Ошибка при обновлении' });
      }
      res.json({ message: 'Новость обновлена' });
    });

  } else {
    // если файл не загружен — оставляем старую картинку
    db.get('SELECT imageUrl FROM news WHERE id = ?', [id], (err, row) => {
      if (err || !row) {
        return res.status(500).json({ message: 'Ошибка при получении текущей картинки' });
      }

      fields.push('imageUrl = ?');
      values.push(row.imageUrl); // текущая картинка

      values.push(id);
      db.run(`UPDATE news SET ${fields.join(', ')} WHERE id = ?`, values, function (err) {
        if (err) {
          console.error('Ошибка при обновлении новости:', err.message);
          return res.status(500).json({ message: 'Ошибка при обновлении' });
        }
        res.json({ message: 'Новость обновлена' });
      });
    });
  }
});

// Удалить студента
app.delete('/api/students/:id', (req, res) => {
  db.run("DELETE FROM students WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ message: 'Ошибка при удалении студента' });
    if (this.changes === 0) return res.status(404).json({ message: 'Студент не найден' });
    res.json({ message: 'Студент успешно удалён' });
  });
});

// Обновить студента
app.put('/api/students/:id', async (req, res) => {
  const { login, password, email } = req.body;
  const fields = [];
  const values = [];

  if (login) { fields.push("login = ?"); values.push(login); }
  if (email) { fields.push("email = ?"); values.push(email); }
  if (password) {
    const hash = await bcrypt.hash(password, 10);
    fields.push("password = ?"); values.push(hash);
  }
  if (fields.length === 0) return res.status(400).json({ message: 'Нет полей для обновления' });

  values.push(req.params.id);
  db.run(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`, values, function(err) {
    if (err) return res.status(500).json({ message: 'Ошибка при обновлении' });
    if (this.changes === 0) return res.status(404).json({ message: 'Студент не найден' });
    res.json({ message: 'Обновлено' });
  });
});

// Авторизация студента
app.post('/api/student-login', (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) return res.status(400).json({ message: 'Укажите логин и пароль' });

  db.get("SELECT * FROM students WHERE login = ?", [login], async (err, row) => {
    if (err || !row) return res.status(401).json({ message: 'Неверный логин или пароль' });
    const match = await bcrypt.compare(password, row.password);
    if (!match) return res.status(401).json({ message: 'Неверный логин или пароль' });
    res.json({ message: 'Авторизация успешна', studentId: row.id, fio: row.fio, email: row.email });
  });
});

// Авторизация врача
app.post('/api/doctor-login', (req, res) => {
  const { login, password } = req.body;
  db.get("SELECT * FROM doctors WHERE login = ?", [login], async (err, row) => {
    if (err || !row) return res.status(401).json({ message: 'Неверный логин или пароль' });
    const match = await bcrypt.compare(password, row.password);
    if (!match) return res.status(401).json({ message: 'Неверный логин или пароль' });
    res.json({ message: 'Авторизация врача успешна', doctorId: row.id, fio: row.fio, email: row.email, specialization: row.specialization });
  });
});

// Получить список врачей
app.get('/api/doctors', (req, res) => {
  db.all('SELECT id, fio, login, email FROM doctors', [], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Ошибка запроса' });
    res.json(rows);
  });
});


// Добавить врача
app.post('/api/doctors', async (req, res) => {
  const { fio, login, password, email } = req.body;
  if (!fio || !login || !password || !email) {
    return res.status(400).json({ message: 'Все поля обязательны' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO doctors (fio, login, password, email) VALUES (?, ?, ?, ?)',
      [fio, login, hash, email],
      function(err) {
        if (err) return res.status(500).json({ message: 'Ошибка при добавлении врача' });
        res.json({ message: 'Врач добавлен', id: this.lastID });
      }
    );
  } catch (err) {
    console.error('Ошибка при хешировании пароля врача:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.delete('/api/doctors/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM doctors WHERE id = ?', [id], function (err) {
    if (err) {
      console.error('Ошибка при удалении врача:', err);
      return res.status(500).json({ message: 'Ошибка при удалении врача' });
    }
    res.json({ message: 'Врач успешно удалён' });
  });
});


// Список студентов + анкета
app.get('/api/students-list', (req, res) => {
  const sql = `SELECT s.id, s.fio, md.occupation AS group_name FROM students s LEFT JOIN medical_data md ON s.id = md.student_id`;
  db.all(sql, (err, rows) => {
    if (err) return res.status(500).json({ message: 'Ошибка при получении списка студентов' });
    res.json(rows);
  });
});

app.get('/api/doctor-dashboard-stats/:id', (req, res) => {
  const doctorId = req.params.id;

  const stats = {
    students: 0,
    forms: 0,
    visits: 0
  };

  db.get("SELECT COUNT(*) as count FROM students", (err, row1) => {
    if (err) return res.status(500).json({ message: "Ошибка получения студентов" });
    stats.students = row1.count;

    db.get("SELECT COUNT(*) as count FROM medical_data", (err, row2) => {
      if (err) return res.status(500).json({ message: "Ошибка получения анкет" });
      stats.forms = row2.count;

      db.get("SELECT COUNT(*) as count FROM doctor_visits WHERE doctor_id = ?", [doctorId], (err, row3) => {
        if (err) return res.status(500).json({ message: "Ошибка получения визитов" });
        stats.visits = row3.count;

        res.json(stats);
      });
    });
  });
});

// Медицинская анкета студента
app.get('/api/medical-data/:studentId', (req, res) => {
  db.get("SELECT * FROM medical_data WHERE student_id = ?", [req.params.studentId], (err, row) => {
    if (err) return res.status(500).json({ message: 'Ошибка при получении анкеты' });
    if (!row) return res.status(404).json({ message: 'Анкета не найдена' });
    res.json(row);
  });
});

// Сохранить или обновить анкету
app.post('/api/medical-data', (req, res) => {
  const data = req.body;
  const fields = Object.keys(data).filter(key => key !== 'id'); // исключим id
  const placeholders = fields.map(() => '?').join(', ');
  const values = fields.map(k => data[k]);

  const updateClause = fields.map(f => `${f} = excluded.${f}`).join(', ');

  db.run(`
    INSERT INTO medical_data (${fields.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT(student_id) DO UPDATE SET ${updateClause}
  `, values, function(err) {
    if (err) return res.status(500).json({ message: 'Ошибка при сохранении данных' });
    res.json({ message: 'Анкета успешно сохранена или обновлена' });
  });
});


// Сохранить визит к врачу
app.post('/api/doctor-visits', upload.single('exemptionFile'), (req, res) => {
  const { doctorId, studentId, visitDate, complaints, isExempted } = req.body;
  if (!doctorId || !studentId || !visitDate || !complaints) 
    return res.status(400).json({ message: 'Заполните все поля' });

  const exemptionFilePath = (isExempted == '1' && req.file)
    ? `/uploads/${req.file.filename}`
    : null;
  if (isExempted == '1' && !req.file)
    return res.status(400).json({ message: 'Файл освобождения обязателен' });

  // Сохраняем визит
  db.run(
    `INSERT INTO doctor_visits
      (doctor_id, student_id, visit_date, complaints, is_exempted, exemption_file)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [doctorId, studentId, visitDate, complaints, isExempted == '1' ? 1 : 0, exemptionFilePath],
    function(err) {
      if (err) 
        return res.status(500).json({ message: 'Ошибка при сохранении визита' });

      const visitId = this.lastID;

      // Получаем ФИО студента
      db.get('SELECT fio FROM students WHERE id = ?', [studentId], (err, studRow) => {
        const studentName = studRow ? studRow.fio : `#${studentId}`;

        // Ищем группу в медицинской анкете
        db.get(
          'SELECT occupation AS group_name FROM medical_data WHERE student_id = ?',
          [studentId],
          (err, mdRow) => {
            if (mdRow && mdRow.group_name) {
              // Выбираем всех кураторов этой группы
              db.all(
                'SELECT id FROM curators WHERE group_name = ?',
                [mdRow.group_name],
                (err, curRows) => {
                  curRows.forEach(cur => {
                    const msg = `Студент ${studentName} посетил врача по причине "${complaints}"`;
                    db.run(
                      'INSERT INTO notifications (curator_id, student_id, message) VALUES (?, ?, ?)',
                      [cur.id, studentId, msg]
                    );
                  });
                }
              );
            }
          }
        );
      });

      res.status(201).json({ message: 'Визит сохранён', visitId });
    }
  );
});

app.get('/api/doctor-visits/doctor/:doctorId', (req, res) => {
  const doctorId = req.params.doctorId;
  db.all(`
    SELECT dv.visit_date, dv.complaints, dv.exemption_file, s.fio AS student_name
    FROM doctor_visits dv
    JOIN students s ON dv.student_id = s.id
    WHERE dv.doctor_id = ?
    ORDER BY dv.visit_date DESC
  `, [doctorId], (err, rows) => {
    if (err) return res.status(500).json({ message: "Ошибка при получении визитов" });
    res.json(rows);
  });
});

// Получить визиты студента
app.get('/api/doctor-visits/student/:studentId', (req, res) => {
  const sql = `SELECT dv.*, d.fio AS doctor_name FROM doctor_visits dv JOIN doctors d ON dv.doctor_id = d.id WHERE dv.student_id = ? ORDER BY dv.visit_date DESC`;
  db.all(sql, [req.params.studentId], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Ошибка при получении визитов' });
    res.json(rows);
  });
});

// Получить уведомления для куратора
app.get('/api/notifications/:curatorId', (req, res) => {
  const curatorId = req.params.curatorId;
  db.all(
    'SELECT * FROM notifications WHERE curator_id = ? ORDER BY created_at DESC',
    [curatorId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Ошибка при получении уведомлений' });
      res.json(rows);
    }
  );
});

// Отметить уведомление как прочитанное
app.post('/api/notifications/:id/read', (req, res) => {
  db.run(
    'UPDATE notifications SET is_read = 1 WHERE id = ?',
    [req.params.id],
    err => {
      if (err) return res.status(500).json({ message: 'Ошибка при обновлении уведомления' });
      res.sendStatus(200);
    }
  );
});

// Новости
app.post('/api/news', upload.single('image'), (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ message: 'Заполните все поля новости' });
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const date = new Date().toISOString();
  db.run(`INSERT INTO news (title, content, date, imageUrl) VALUES (?, ?, ?, ?)`, [title, content, date, imageUrl], function(err) {
    if (err) return res.status(500).json({ message: 'Ошибка при добавлении новости' });
    res.status(201).json({ message: 'Новость добавлена', newsId: this.lastID });
  });
});

app.put('/api/news/:id/simple', (req, res) => {
  const { title, content } = req.body;
  const id = req.params.id;

  if (!title || !content) {
    return res.status(400).json({ message: 'Заполните все поля' });
  }

  db.run(`UPDATE news SET title = ?, content = ? WHERE id = ?`, [title, content, id], function(err) {
    if (err) return res.status(500).json({ message: 'Ошибка при обновлении' });
    res.json({ message: 'Новость обновлена' });
  });
});


app.get('/api/news', (req, res) => {
  db.all("SELECT * FROM news ORDER BY date DESC", (err, rows) => {
    if (err) return res.status(500).json({ message: 'Ошибка при получении новостей' });
    res.json(rows);
  });
});

app.put('/api/news/:id', upload.single('image'), (req, res) => {
  const { title, content } = req.body;
  const id = req.params.id;

  if (!title || !content) {
    return res.status(400).json({ message: 'Заполните все поля' });
  }

  const fields = ['title = ?', 'content = ?'];
  const values = [title, content];

  if (req.file) {
    const imageUrl = `/uploads/${req.file.filename}`;
    fields.push('imageUrl = ?');
    values.push(imageUrl);
  }

  values.push(id);

  db.run(`UPDATE news SET ${fields.join(', ')} WHERE id = ?`, values, function(err) {
    if (err) {
      console.error('Ошибка при обновлении новости:', err.message); // добавь эту строку
      return res.status(500).json({ message: 'Ошибка при обновлении' });
    }
    res.json({ message: 'Новость обновлена' });
  });
});

// Удалить новость
app.delete('/api/news/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM news WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ message: 'Ошибка при удалении новости' });
    if (this.changes === 0) return res.status(404).json({ message: 'Новость не найдена' });
    res.json({ message: 'Новость удалена' });
  });
});

// Профиль студента
app.get('/api/student-profile/:id', (req, res) => {
  const sql = `
    SELECT s.fio, md.occupation AS group_name, md.faculty
    FROM students s
    LEFT JOIN medical_data md ON s.id = md.student_id
    WHERE s.id = ?
  `;
  db.get(sql, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ message: 'Ошибка при получении профиля' });
    if (!row) return res.status(404).json({ message: 'Студент не найден' });
    res.json(row);
  });
});

// Куратор — авторизация
app.post('/api/curator-login', (req, res) => {
  const { login, password } = req.body;
  db.get("SELECT * FROM curators WHERE login = ?", [login], async (err, row) => {
    if (err || !row) return res.status(401).json({ message: 'Неверный логин или пароль' });
    const match = await bcrypt.compare(password, row.password);
    if (!match) return res.status(401).json({ message: 'Неверный логин или пароль' });

    res.json({
      message: 'Авторизация успешна',
      curatorId: row.id,
      fio: row.fio,
      group: row.group_name
    });
  });
});

app.get('/api/curator/xray/:group', (req, res) => {
  const group = req.params.group;
  const sql = `
    SELECT s.fio, xi.image_path 
    FROM students s 
    JOIN medical_data md ON s.id = md.student_id
    JOIN xray_images xi ON s.id = xi.student_id
    WHERE md.occupation = ?
  `;
  db.all(sql, [group], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Ошибка при получении снимков' });
    res.json(rows);
  });
});

// Получить снимки студентов куратора
app.get('/api/curator/students/:groupName', (req, res) => {
  const group = req.params.groupName;

  const sql = `
    SELECT s.id, s.fio, xi.image_path
    FROM students s
    JOIN medical_data md ON s.id = md.student_id
    LEFT JOIN xray_images xi ON s.id = xi.student_id
    WHERE md.occupation = ?
  `;

  db.all(sql, [group], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Ошибка при получении студентов' });
    res.json(rows);
  });
});

// === Кураторы ===
// Получить список кураторов
app.get('/api/curators', (req, res) => {
  db.all('SELECT id, fio, login, email, group_name FROM curators', (err, rows) => {
    if (err) return res.status(500).json({ message: 'Ошибка при получении кураторов' });
    res.json(rows);
  });
});

// Добавить куратора
app.post('/api/curators', async (req, res) => {
  const { fio, login, email, password, group_name } = req.body;
  console.log('POST /api/curators body:', req.body);
  if (!fio || !login || !email || !password || !group_name) {
    return res.status(400).json({ message: 'Все поля обязательны' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO curators (fio, login, password, email, group_name) VALUES (?, ?, ?, ?, ?)',
      [fio, login, hash, email, group_name],
      function(err) {
        if (err) return res.status(500).json({ message: 'Ошибка при добавлении куратора' });
        res.setHeader('Content-Type', 'application/json');
        res.json({ message: 'Куратор успешно добавлен', id: this.lastID });
      }
    );
  } catch (err) {
    console.error('Ошибка сервера при добавлении куратора:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.delete('/api/curators/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM curators WHERE id = ?', [id], function (err) {
    if (err) {
      console.error('Ошибка при удалении куратора:', err);
      return res.status(500).json({ message: 'Ошибка при удалении куратора' });
    }
    res.json({ message: 'Куратор успешно удалён' });
  });
});
app.put('/api/curators/:id', async (req, res) => {
  const id = req.params.id;
  const { login, email, password, group_name } = req.body;

  if (!login || !email || !group_name) {
    return res.status(400).json({ message: 'Обязательные поля отсутствуют' });
  }

  const updateFields = [];
  const values = [];

  if (login) { updateFields.push("login = ?"); values.push(login); }
  if (email) { updateFields.push("email = ?"); values.push(email); }
  if (group_name) { updateFields.push("group_name = ?"); values.push(group_name); }

  if (password) {
    try {
      const hashed = await bcrypt.hash(password, 10);
      updateFields.push("password = ?");
      values.push(hashed);
    } catch (err) {
      console.error("Ошибка при хешировании пароля куратора:", err);
      return res.status(500).json({ message: 'Ошибка при обработке пароля' });
    }
  }

  values.push(id);

  db.run(
    `UPDATE curators SET ${updateFields.join(", ")} WHERE id = ?`,
    values,
    function(err) {
      if (err) {
        console.error('Ошибка при обновлении куратора:', err);
        return res.status(500).json({ message: 'Ошибка обновления' });
      }
      res.json({ message: 'Куратор обновлён' });
    }
  );
});

// Функция для проверки сложности пароля
function isStrongPassword(password) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&     // заглавная буква
    /[a-z]/.test(password) &&     // строчная буква
    /\d/.test(password) &&        // цифра
    /[\W_]/.test(password)        // спецсимвол
  );
}

// Смена пароля для всех ролей
app.post('/api/change-password', async (req, res) => {
  const { role, id, oldPassword, newPassword } = req.body;
  const table = role === 'student' ? 'students' :
                role === 'doctor' ? 'doctors' :
                role === 'curator' ? 'curators' : null;

  if (!table) return res.status(400).json({ message: 'Неверная роль' });

  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({
      message: 'Пароль должен содержать минимум 8 символов, хотя бы одну заглавную букву, строчную букву, цифру и спецсимвол'
    });
  }

  db.get(`SELECT password FROM ${table} WHERE id = ?`, [id], (err, row) => {
    if (err || !row) return res.status(400).json({ message: 'Пользователь не найден' });

    bcrypt.compare(oldPassword, row.password, (err, match) => {
      if (!match) return res.status(400).json({ message: 'Старый пароль неверен' });

      bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
        if (err) return res.status(500).json({ message: 'Ошибка при хешировании пароля' });

        db.run(`UPDATE ${table} SET password = ? WHERE id = ?`, [hashedPassword, id], err => {
          if (err) return res.status(500).json({ message: 'Ошибка при обновлении пароля' });
          res.json({ message: 'Пароль успешно изменён' });
        });
      });
    });
  });
});
// Добавить студента в группу куратора
app.post('/api/assign-student', express.json(), (req, res) => {
  const { curatorId, studentId } = req.body;
  if (!curatorId || !studentId) {
    return res.status(400).json({ message: 'Не указан curatorId или studentId' });
  }
  // Находим группу куратора
  db.get(
    'SELECT group_name FROM curators WHERE id = ?',
    [curatorId],
    (err, row) => {
      if (err || !row) return res.status(400).json({ message: 'Куратор не найден' });
      const group = row.group_name;
      // Пробуем обновить существующую запись
      db.run(
        'UPDATE medical_data SET occupation = ? WHERE student_id = ?',
        [group, studentId],
        function(err) {
          if (err) return res.status(500).json({ message: 'Ошибка при обновлении записи' });
          if (this.changes === 0) {
            // Если записи не было — создаём новую
            db.run(
              'INSERT INTO medical_data (student_id, occupation) VALUES (?, ?)',
              [studentId, group],
              err2 => {
                if (err2) return res.status(500).json({ message: 'Ошибка при создании записи' });
                res.json({ message: 'Студент добавлен в вашу группу' });
              }
            );
          } else {
            res.json({ message: 'Студент добавлен в вашу группу' });
          }
        }
      );
    }
  );
});

app.put('/api/doctors/:id', async (req, res) => {
  const id = req.params.id;
  const { login, email, password } = req.body;

  if (!login || !email) {
    return res.status(400).json({ message: 'Обязательные поля отсутствуют' });
  }

  const updateFields = [];
  const values = [];

  if (login) { updateFields.push("login = ?"); values.push(login); }
  if (email) { updateFields.push("email = ?"); values.push(email); }

  if (password) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push("password = ?");
      values.push(hashedPassword);
    } catch (err) {
      console.error("Ошибка при хешировании пароля:", err);
      return res.status(500).json({ message: 'Ошибка при обработке пароля' });
    }
  }

  values.push(id);

  db.run(
    `UPDATE doctors SET ${updateFields.join(", ")} WHERE id = ?`,
    values,
    function (err) {
      if (err) {
        console.error("Ошибка при обновлении врача:", err);
        return res.status(500).json({ message: 'Ошибка при обновлении врача' });
      }
      res.json({ message: 'Данные врача успешно обновлены' });
    }
  );
});

const fs = require('fs');

app.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'login.html');
  fs.readFile(filePath, (err, data) => {
    if (err) return res.status(500).send('Ошибка при загрузке страницы');
    res.setHeader('Content-Type', 'text/html');
    res.send(data);
  });
});
// Поиск студентов по ФИО, у которых нет анкеты в medical_data
app.get('/api/search-students', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  db.all(
    `SELECT id, fio 
     FROM students 
     WHERE fio LIKE ? 
       AND id NOT IN (SELECT student_id FROM medical_data)
     LIMIT 10`,
    [`%${q}%`],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Ошибка поиска студентов' });
      res.json(rows);
    }
  );
});


// Запуск сервера
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

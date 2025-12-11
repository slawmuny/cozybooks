const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// Настройка папки public
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// База данных
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT, address TEXT, phone TEXT, total_amount INTEGER, date TEXT)`);
});

// === МАРШРУТЫ ===

// Главная страница (на случай если не открылась сама)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- ДАННЫЕ КНИГ (15 ШТУК) ---
const booksData = [
    { id: 1, title: "1984", author: "Дж. Оруэлл", price: 450, genre: "Фантастика", image: "/images/1984.jpg" },
    { id: 2, title: "Мастер и Маргарита", author: "М. Булгаков", price: 600, genre: "Классика", image: "/images/mim.jpg" },
    { id: 3, title: "Богатый папа", author: "Р. Кийосаки", price: 850, genre: "Бизнес", image: "/images/bpbp.jpg" },
    { id: 4, title: "Дюна", author: "Ф. Герберт", price: 900, genre: "Фантастика", image: "/images/duna.jpg" },
    { id: 5, title: "Психология влияния", author: "Р. Чалдини", price: 700, genre: "Психология", image: "/images/pv.jpg" },
    { id: 6, title: "Война и мир", author: "Л. Толстой", price: 1200, genre: "Классика", image: "/images/vim.jpg" },
    { id: 7, title: "Атлант расправил плечи", author: "А. Рэнд", price: 1100, genre: "Бизнес", image: "/images/arp.jpg" },
    { id: 8, title: "Ведьмак", author: "А. Сапковский", price: 750, genre: "Фантастика", image: "/images/vedmak.jpg" },
    { id: 9, title: "Преступление и наказание", author: "Ф. Достоевский", price: 550, genre: "Классика", image: "/images/pin.jpg" },
    { id: 10, title: "Думай и богатей", author: "Н. Хилл", price: 650, genre: "Бизнес", image: "/images/dib.jpg" },
    { id: 11, title: "451° по Фаренгейту", author: "Р. Брэдбери", price: 500, genre: "Фантастика", image: "/images/451.jpg" },
    { id: 12, title: "Игры, в которые играют люди", author: "Э. Берн", price: 600, genre: "Психология", image: "/images/game.jpg" },
    { id: 13, title: "Анна Каренина", author: "Л. Толстой", price: 800, genre: "Классика", image: "/images/ak.jpg" },
    { id: 14, title: "Самый богатый человек в Вавилоне", author: "Дж. Клейсон", price: 450, genre: "Бизнес", image: "/images/rich.jpg" },
    { id: 15, title: "Гарри Поттер и ФК", author: "Дж. Роулинг", price: 950, genre: "Фантастика", image: "/images/hp.jpg" }
];

// API: Список книг
app.get('/api/books', (req, res) => {
    res.json(booksData);
});

// API: Одна книга
app.get('/api/books/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const book = booksData.find(b => b.id === id);
    if (book) res.json(book);
    else res.status(404).json({ error: "Не найдено" });
});

// API: Регистрация
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashed = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hashed], function(err) {
            if (err) return res.status(400).json({ error: "Логин занят" });
            res.json({ message: "Успех", userId: this.lastID, username: username });
        });
    } catch (e) { res.status(500).json({error: "Ошибка сервера"}); }
});

// API: Вход
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (!user) return res.status(400).json({ error: "Пользователь не найден" });
        const match = await bcrypt.compare(password, user.password);
        if (match) res.json({ message: "Успех", userId: user.id, username: user.username });
        else res.status(400).json({ error: "Неверный пароль" });
    });
});

// API: Заказ
app.post('/api/order', (req, res) => {
    // 1. ВЫВОДИМ В КОНСОЛЬ ТО, ЧТО ПРИШЛО ОТ САЙТА
    console.log("--> ПОЛУЧЕН ЗАПРОС НА ЗАКАЗ:");
    console.log(req.body);

    const { userId, name, address, phone, total, date } = req.body;

    // Проверка, что ID пользователя существует
    if (!userId) {
        console.log("ОШИБКА: Нет ID пользователя!");
        return res.status(400).json({ error: "Не авторизован" });
    }

    db.run(
        `INSERT INTO orders (user_id, name, address, phone, total_amount, date) VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, name, address, phone, total, date],
        function(err) { // Используем function(err) чтобы иметь доступ к this
            if (err) {
                // 2. ЕСЛИ ОШИБКА БАЗЫ ДАННЫХ — ПОКАЖЕМ ЕЁ
                console.error("ОШИБКА ЗАПИСИ В БД:", err.message);
                return res.status(500).json({ error: "Ошибка БД" });
            }
            // 3. ЕСЛИ УСПЕХ
            console.log(`УСПЕХ! Заказ записан. ID новой записи: ${this.lastID}`);
            res.json({ message: "Заказ сохранен" });
        }
    );
});

// ЗАПУСК
app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
});
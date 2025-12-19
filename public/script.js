let allBooks = [];
const currentUser = localStorage.getItem('currentUser');
const currentUserId = localStorage.getItem('currentUserId');

const cartKey = currentUserId ? `cart_user_${currentUserId}` : 'cart_guest';
let cart = JSON.parse(localStorage.getItem(cartKey)) || [];

// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    updateCartCounter();
    checkAuthStatus();

    if (document.getElementById('booksContainer')) {
        fetchBooks();
        setupFilters();
    }

    if (document.getElementById('productPage')) {
        loadProductPage();
    }

    if (document.getElementById('cartContainer')) {
        renderCartPage();
        setupCheckoutModal();
    }

    if (document.getElementById('map')) {
        ymaps.ready(initMap);
    }
});


async function fetchBooks() {
    try {
        const res = await fetch('/api/books');
        allBooks = await res.json();
        renderBooks(allBooks);
    } catch (e) { console.error("Ошибка загрузки книг:", e); }
}

function renderBooks(books) {
    const container = document.getElementById('booksContainer');
    container.innerHTML = '';

    if (books.length === 0) {
        container.innerHTML = '<p style="text-align:center; width:100%;">Книги не найдены</p>';
        return;
    }

    books.forEach(book => {
        const card = document.createElement('div');
        card.className = 'book-card';
        // HTML структура подстроена под CSS flex:
        // .book-price имеет margin-top: auto, чтобы оттолкнуться от автора, 
        // и margin-bottom: 20px, чтобы быть посередине между автором и кнопкой
        card.innerHTML = `
            <div class="book-cover">
                <img src="${book.image}" alt="${book.title}" onerror="this.src='https://dummyimage.com/400x600/ccc/fff&text=No+Image'">
            </div>
            <div class="book-title">${book.title}</div>
            <div class="book-author">${book.author}</div>
            
            <div class="book-price">${book.price} ₽</div>
            
            <div class="card-buttons">
                 <button class="btn-main" onclick="addToCart(${book.id})" style="width: 100%;">В корзину</button>
            </div>
        `;
        container.appendChild(card);
    });
}

async function loadProductPage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const container = document.getElementById('productPage');

    if (!id) {
        container.innerHTML = '<p style="text-align:center; padding:50px;">Книга не выбрана.</p>';
        return;
    }

    try {
        const res = await fetch(`/api/books/${id}`);
        if (!res.ok) throw new Error('Книга не найдена');
        const book = await res.json();

        container.innerHTML = `
            <div class="product-container">
                <div class="product-left">
                     <img src="${book.image}" alt="${book.title}" onerror="this.src='https://dummyimage.com/400x600/ccc/fff&text=No+Image'">
                </div>
                <div class="product-right">
                    <span class="product-tag">${book.genre}</span>
                    <h1 style="margin-top: 15px;">${book.title}</h1>
                    <div class="author">Автор: ${book.author}</div>
                    <div class="price" style="margin-top: 40px;">${book.price} ₽</div>
                    
                    <button class="btn-main" onclick="addToCart(${book.id})" style="width: 100%; max-width: 300px;">
                        Добавить в корзину
                    </button>
                    <br><br>
                    <a href="catalog.html" style="color: var(--primary); text-decoration: none;">← Вернуться в каталог</a>
                </div>
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<p style="text-align:center; padding:50px;">Ошибка: ${e.message}</p>`;
    }
}

function saveCartToStorage() {
    localStorage.setItem(cartKey, JSON.stringify(cart));
    updateCartCounter();
}

function addToCart(bookId) {
    if (allBooks.length > 0) {
        const book = allBooks.find(b => b.id === parseInt(bookId));
        if (book) pushToCart(book);
    } else {
        fetch(`/api/books/${bookId}`)
            .then(res => res.json())
            .then(book => pushToCart(book));
    }
}

function pushToCart(book) {
    cart.push(book);
    saveCartToStorage(); 
    showToast(`✅ "${book.title}" добавлена в корзину!`);
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCartToStorage();
    renderCartPage();    
}

// --- ЛОГИКА СЧЕТЧИКА КОРЗИНЫ ---
function updateCartCounter() {
    const el = document.getElementById('cart-count');
    if (el) {
        // Если корзина пуста (0), скрываем (none), иначе показываем (inline-block)
        if (cart.length === 0) {
            el.style.display = 'none';
        } else {
            el.style.display = 'inline-block';
            el.innerText = cart.length;
        }
    }
}

function renderCartPage() {
    const container = document.getElementById('cartContainer');
    const totalEl = document.getElementById('totalSum');
    const checkoutBtn = document.getElementById('openCheckoutBtn');

    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 60px;">
                <div style="font-size: 50px; margin-bottom: 20px;">🛒</div>
                <h3 style="color: var(--text);">Ваша корзина пуста</h3>
                <p style="color: #999;">Самое время выбрать новую книгу!</p>
                <a href="catalog.html" class="btn-main" style="margin-top: 20px;">Перейти в каталог</a>
            </div>
        `;
        if (totalEl) totalEl.innerText = '0';
        if (checkoutBtn) checkoutBtn.style.display = 'none';
        return;
    }

    if (checkoutBtn) checkoutBtn.style.display = 'inline-block';

    container.innerHTML = '';
    let total = 0;

    cart.forEach((book, index) => {
        total += book.price;
        const row = document.createElement('div');
        row.className = 'cart-item-card'; 
        row.innerHTML = `
            <img src="${book.image}" class="cart-item-img" alt="${book.title}" onerror="this.src='https://dummyimage.com/400x600/ccc/fff&text=No+Image'">
            <div class="cart-item-info">
                <div class="cart-item-title">${book.title}</div>
                <div class="cart-item-author">${book.author}</div>
            </div>
            <div class="cart-item-right">
                <div class="cart-item-price">${book.price} ₽</div>
                <button class="btn-remove" onclick="removeFromCart(${index})">Удалить</button>
            </div>
        `;
        container.appendChild(row);
    });

    if (totalEl) totalEl.innerText = total;
}

function setupCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    const btn = document.getElementById('openCheckoutBtn');
    if (!btn) return;

    btn.onclick = () => {
        if (!currentUser) {
            alert('Сначала войдите в аккаунт!');
            window.location.href = 'auth.html';
            return;
        }
        modal.style.display = 'block';
    }

    document.querySelector('.close').onclick = () => modal.style.display = 'none';

    document.getElementById('checkoutForm').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            userId: currentUserId,
            name: document.getElementById('orderName').value,
            address: document.getElementById('orderAddress').value,
            phone: document.getElementById('orderPhone').value,
            total: parseInt(document.getElementById('totalSum').innerText),
            date: new Date().toLocaleDateString()
        };

        try {
            await fetch('/api/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            alert('Заказ оформлен! Менеджер свяжется с вами.');

            cart = []; 
            saveCartToStorage(); 
            
            window.location.href = 'index.html';
        } catch (err) {
            alert('Ошибка оформления заказа');
            console.error(err);
        }
    };
}

function showToast(message) {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function initMap() {
    if (document.getElementById('map').innerHTML !== "") return;
    const myMap = new ymaps.Map("map", {
        center: [59.935634, 30.325916],
        zoom: 14
    });
    const myPlacemark = new ymaps.Placemark([59.935634, 30.325916], {
        balloonContentHeader: "CozyBooks",
        balloonContentBody: "Санкт-Петербург, Невский пр. 28",
        balloonContentFooter: "Ждем вас ежедневно!"
    });
    myMap.geoObjects.add(myPlacemark);
}

function setupFilters() {
    const g = document.getElementById('genreFilter');
    const p = document.getElementById('priceSort');
    if (g && p) {
        const apply = () => {
            let f = [...allBooks];
            if (g.value !== 'all') f = f.filter(b => b.genre === g.value);
            if (p.value === 'asc') f.sort((a, b) => a.price - b.price);
            if (p.value === 'desc') f.sort((a, b) => b.price - a.price);
            renderBooks(f);
        };
        g.onchange = apply; p.onchange = apply;
    }
}

function checkAuthStatus() {
    const authLink = document.getElementById('authLink');
    if (authLink && currentUser) {
        authLink.innerText = currentUser + " (Выход)";
        authLink.href = "#";
        authLink.onclick = (e) => {
            e.preventDefault();
            localStorage.removeItem('currentUser');
            localStorage.removeItem('currentUserId');
            location.reload();
        };
    }
}

// --- ЛОГИКА ВХОДА И РЕГИСТРАЦИИ ---
const authForm = document.getElementById('authForm');
if (authForm) {
    let isLogin = true;
    const toggleBtn = document.getElementById('toggleAuth');
    const title = document.getElementById('formTitle');
    const sBtn = document.getElementById('submitBtn');
    const passConfirm = document.getElementById('passwordConfirm');

    toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        isLogin = !isLogin;
        title.innerText = isLogin ? "Вход" : "Регистрация";
        sBtn.innerText = isLogin ? "Войти" : "Создать аккаунт";
        toggleBtn.innerText = isLogin ? "Нет аккаунта? Зарегистрироваться" : "Есть аккаунт? Войти";
        
        // Показываем или скрываем второе поле пароля
        passConfirm.style.display = isLogin ? 'none' : 'block';
        passConfirm.required = !isLogin;
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('username').value;
        const p = document.getElementById('password').value;
        const pConf = passConfirm.value;

        // Проверка совпадения паролей при регистрации
        if (!isLogin && p !== pConf) {
            document.getElementById('message').innerText = "Пароли не совпадают!";
            return;
        }

        const endpoint = isLogin ? '/api/login' : '/api/register';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u, password: p })
            });
            const data = await res.json();

            if (res.ok) {
                if (isLogin) {
                    localStorage.setItem('currentUser', data.username);
                    localStorage.setItem('currentUserId', data.userId);
                    window.location.href = 'index.html';
                } else {
                    alert('Успех! Теперь войдите.');
                    // Переключаемся обратно на вход
                    toggleBtn.click();
                    document.getElementById('message').innerText = "";
                }
            } else {
                document.getElementById('message').innerText = data.error;
            }
        } catch (err) {
            console.error(err);
            document.getElementById('message').innerText = "Ошибка сервера";
        }
    });
}

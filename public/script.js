// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---
let allBooks = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
const currentUser = localStorage.getItem('currentUser');
const currentUserId = localStorage.getItem('currentUserId');

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

// --- API ---
async function fetchBooks() {
    try {
        const res = await fetch('/api/books');
        allBooks = await res.json();
        renderBooks(allBooks);
    } catch(e) { console.error(e); }
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
        // КНОПКА "ПОДРОБНЕЕ" УДАЛЕНА, "В КОРЗИНУ" РАСТЯНУТА
        card.innerHTML = `
            <div class="book-cover">
                <img src="${book.image}" alt="${book.title}" onerror="this.src='https://dummyimage.com/400x600/ccc/fff&text=No+Image'">
            </div>
            <div class="book-title">${book.title}</div>
            <div class="book-author">${book.author}</div>
            <div class="book-price">${book.price} ₽</div>
            <div class="card-buttons">
                <button class="btn-cart" onclick="addToCart(${book.id})" style="width: 100%;">В корзину</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// --- СТРАНИЦА ТОВАРА (Осталась на случай прямых переходов, но кнопки к ней нет) ---
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
                    <h1>${book.title}</h1>
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

// --- КОРЗИНА ---
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
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCounter();
    alert(`"${book.title}" добавлена в корзину!`);
}

function renderCartPage() {
    const container = document.getElementById('cartContainer');
    const totalEl = document.getElementById('totalSum');
    const checkoutBtn = document.getElementById('openCheckoutBtn');
    
    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:30px;">Корзина пуста</p>';
        totalEl.innerText = '0';
        if(checkoutBtn) checkoutBtn.style.display = 'none';
        return;
    }
    if(checkoutBtn) checkoutBtn.style.display = 'inline-block';

    container.innerHTML = '';
    let total = 0;
    cart.forEach((book, index) => {
        total += book.price;
        const row = document.createElement('div');
        row.className = 'cart-row';
        row.innerHTML = `
            <div style="display:flex; align-items:center; gap:15px;">
                <img src="${book.image}" style="width:50px; height:70px; object-fit:cover; border-radius:5px;">
                <div>
                    <b>${book.title}</b><br>
                    <span style="font-size:0.8rem; color:#888;">${book.author}</span>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:15px;">
                <b>${book.price} ₽</b>
                <button onclick="removeFromCart(${index})" style="background:#ff6b6b; color:white; border:none; width:30px; height:30px; border-radius:50%; cursor:pointer;">✕</button>
            </div>
        `;
        container.appendChild(row);
    });
    totalEl.innerText = total;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCartPage();
    updateCartCounter();
}

function updateCartCounter() {
    const el = document.getElementById('cart-count');
    if(el) el.innerText = cart.length;
}

// --- КАРТА ---
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

// --- AUTH & CHECKOUT ---
function checkAuthStatus() {
    const authLink = document.getElementById('authLink');
    if (authLink && currentUser) {
        authLink.innerText = currentUser + " (Выход)";
        authLink.href = "#";
        authLink.onclick = () => { localStorage.clear(); location.reload(); };
    }
}

function setupFilters() {
    const g = document.getElementById('genreFilter');
    const p = document.getElementById('priceSort');
    if(g && p) {
        const apply = () => {
            let f = [...allBooks];
            if(g.value !== 'all') f = f.filter(b => b.genre === g.value);
            if(p.value === 'asc') f.sort((a,b)=>a.price-b.price);
            if(p.value === 'desc') f.sort((a,b)=>b.price-a.price);
            renderBooks(f);
        };
        g.onchange = apply; p.onchange = apply;
    }
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
        
        await fetch('/api/order', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify(data)
        });
        
        alert('Заказ оформлен! Менеджер свяжется с вами.');
        cart = [];
        localStorage.setItem('cart', JSON.stringify(cart));
        window.location.href = 'index.html';
    };
}

// --- ЛОГИКА АВТОРИЗАЦИИ ---
const authForm = document.getElementById('authForm');
if (authForm) {
    let isLogin = true;
    const toggleBtn = document.getElementById('toggleAuth');
    const title = document.getElementById('formTitle');
    const sBtn = document.getElementById('submitBtn');

    toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        isLogin = !isLogin;
        title.innerText = isLogin ? "Вход" : "Регистрация";
        sBtn.innerText = isLogin ? "Войти" : "Создать аккаунт";
        toggleBtn.innerText = isLogin ? "Нет аккаунта? Зарегистрироваться" : "Есть аккаунт? Войти";
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('username').value;
        const p = document.getElementById('password').value;
        const endpoint = isLogin ? '/api/login' : '/api/register';

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
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
                window.location.reload();
            }
        } else {
            document.getElementById('message').innerText = data.error;
        }
    });
}
//script.js
// Global Application State Matrices
let userSession = { id: '', name: '', role: '' };
let shoppingCart = [];

// DOM Element Registry Mapping                                                                             const authView = document.getElementById('auth-view');
const storeView = document.getElementById('store-view');                                                    const ordersView = document.getElementById('orders-view');
const adminView = document.getElementById('admin-view');                                                    const navActions = document.getElementById('nav-actions');
const btnAdminToggle = document.getElementById('btn-admin-toggle');
const roleBadge = document.getElementById('role-badge');
const notificationBar = document.getElementById('notification-bar');                                        
const productsGrid = document.getElementById('products-grid');
const cartModal = document.getElementById('cart-modal');
const cartItemsList = document.getElementById('cart-items-list');
const cartTotalAmount = document.getElementById('cart-total-amount');
const cartCount = document.getElementById('cart-count');
const ordersListContainer = document.getElementById('orders-list-container');
const adminOrdersList = document.getElementById('admin-orders-list');

// Boot initialization on asset layout mount
document.addEventListener('DOMContentLoaded', () => {
    const cachedUser = localStorage.getItem('ecom_session');
    if (cachedUser) {
        userSession = JSON.parse(cachedUser);
        initializeDashboard();
    }
});

// --- AUTHENTICATION ENGINE ---
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },                                                            body: JSON.stringify({ username, password })
        });                                                                                                         const data = await response.json();
                                                                                                                    if (!response.ok) throw new Error(data.error || 'Login verification failed');

        userSession = { id: data.userId, name: data.username, role: data.role };
        localStorage.setItem('ecom_session', JSON.stringify(userSession));

        document.getElementById('login-form').reset();
        showAlert(`Welcome back, ${userSession.name}!`);
        initializeDashboard();
    } catch (err) {
        showAlert(err.message, true);
    }
});

function initializeDashboard() {
    authView.classList.add('hidden');
    navActions.classList.remove('hidden');
    roleBadge.textContent = userSession.role;

    if (userSession.role === 'admin') {
        btnAdminToggle.classList.remove('hidden');
    } else {
        btnAdminToggle.classList.add('hidden');
    }

    showStoreView();
}

// --- ROUTING CONTROL VIEW toggles ---
function resetAllViews() {
    storeView.classList.add('hidden');
    ordersView.classList.add('hidden');
    adminView.classList.add('hidden');
}                                                                                                           
function showStoreView() {                                                                                      resetAllViews();
    storeView.classList.remove('hidden');                                                                       fetchProductsCatalog();
}

function toggleOrdersView() {
    resetAllViews();
    ordersView.classList.remove('hidden');
    fetchOrderTrackingSummary();
}

function showAdminView() {
    if (userSession.role !== 'admin') return;
    resetAllViews();
    adminView.classList.remove('hidden');
    fetchAdminOrdersSummary();
}

// --- DYNAMIC DATA READ & RENDER ACTIONS ---
async function fetchProductsCatalog() {
    try {
        const response = await fetch('/api/products');
        const items = await response.json();

        productsGrid.innerHTML = '';
        items.forEach(prod => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="product-img-box">
                    <img src="${prod.image}" alt="${prod.name}">
                </div>
                <div class="product-info">
                    <div class="product-title">${prod.name}</div>
                    <div class="product-desc">${prod.description}</div>                                                         <div class="product-price-row">
                        <span class="price-tag">₹${prod.price}</span>
                        <button class="btn-primary" onclick="addItemToCart('${prod.id}', '${escape(prod.name)}', ${prod.price})">🛒 Add to Cart</button>
                    </div>
                </div>
            `;
            productsGrid.appendChild(card);
        });
    } catch (err) {
        showAlert('Catalog generation failed.', true);
    }
}

// --- SHOPPING BASKET DRAWER ACTIONS ---
function toggleCartModal() {
    cartModal.classList.toggle('hidden');
    renderCartDrawerList();
}

function addItemToCart(id, rawName, price) {
    const name = unescape(rawName);
    const existingItem = shoppingCart.find(item => item.id === id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        shoppingCart.push({ id, name, price, quantity: 1 });
    }
    updateCartIconCount();
    showAlert(`${name} added to cart!`);
}

function updateCartIconCount() {
    const totalCount = shoppingCart.reduce((sum, item) => sum + item.quantity, 0);                              cartCount.textContent = totalCount;
}                                                                                                           
function removeCartItem(id) {
    shoppingCart = shoppingCart.filter(item => item.id !== id);
    updateCartIconCount();
    renderCartDrawerList();
}

function renderCartDrawerList() {
    cartItemsList.innerHTML = '';
    let accumulatedTotal = 0;

    if (shoppingCart.length === 0) {
        cartItemsList.innerHTML = '<p style="text-align:center; padding:30px; color:#64748b;">Your shopping cart is empty.</p>';
        cartTotalAmount.textContent = '₹0';
        return;
    }

    shoppingCart.forEach(item => {
        accumulatedTotal += item.price * item.quantity;
        const row = document.createElement('div');
        row.className = 'cart-item';
        row.innerHTML = `
            <div>
                <h4>${item.name}</h4>
                <small style="color:#94a3b8;">₹${item.price} x ${item.quantity}</small>
            </div>
            <button class="btn-danger" style="padding: 5px 10px;" onclick="removeCartItem('${item.id}')">Remove</button>
        `;
        cartItemsList.appendChild(row);
    });
    cartTotalAmount.textContent = `₹${accumulatedTotal}`;                                                   }
                                                                                                            // --- SECURE DISPATCH CHECKOUTS ---
async function checkoutCart() {                                                                                 if (shoppingCart.length === 0) return;
                                                                                                                try {
        const response = await fetch('/api/orders', {                                                                   method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userSession.id,
                username: userSession.name,
                cart: shoppingCart
            })
        });

        if (!response.ok) throw new Error('Checkout parsing crashed');

        shoppingCart = [];
        updateCartIconCount();
        toggleCartModal();
        showAlert('Order placed successfully! Tracking active.');
        toggleOrdersView();
    } catch (err) {
        showAlert('Checkout transaction terminated.', true);
    }
}

// --- ORDER STATUS LIST INTERACTION ---
async function fetchOrderTrackingSummary() {
    try {
        const response = await fetch('/api/orders', {
            headers: { 'user-role': userSession.role, 'user-name': userSession.name }
        });
        const orderLogs = await response.json();

        ordersListContainer.innerHTML = '';
        if(orderLogs.length === 0) {
            ordersListContainer.innerHTML = '<div class="card"><p style="color:#94a3b8; text-align:center;">No processing orders found under this registry account.</p></div>';
            return;                                                                                                 }
                                                                                                                    orderLogs.forEach(order => {
            const card = document.createElement('div');                                                                 card.className = 'order-card';
            card.innerHTML = `
                <div class="order-meta">
                    <span>ID: <strong>${order.orderId}</strong></span>
                    <span>Date: ${order.date}</span>
                    <span class="badge" style="background-color:#16a34a;">${order.status}</span>
                </div>
                <div class="order-items-summary">
                    ${order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                </div>
                <div style="text-align:right; font-weight:600; color:#38bdf8;">Total paid: ₹${order.total}</div>
            `;
            ordersListContainer.appendChild(card);
        });
    } catch (err) {
        showAlert('Could not load order tracking metrics.', true);
    }
}

// --- MANAGER ADMINISTRATION CATALOG WRITE EXTENSIONS ---
document.getElementById('add-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('prod-name').value.trim();
    const price = document.getElementById('prod-price').value;
    const stock = document.getElementById('prod-stock').value;
    const description = document.getElementById('prod-desc').value.trim();
    const image = document.getElementById('prod-image').value.trim();

    try {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: {                                                                                                      'Content-Type': 'application/json',
                'user-role': userSession.role                                                                           },
            body: JSON.stringify({ name, price, stock, description, image })                                        });
                                                                                                                    if (!response.ok) throw new Error('Access denied or validation schema failure.');

        document.getElementById('add-product-form').reset();                                                        showAlert('New product injected successfully into database.');
        showStoreView();                                                                                        } catch (err) {
        showAlert(err.message, true);
    }
});

async function fetchAdminOrdersSummary() {
    try {
        const response = await fetch('/api/orders', {
            headers: { 'user-role': userSession.role, 'user-name': userSession.name }
        });
        const allLogs = await response.json();

        adminOrdersList.innerHTML = '';
        if(allLogs.length === 0) {
            adminOrdersList.innerHTML = '<p style="color:#94a3b8; margin-top:15px; text-align:center;">No client purchases registered in this engine cycle.</p>';
            return;
        }

        allLogs.forEach(order => {
            const block = document.createElement('div');
            block.style.borderBottom = '1px solid #334155';
            block.style.padding = '10px 0';
            block.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:#94a3b8;">
                    <span>User: <strong>${order.username}</strong></span>
                    <span>Total: ₹${order.total}</span>
                </div>
                <div style="font-size:0.9rem; margin-top:4px;">Items: ${order.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}</div>
            `;
            adminOrdersList.appendChild(block);
        });
    } catch (err) {
        showAlert('Could not fetch administrator logs.', true);
    }
}

// --- GLOBAL NOTIFICATION MODULES ---
function showAlert(text, isError = false) {
    notificationBar.textContent = text;
    notificationBar.style.backgroundColor = isError ? '#ef4444' : '#0284c7';
    notificationBar.classList.remove('hidden');
    setTimeout(() => notificationBar.classList.add('hidden'), 3500);
}

function logout() {
    userSession = { id: '', name: '', role: '' };
    shoppingCart = [];
    localStorage.removeItem('ecom_session');
    updateCartIconCount();
    navActions.classList.add('hidden');
    authView.classList.remove('hidden');
    resetAllViews();
}

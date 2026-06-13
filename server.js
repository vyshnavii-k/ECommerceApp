//server.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = 8080; // Running safely on 3000 for Termux testing

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// --- DATABASE MODELS SETUP (Simulated Mongoose Schemas for Portability) ---
let users = [
    { id: "1", username: "admin", password: "123", role: "admin" },
    { id: "2", username: "user", password: "123", role: "user" }
];

let products = [
    { id: "101", name: "Premium Wireless Earbuds", price: 2999, description: "High-quality sound with deep bass.", stock: 15, image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80" },
    { id: "102", name: "Minimalist Smart Watch", price: 4999, description: "Track your fitness, sleep, and heart rate.", stock: 8, image: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=500&q=80" },
    { id: "103", name: "Ergonomic Mechanical Keyboard", price: 3499, description: "Tactile typing experience with RGB lighting.", stock: 12, image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&q=80" }
];

let orders = [];

// --- AUTHENTICATION API ---
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }
    res.json({ message: 'Login successful', username: user.username, role: user.role, userId: user.id });
});

// --- PRODUCTS API (User Read, Admin CRUD) ---
app.get('/api/products', (req, res) => {
    res.json(products);
});

// Admin Add Product
app.post('/api/products', (req, res) => {
    const role = req.headers['user-role'];
    if (role !== 'admin') return res.status(403).json({ error: 'Access Denied: Admins Only' });

    const { name, price, description, image, stock } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Name and price required' });

    const newProduct = {
        id: Date.now().toString(),
        name,
        price: Number(price),
        description: description || '',
        stock: Number(stock) || 10,
        image: image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80'
    };
    products.push(newProduct);
    res.status(201).json(newProduct);
});

// Admin Delete Product
app.delete('/api/products/:id', (req, res) => {
    const role = req.headers['user-role'];
    if (role !== 'admin') return res.status(403).json({ error: 'Access Denied' });

    const { id } = req.params;
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return res.status(404).json({ error: 'Product not found' });

    products.splice(index, 1);
    res.json({ message: 'Product deleted successfully' });
});

// --- ORDERS API (User Checkout, Admin Read) ---
app.post('/api/orders', (req, res) => {
    const { userId, username, cart } = req.body;
    if (!cart || cart.length === 0) return res.status(400).json({ error: 'Cart is empty' });

    let totalAmount = 0;
    cart.forEach(item => {
        totalAmount += item.price * item.quantity;
        // Reduce stock locally
        const prod = products.find(p => p.id === item.id);
        if (prod) prod.stock = Math.max(0, prod.stock - item.quantity);
    });

    const newOrder = {
        orderId: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
        userId,
        username,
        items: cart,
        total: totalAmount,
        status: 'Processing',
        date: new Date().toLocaleDateString()
    };

    orders.unshift(newOrder);
    res.status(201).json(newOrder);
});
                                                                                                            // Fetch Orders (Admin sees all, User sees their own)
app.get('/api/orders', (req, res) => {
    const role = req.headers['user-role'];
    const username = req.headers['user-name'];

    if (role === 'admin') {
        res.json(orders);
    } else {
        const userOrders = orders.filter(o => o.username === username);
        res.json(userOrders);
    }                                                                                                       });

app.listen(PORT, () => {                                                                                        console.log(`E-Commerce Store Backend running at http://localhost:${PORT}`);
});

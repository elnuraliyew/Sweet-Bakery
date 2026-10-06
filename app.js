// app.js
// Main client‑side logic for login handling, auth guard, and catalogue rendering

// Ensure Firebase SDKs are loaded before this script runs (deferred in HTML)

// Helper to show a toast/error message
function showMessage(msg, isError = false) {
  const container = document.createElement('div');
  container.textContent = msg;
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.left = '50%';
  container.style.transform = 'translateX(-50%)';
  container.style.padding = '0.75rem 1.5rem';
  container.style.background = isError ? '#d9534f' : '#5cb85c';
  container.style.color = '#fff';
  container.style.borderRadius = '8px';
  container.style.zIndex = 1000;
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 3000);
}

// -------- Login page logic (login.html) --------
if (document.getElementById('loginForm')) {
  const loginForm = document.getElementById('loginForm');
  const errorMsg = document.getElementById('errorMsg');
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;
    try {
      await firebase.auth().signInWithEmailAndPassword(email, password);
      // Successful login – redirect to home page
      window.location.href = 'index.html';
    } catch (err) {
      console.error(err);
      errorMsg.textContent = err.message;
    }
  });
}

// -------- Home page logic (index.html) --------
function initHomePage(user) {
  // Load categories & products, set up UI listeners
  loadCategories();
  loadProducts();
  // Optional logout button (you can add one in the UI)
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await firebase.auth().signOut();
      window.location.href = 'login.html';
    });
  }
}

// Load categories from Firestore and render as filter buttons
async function loadCategories() {
  const catContainer = document.getElementById('categoryContainer');
  if (!catContainer) return;
  try {
    const snapshot = await firebase.firestore().collection('categories').get();
    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Add an "All" button
    const allBtn = document.createElement('button');
    allBtn.textContent = 'Bütün Kateqoriyalar';
    allBtn.dataset.id = 'all';
    allBtn.classList.add('active');
    catContainer.appendChild(allBtn);
    allBtn.addEventListener('click', () => renderProducts('all'));
    // Render each category
    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.textContent = cat.name;
      btn.dataset.id = cat.id;
      catContainer.appendChild(btn);
      btn.addEventListener('click', () => renderProducts(cat.id));
    });
  } catch (err) {
    console.error('Failed to load categories', err);
    showMessage('Kateqoriyalar yüklənmədi', true);
  }
}

// Load all products (we keep them in memory for filtering)
let allProducts = [];
async function loadProducts() {
  const prodContainer = document.getElementById('productContainer');
  if (!prodContainer) return;
  try {
    const snapshot = await firebase.firestore().collection('products').get();
    allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderProducts('all');
  } catch (err) {
    console.error('Failed to load products', err);
    showMessage('Məhsullar yüklənmədi', true);
  }
}

// Render products filtered by categoryId (or all)
function renderProducts(filterId) {
  const container = document.getElementById('productContainer');
  container.innerHTML = '';
  const filtered = filterId === 'all' ? allProducts : allProducts.filter(p => p.categoryId === filterId);
  filtered.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    // Delay adding 'show' class for fade‑in effect
    setTimeout(() => card.classList.add('show'), 50);
    card.innerHTML = `
      <img src="${p.imageUrl}" alt="${p.name}" />
      <h3>${p.name}</h3>
      <p>${p.description}</p>
      <div class="price">${p.price} ₼</div>
    `;
    container.appendChild(card);
  });
}

// -------- Auth guard – runs on every page that includes app.js --------
firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    // If we are on a page that requires authentication, redirect to login
    const path = window.location.pathname.toLowerCase();
    if (!path.endsWith('login.html')) {
      window.location.href = 'login.html';
    }
    return;
  }
  // If we are on the home page, initialise UI
  if (document.getElementById('categoryContainer')) {
    initHomePage(user);
  }
});

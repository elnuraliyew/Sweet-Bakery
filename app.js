// app.js - Sweet Bakery Əsas Müştəri Məntiqi, Səbət, Sevimlilər və Məhsul Detalı

const ADMIN_EMAILS = [
  'admin@bakery.com',
  'admin@sweetbakery.az',
  'elnuraliyew@gmail.com'
];

// İlkin kateqoriyalar (şəkildə olanlar)
const DEFAULT_CATEGORIES = [
  'Şokoladlı Tortlar',
  'Meyvəli & Giləmeyvəli',
  'Toy & Nişan Tortları',
  'Bento Tortlar'
];

let currentCategory = 'all';
let productsList = [];
let categoriesList = [];

// Səbət və Sevimlilər vəziyyəti (LocalStorage ilə saxlanılır)
let cart = JSON.parse(localStorage.getItem('sweet_bakery_cart') || '[]');
let wishlist = JSON.parse(localStorage.getItem('sweet_bakery_wishlist') || '[]');
let selectedDetailProduct = null;
let currentDetailQty = 1;

// Səhifə başladıldıqda
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  initAuthUI();
  initCartAndWishlistUI();
  updateBadgeCounts();
});

// Toast Bildiriş Funksiyası
function showToast(text, isError = false) {
  const toast = document.createElement('div');
  toast.innerHTML = `<i class="fa-solid ${isError ? 'fa-circle-xmark' : 'fa-circle-check'}"></i> ${text}`;
  toast.style.cssText = `
    position: fixed;
    bottom: 25px;
    right: 25px;
    background: ${isError ? '#c5221f' : '#137333'};
    color: #fff;
    padding: 0.9rem 1.6rem;
    border-radius: 12px;
    font-weight: 600;
    font-size: 0.95rem;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    z-index: 100000;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    animation: fadeIn 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ----------------------------------------------------
// 1. Kateqoriyalar və Məhsulların Yüklənməsi
// ----------------------------------------------------
async function initApp() {
  await loadCategories();
  await loadProducts();
}

async function loadCategories() {
  const container = document.getElementById('categoryContainer');
  if (!container) return;

  try {
    const snapshot = await db.collection('categories').get();
    
    // Əgər bazada kateqoriya yoxdursa, şəkildəki kateqoriyaları bazaya avtomatik yazırıq
    if (snapshot.empty) {
      const batch = db.batch();
      const createdCats = [];
      for (const catName of DEFAULT_CATEGORIES) {
        const docRef = db.collection('categories').doc();
        batch.set(docRef, { name: catName, createdAt: new Date() });
        createdCats.push({ id: docRef.id, name: catName });
      }
      await batch.commit();
      categoriesList = createdCats;
    } else {
      categoriesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    container.innerHTML = `
      <button class="category-pill ${currentCategory === 'all' ? 'active' : ''}" data-category="all">
        Bütün Tortlar
      </button>
    `;

    categoriesList.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `category-pill ${currentCategory === cat.id ? 'active' : ''}`;
      btn.dataset.category = cat.id;
      btn.textContent = cat.name;
      btn.addEventListener('click', () => filterByCategory(cat.id, btn));
      container.appendChild(btn);
    });

    container.querySelector('[data-category="all"]').addEventListener('click', function() {
      filterByCategory('all', this);
    });

  } catch (error) {
    console.warn('Kateqoriya yüklənməsi xətası:', error);
  }
}

async function loadProducts() {
  const grid = document.getElementById('productContainer');
  if (!grid) return;

  try {
    const snapshot = await db.collection('products').get();

    if (snapshot.empty) {
      // Əgər admin hələ tort əlavə etməyibsə, şəkildəki kateqoriyalara uyğun gözəl nümunələr
      const chocCat = categoriesList.find(c => c.name.includes('Şokoladlı')) || { id: 'cat-choc', name: 'Şokoladlı Tortlar' };
      const berryCat = categoriesList.find(c => c.name.includes('Meyvəli')) || { id: 'cat-berry', name: 'Meyvəli & Giləmeyvəli' };
      const weddingCat = categoriesList.find(c => c.name.includes('Toy')) || { id: 'cat-wedding', name: 'Toy & Nişan Tortları' };
      const bentoCat = categoriesList.find(c => c.name.includes('Bento')) || { id: 'cat-bento', name: 'Bento Tortlar' };

      productsList = [
        {
          id: 'demo-1',
          name: 'Belçika Şokoladlı Zəriflik',
          description: 'Həqiqi Belçika südlü şokoladı, qozlu biskvit və zərif qanaş kremi.',
          price: 55,
          imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
          categoryId: chocCat.id,
          categoryName: chocCat.name
        },
        {
          id: 'demo-2',
          name: 'Qırmızı Məxmər & Moruq',
          description: 'Klassik Red Velvet biskviti, maskarpone pendirli krem və təbii təzə moruq.',
          price: 60,
          imageUrl: 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=800&q=80',
          categoryId: berryCat.id,
          categoryName: berryCat.name
        },
        {
          id: 'demo-3',
          name: 'Kraliça Gilaslı Bento',
          description: 'Fərdi miniatür bento tortu, yüngül vanilli mus və təzə giləmeyvələr.',
          price: 28,
          imageUrl: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=800&q=80',
          categoryId: bentoCat.id,
          categoryName: bentoCat.name
        },
        {
          id: 'demo-4',
          name: 'Zərif Pastel Toy Tortu',
          description: '2 mərtəbəli, qızılı vərəq və canlı güllərlə bəzədilmiş xüsusi gün şedevri.',
          price: 180,
          imageUrl: 'https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&w=800&q=80',
          categoryId: weddingCat.id,
          categoryName: weddingCat.name
        },
        {
          id: 'demo-5',
          name: 'Püstəli & Moruqlu Ekstaz',
          description: 'Təbii Antep püstəsi pastası, moruq konfisi və xırtıldayan laylar.',
          price: 65,
          imageUrl: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80',
          categoryId: berryCat.id,
          categoryName: berryCat.name
        },
        {
          id: 'demo-6',
          name: 'Karamel & Truffel Şokolad',
          description: 'Duzlu karamel qatı, qara şokoladlı muss və truffel topları ilə.',
          price: 58,
          imageUrl: 'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?auto=format&fit=crop&w=800&q=80',
          categoryId: chocCat.id,
          categoryName: chocCat.name
        }
      ];
    } else {
      productsList = snapshot.docs.map(doc => {
        const data = doc.data();
        const cat = categoriesList.find(c => c.id === data.categoryId);
        return {
          id: doc.id,
          ...data,
          categoryName: cat ? cat.name : 'Tort'
        };
      });
    }

    renderProducts();

  } catch (error) {
    console.error('Məhsul yüklənməsi xətası:', error);
    grid.innerHTML = `
      <div class="empty-state">
        <p>Məhsullar yüklənərkən xəta baş verdi. Zəhmət olmasa bir az sonra yenidən cəhd edin.</p>
      </div>
    `;
  }
}

function filterByCategory(categoryId, clickedBtn) {
  currentCategory = categoryId;
  document.querySelectorAll('.category-pill').forEach(btn => btn.classList.remove('active'));
  if (clickedBtn) clickedBtn.classList.add('active');
  renderProducts();
}

function renderProducts() {
  const grid = document.getElementById('productContainer');
  if (!grid) return;

  const filtered = currentCategory === 'all' 
    ? productsList 
    : productsList.filter(p => p.categoryId === currentCategory);

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <p><i class="fa-regular fa-face-smile"></i> Bu kateqoriyada hələlik məhsul yoxdur.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = '';

  filtered.forEach((prod, index) => {
    const isFav = wishlist.some(item => item.id === prod.id);
    const card = document.createElement('div');
    card.className = 'product-card';

    card.innerHTML = `
      <div class="card-img-wrap card-clickable" onclick="openProductDetail('${prod.id}')">
        <img src="${prod.imageUrl}" alt="${prod.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80'" />
        <span class="card-badge">${prod.categoryName || 'Eksklüziv'}</span>
        <button class="btn-fav-card ${isFav ? 'active' : ''}" onclick="toggleWishlist('${prod.id}', event)" title="Sevimlilərə əlavə et">
          <i class="${isFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}"></i>
        </button>
      </div>
      <div class="card-body">
        <h3 class="card-clickable" onclick="openProductDetail('${prod.id}')">${prod.name}</h3>
        <p class="card-clickable" onclick="openProductDetail('${prod.id}')">${prod.description}</p>
        <div class="card-footer">
          <div class="card-price">${prod.price} <span>AZN / kq</span></div>
          <button onclick="addToCart('${prod.id}', 1)" class="btn-order" style="border:none; cursor:pointer;">
            <i class="fa-solid fa-basket-shopping"></i> Səbətə At
          </button>
        </div>
      </div>
    `;

    grid.appendChild(card);

    setTimeout(() => {
      card.classList.add('loaded');
    }, index * 60);
  });
}

// ----------------------------------------------------
// 2. MƏHSULA TAM ŞƏKİLDƏ BAXIŞ (QUICK VIEW MODAL)
// ----------------------------------------------------
window.openProductDetail = function(productId) {
  const prod = productsList.find(p => p.id === productId);
  if (!prod) return;

  selectedDetailProduct = prod;
  currentDetailQty = 1;

  document.getElementById('detailImg').src = prod.imageUrl;
  document.getElementById('detailCat').textContent = prod.categoryName || 'Eksklüziv';
  document.getElementById('detailName').textContent = prod.name;
  document.getElementById('detailPrice').textContent = `Kiloqramı: ${prod.price} AZN`;
  document.getElementById('detailDesc').textContent = prod.description;
  document.getElementById('detailQty').textContent = `${currentDetailQty} kq`;

  // Favori vəziyyəti
  const isFav = wishlist.some(item => item.id === prod.id);
  const favBtn = document.getElementById('modalFavBtn');
  favBtn.innerHTML = `<i class="${isFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}" style="${isFav ? 'color:#e63946;' : ''}"></i>`;
  favBtn.onclick = () => {
    toggleWishlist(prod.id);
    const updatedFav = wishlist.some(item => item.id === prod.id);
    favBtn.innerHTML = `<i class="${updatedFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}" style="${updatedFav ? 'color:#e63946;' : ''}"></i>`;
  };

  // Səbətə əlavə et düyməsi
  const addBtn = document.getElementById('modalAddToCartBtn');
  addBtn.onclick = () => {
    addToCart(prod.id, currentDetailQty);
    closeProductModal();
  };

  document.getElementById('productDetailModal').classList.add('active');
};

window.closeProductModal = function() {
  const modal = document.getElementById('productDetailModal');
  if (modal) modal.classList.remove('active');
};

window.changeDetailQty = function(delta) {
  currentDetailQty = Math.max(0.5, +(currentDetailQty + delta).toFixed(1));
  document.getElementById('detailQty').textContent = `${currentDetailQty} kq`;
};

// ----------------------------------------------------
// 3. SƏBƏT (CART) İDARƏETMƏSİ
// ----------------------------------------------------
function initCartAndWishlistUI() {
  // Səbəti Aç / Bağla
  const openCartBtn = document.getElementById('openCartBtn');
  const cartDrawerBackdrop = document.getElementById('cartDrawerBackdrop');
  if (openCartBtn) openCartBtn.addEventListener('click', openCartDrawer);
  if (cartDrawerBackdrop) {
    cartDrawerBackdrop.addEventListener('click', (e) => {
      if (e.target === cartDrawerBackdrop) closeCartDrawer();
    });
  }

  // Sevimliləri Aç / Bağla
  const openWishlistBtn = document.getElementById('openWishlistBtn');
  const wishlistModal = document.getElementById('wishlistModal');
  if (openWishlistBtn) openWishlistBtn.addEventListener('click', openWishlistModal);
  if (wishlistModal) {
    wishlistModal.addEventListener('click', (e) => {
      if (e.target === wishlistModal) closeWishlistModal();
    });
  }
}

window.openCartDrawer = function() {
  renderCartDrawer();
  document.getElementById('cartDrawerBackdrop').classList.add('active');
};

window.closeCartDrawer = function() {
  document.getElementById('cartDrawerBackdrop').classList.remove('active');
};

window.addToCart = function(productId, qty = 1) {
  const prod = productsList.find(p => p.id === productId);
  if (!prod) return;

  const existing = cart.find(item => item.id === prod.id);
  if (existing) {
    existing.qty = +(existing.qty + qty).toFixed(1);
  } else {
    cart.push({
      id: prod.id,
      name: prod.name,
      price: prod.price,
      imageUrl: prod.imageUrl,
      qty: qty
    });
  }

  saveCart();
  updateBadgeCounts();
  showToast(`"${prod.name}" (${qty} kq) səbətə əlavə edildi!`);
  openCartDrawer();
};

window.updateCartQty = function(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;

  item.qty = +(item.qty + delta).toFixed(1);
  if (item.qty <= 0) {
    cart = cart.filter(i => i.id !== productId);
  }

  saveCart();
  updateBadgeCounts();
  renderCartDrawer();
};

window.removeFromCart = function(productId) {
  cart = cart.filter(i => i.id !== productId);
  saveCart();
  updateBadgeCounts();
  renderCartDrawer();
  showToast('Məhsul səbətdən çıxarıldı.');
};

function saveCart() {
  localStorage.setItem('sweet_bakery_cart', JSON.stringify(cart));
}

function renderCartDrawer() {
  const container = document.getElementById('cartItemsContainer');
  const totalEl = document.getElementById('cartTotalPrice');
  const waBtn = document.getElementById('cartWhatsAppOrderBtn');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty-box">
        <i class="fa-solid fa-basket-shopping"></i>
        <h4>Səbətiniz boşdur</h4>
        <p style="font-size:0.85rem; margin-top:0.4rem;">Ləzzətli tortlarımızdan seçib səbətə əlavə edin.</p>
      </div>
    `;
    totalEl.textContent = '0 AZN';
    waBtn.style.display = 'none';
    return;
  }

  waBtn.style.display = 'flex';
  container.innerHTML = '';
  let subtotal = 0;
  let orderSummaryText = 'Salam Sweet Bakery! Səbətimdəki tortları sifariş vermək istəyirəm:%0A%0A';

  cart.forEach(item => {
    const itemTotal = +(item.price * item.qty).toFixed(1);
    subtotal += itemTotal;
    orderSummaryText += `🍰 *${item.name}* — ${item.qty} kq (${itemTotal} AZN)%0A`;

    const row = document.createElement('div');
    row.className = 'cart-item-card';
    row.innerHTML = `
      <img src="${item.imageUrl}" class="cart-item-img" onerror="this.src='https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=100&q=80'" />
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <div class="item-unit-price">${item.price} AZN / kq</div>
        <div class="cart-item-ctrl">
          <button onclick="updateCartQty('${item.id}', -0.5)">-</button>
          <span style="font-size:0.85rem; font-weight:700; min-width:32px; text-align:center;">${item.qty} kq</span>
          <button onclick="updateCartQty('${item.id}', 0.5)">+</button>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-weight:700; color:var(--dusty-rose); font-size:1rem; margin-bottom:0.4rem;">${itemTotal} AZN</div>
        <button onclick="removeFromCart('${item.id}')" style="background:none; border:none; color:#c5221f; cursor:pointer;" title="Sil">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;
    container.appendChild(row);
  });

  subtotal = subtotal.toFixed(1);
  orderSummaryText += `%0A💰 *Ümumi Məbləğ:* ${subtotal} AZN%0AZəhmət olmasa sifarişi qəbul edəsiniz.`;
  totalEl.textContent = `${subtotal} AZN`;
  waBtn.href = `https://wa.me/994703676561?text=${orderSummaryText}`;
}


// ----------------------------------------------------
// 4. SEVİMLİLƏR (WISHLIST) İDARƏETMƏSİ
// ----------------------------------------------------
window.toggleWishlist = function(productId, event) {
  if (event) event.stopPropagation();

  const prod = productsList.find(p => p.id === productId);
  if (!prod) return;

  const index = wishlist.findIndex(item => item.id === prod.id);
  if (index > -1) {
    wishlist.splice(index, 1);
    showToast(`"${prod.name}" favorilərdən çıxarıldı.`);
  } else {
    wishlist.push({
      id: prod.id,
      name: prod.name,
      price: prod.price,
      imageUrl: prod.imageUrl,
      categoryName: prod.categoryName
    });
    showToast(`"${prod.name}" favorilərə əlavə edildi! ❤️`);
  }

  localStorage.setItem('sweet_bakery_wishlist', JSON.stringify(wishlist));
  updateBadgeCounts();
  renderProducts();
  renderWishlistModal();
};

window.openWishlistModal = function() {
  renderWishlistModal();
  document.getElementById('wishlistModal').classList.add('active');
};

window.closeWishlistModal = function() {
  document.getElementById('wishlistModal').classList.remove('active');
};

function renderWishlistModal() {
  const container = document.getElementById('wishlistContainer');
  if (!container) return;

  if (wishlist.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 3rem 1rem; color:var(--choco-muted);">
        <i class="fa-regular fa-heart" style="font-size:2.5rem; color:var(--dusty-rose); margin-bottom:0.8rem;"></i>
        <p>Hələ heç bir tortu sevimlilərə əlavə etməmisiniz.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  wishlist.forEach(item => {
    const row = document.createElement('div');
    row.className = 'cart-item-card';
    row.innerHTML = `
      <img src="${item.imageUrl}" class="cart-item-img" />
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <div style="font-weight:700; color:var(--dusty-rose);">${item.price} AZN</div>
      </div>
      <div style="display:flex; gap:0.5rem; align-items:center;">
        <button onclick="addToCart('${item.id}', 1); closeWishlistModal();" class="btn-order" style="border:none; cursor:pointer; font-size:0.8rem; padding:0.4rem 0.8rem;">
          <i class="fa-solid fa-basket-shopping"></i> Səbətə At
        </button>
        <button onclick="toggleWishlist('${item.id}')" style="background:none; border:none; color:#c5221f; cursor:pointer; padding:0.4rem;" title="Sil">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;
    container.appendChild(row);
  });
}

function updateBadgeCounts() {
  const cartBadge = document.getElementById('cartCount');
  const wishBadge = document.getElementById('wishlistCount');

  const totalCartItems = cart.reduce((acc, item) => acc + item.qty, 0);
  if (cartBadge) cartBadge.textContent = totalCartItems;
  if (wishBadge) wishBadge.textContent = wishlist.length;
}

// ----------------------------------------------------
// 5. Vahid Giriş / Qeydiyyat və İstifadəçi Təhlili (Auth)
// ----------------------------------------------------
function initAuthUI() {
  const modal = document.getElementById('authModal');
  const openBtn = document.getElementById('openAuthModalBtn');
  const closeBtn = document.getElementById('closeAuthModalBtn');
  const loginForm = document.getElementById('userLoginForm');
  const registerForm = document.getElementById('userRegisterForm');

  if (openBtn) openBtn.addEventListener('click', () => openAuthModal('login'));
  if (closeBtn) closeBtn.addEventListener('click', closeAuthModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeAuthModal();
    });
  }

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);

  auth.onAuthStateChanged(async (user) => {
    updateNavbarAuthState(user);
  });
}

window.openAuthModal = function(tab = 'login') {
  const modal = document.getElementById('authModal');
  if (!modal) return;
  switchAuthTab(tab);
  document.getElementById('authStatusMsg').innerHTML = '';
  modal.classList.add('active');
};

window.closeAuthModal = function() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.remove('active');
};

window.switchAuthTab = function(type) {
  const loginPanel = document.getElementById('loginPanel');
  const registerPanel = document.getElementById('registerPanel');
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabRegisterBtn = document.getElementById('tabRegisterBtn');
  const statusMsg = document.getElementById('authStatusMsg');
  if (statusMsg) statusMsg.innerHTML = '';

  if (type === 'login') {
    loginPanel.classList.add('active');
    registerPanel.classList.remove('active');
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
  } else {
    registerPanel.classList.add('active');
    loginPanel.classList.remove('active');
    tabRegisterBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
  }
};

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPassword').value;
  const statusMsg = document.getElementById('authStatusMsg');

  try {
    statusMsg.innerHTML = '<span style="color:#666;"><i class="fa-solid fa-spinner fa-spin"></i> Yoxlanılır...</span>';
    const userCredential = await auth.signInWithEmailAndPassword(email, pass);
    const user = userCredential.user;

    closeAuthModal();

    if (isAdminUser(user)) {
      showToast(`Xoş gəldiniz, Admin! İdarəetmə Paneli aktivdir. 👑`);
    } else {
      showToast(`Xoş gəldiniz, ${user.displayName || user.email}!`);
    }
  } catch (err) {
    console.error(err);
    statusMsg.innerHTML = `<span style="color:#c5221f;"><i class="fa-solid fa-triangle-exclamation"></i> E-poçt və ya şifrə yanlışdır.</span>`;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const fullName = document.getElementById('regFullName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass = document.getElementById('regPassword').value;
  const statusMsg = document.getElementById('authStatusMsg');

  if (pass.length < 6) {
    statusMsg.innerHTML = `<span style="color:#c5221f;">Şifrə ən azı 6 simvoldan ibarət olmalıdır.</span>`;
    return;
  }

  try {
    statusMsg.innerHTML = '<span style="color:#666;"><i class="fa-solid fa-spinner fa-spin"></i> Hesab yaradılır...</span>';
    const userCredential = await auth.createUserWithEmailAndPassword(email, pass);
    const user = userCredential.user;

    await user.updateProfile({ displayName: fullName });

    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      name: fullName,
      email: email,
      role: 'client',
      createdAt: new Date()
    });

    closeAuthModal();
    showToast(`Hesabınız uğurla yaradıldı! Xoş gəldiniz, ${fullName}.`);
  } catch (err) {
    console.error(err);
    statusMsg.innerHTML = `<span style="color:#c5221f;">Qeydiyyat xətası: ${err.message}</span>`;
  }
}

function isAdminUser(user) {
  if (!user || !user.email) return false;
  return ADMIN_EMAILS.some(e => e.toLowerCase() === user.email.toLowerCase());
}

function updateNavbarAuthState(user) {
  const authArea = document.getElementById('authNavZone');
  if (!authArea) return;

  if (user) {
    const isUserAdmin = isAdminUser(user);
    const displayName = user.displayName || user.email.split('@')[0];

    authArea.innerHTML = `
      <div class="user-profile-badge">
        <div class="user-avatar"><i class="fa-solid fa-user"></i></div>
        <span>${displayName}</span>
      </div>
      
      ${isUserAdmin ? `
        <a href="admin.html" class="btn-admin-crown" title="İdarəetmə Panelinə Keçid">
          <i class="fa-solid fa-crown"></i> Admin Paneli
        </a>
      ` : ''}

      <button id="navLogoutBtn" class="btn-outline" style="padding: 0.45rem 0.9rem; font-size: 0.85rem;" title="Çıxış">
        <i class="fa-solid fa-right-from-bracket"></i>
      </button>
    `;

    document.getElementById('navLogoutBtn').addEventListener('click', async () => {
      await auth.signOut();
      showToast('Sistemdən çıxış edildi.');
    });

  } else {
    authArea.innerHTML = `
      <button id="openAuthModalBtn" class="btn-outline">
        <i class="fa-regular fa-user"></i> Daxil Ol / Qeydiyyat
      </button>
    `;
    document.getElementById('openAuthModalBtn').addEventListener('click', () => openAuthModal('login'));
  }
}

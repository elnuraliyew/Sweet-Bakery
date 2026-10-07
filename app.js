// app.js - Sweet Bakery Əsas Müştəri Məntiqi, Səbət, Sevimlilər, Fərdi Sifariş və Məhsul Detalı

const ADMIN_EMAILS = [
  'admin@bakery.com',
  'admin@sweetbakery.az',
  'elnuraliyew@gmail.com'
];

// İlkin kateqoriyalar (Dizayn referansına uyğun 4 əsas kateqoriya)
const DEFAULT_CATEGORIES = [
  'Şokoladlı tortlar',
  'Ad günü tortları',
  'Nişan və toy tortları',
  'Fərdi dizaynlı tortlar'
];

let currentCategory = 'all';
let productsList = [];
let categoriesList = [];

// Səbət və Sevimlilər vəziyyəti (LocalStorage ilə saxlanılır)
let cart = JSON.parse(localStorage.getItem('sweet_bakery_cart') || '[]');
let wishlist = JSON.parse(localStorage.getItem('sweet_bakery_wishlist') || '[]');
let selectedDetailProduct = null;
let currentDetailQty = 1;

// Səhifə yükləndikdə
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  initHeaderAndMobileNav();
  initAuthUI();
  initCartAndWishlistUI();
  initCustomOrderForm();
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
    background: ${isError ? '#7B303C' : '#963F4D'};
    color: #fff;
    padding: 0.95rem 1.6rem;
    border-radius: 999px;
    font-weight: 600;
    font-size: 0.92rem;
    box-shadow: 0 10px 30px rgba(48, 33, 31, 0.25);
    z-index: 100000;
    display: flex;
    align-items: center;
    gap: 0.65rem;
    animation: fadeIn 0.3s ease;
    border: 1px solid rgba(255, 255, 255, 0.2);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ----------------------------------------------------
// Header & Mobil Naviqasiya İdarəetməsi
// ----------------------------------------------------
function initHeaderAndMobileNav() {
  const header = document.getElementById('siteHeader');
  const toggleBtn = document.getElementById('mobileNavToggle');
  const closeBtn = document.getElementById('closeMobileNavBtn');
  const backdrop = document.getElementById('mobileNavBackdrop');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');

  // Sticky header scroll effekti
  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      header?.classList.add('scrolled');
    } else {
      header?.classList.remove('scrolled');
    }
  });

  // Mobil menyu aç/bağla
  if (toggleBtn && backdrop) {
    toggleBtn.addEventListener('click', () => {
      backdrop.classList.add('active');
    });
  }

  if (closeBtn && backdrop) {
    closeBtn.addEventListener('click', () => {
      backdrop.classList.remove('active');
    });
  }

  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.classList.remove('active');
    });
  }

  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      backdrop?.classList.remove('active');
    });
  });
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
    
    // Əgər bazada kateqoriya yoxdursa və ya boşdursa, 4 rəsmi kateqoriyanı avtomatik yaradırıq
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

    renderCategoryPills();

  } catch (error) {
    console.warn('Kateqoriya yüklənməsi xətası (yerli kateqoriyalardan istifadə edilir):', error);
    categoriesList = DEFAULT_CATEGORIES.map((name, i) => ({ id: `cat-${i}`, name }));
    renderCategoryPills();
  }
}

function renderCategoryPills() {
  const container = document.getElementById('categoryContainer');
  if (!container) return;

  container.innerHTML = `
    <button class="filter-pill ${currentCategory === 'all' ? 'active' : ''}" data-category="all">
      Bütün Tortlar
    </button>
  `;

  categoriesList.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `filter-pill ${currentCategory === cat.id ? 'active' : ''}`;
    btn.dataset.category = cat.id;
    btn.textContent = cat.name;
    btn.addEventListener('click', () => filterByCategory(cat.id, btn));
    container.appendChild(btn);
  });

  container.querySelector('[data-category="all"]').addEventListener('click', function() {
    filterByCategory('all', this);
  });
}

// Kateqoriya adına görə kartlardan filtrasiya (kateqoriya kartlarına klik edildikdə)
window.selectCategoryByName = function(catName) {
  const matched = categoriesList.find(c => c.name.toLowerCase().includes(catName.toLowerCase()) || catName.toLowerCase().includes(c.name.toLowerCase()));
  const catId = matched ? matched.id : 'all';
  
  const buttons = document.querySelectorAll('.filter-pill');
  let targetBtn = null;
  buttons.forEach(b => {
    if (b.dataset.category === catId) targetBtn = b;
  });

  filterByCategory(catId, targetBtn);

  // Kataloqa səliqəli sürüşdürmə
  const catEl = document.getElementById('catalogue');
  if (catEl) {
    catEl.scrollIntoView({ behavior: 'smooth' });
  }
};

async function loadProducts() {
  const grid = document.getElementById('productContainer');
  if (!grid) return;

  try {
    const snapshot = await db.collection('products').get();

    if (snapshot.empty) {
      // Əgər bazada hələ tort yoxdursa, 4 kateqoriyaya tam uyğun premium demo məhsullar
      const chocCat = categoriesList.find(c => c.name.includes('Şokoladlı')) || { id: 'c-choc', name: 'Şokoladlı tortlar' };
      const bdayCat = categoriesList.find(c => c.name.includes('Ad günü')) || { id: 'c-bday', name: 'Ad günü tortları' };
      const wedCat = categoriesList.find(c => c.name.includes('Nişan') || c.name.includes('toy')) || { id: 'c-wed', name: 'Nişan və toy tortları' };
      const customCat = categoriesList.find(c => c.name.includes('Fərdi')) || { id: 'c-custom', name: 'Fərdi dizaynlı tortlar' };

      productsList = [
        {
          id: 'cake-1',
          name: 'Klassik Şokoladlı Zəriflik',
          description: 'Zərif südlü şokolad, qozlu biskvit və krem qanaş.',
          price: 24,
          imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
          categoryId: chocCat.id,
          categoryName: chocCat.name
        },
        {
          id: 'cake-2',
          name: 'Qırmızı Meyvəli & Moruqlu',
          description: 'Klassik Red Velvet biskviti, maskarpone pendirli krem və təbii təzə moruq.',
          price: 26,
          imageUrl: 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=800&q=80',
          categoryId: bdayCat.id,
          categoryName: bdayCat.name
        },
        {
          id: 'cake-3',
          name: 'Vanil Ətirli Bento Zəriflik',
          description: 'Fərdi miniatür ad günü tortu, vanilli yüngül muss və giləmeyvələr.',
          price: 18,
          imageUrl: 'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?auto=format&fit=crop&w=800&q=80',
          categoryId: bdayCat.id,
          categoryName: bdayCat.name
        },
        {
          id: 'cake-4',
          name: 'Pastel Gül Ləçəkli Toy Tortu',
          description: '2 mərtəbəli, təbii qızılı vərəq və canlı pastel güllərlə bəzədilmiş xüsusi gün şedevri.',
          price: 32,
          imageUrl: 'https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&w=800&q=80',
          categoryId: wedCat.id,
          categoryName: wedCat.name
        },
        {
          id: 'cake-5',
          name: 'Çəhrayı Kremli Zərif Dizayn',
          description: 'Zərif çəhrayı krem qatları, moruq konfiti və xırtıldayan ağ şokolad layları.',
          price: 25,
          imageUrl: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80',
          categoryId: customCat.id,
          categoryName: customCat.name
        },
        {
          id: 'cake-6',
          name: 'Fındıqlı Şokolad & Truffel',
          description: 'Qovrulmuş meşə fındığı, duzlu karamel qatı və xalis qara şokoladlı muss.',
          price: 28,
          imageUrl: 'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?auto=format&fit=crop&w=800&q=80',
          categoryId: chocCat.id,
          categoryName: chocCat.name
        },
        {
          id: 'cake-7',
          name: 'Kraliça Zümrüd Nişan Tortu',
          description: 'Zərif məxmər teksturalı, mirvari bəzəklər və fərdi xəttatlıq yazısı ilə bəzədilmiş nişan tortu.',
          price: 35,
          imageUrl: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?auto=format&fit=crop&w=800&q=80',
          categoryId: wedCat.id,
          categoryName: wedCat.name
        },
        {
          id: 'cake-8',
          name: 'Fərdi Tematik Uşaq Tortu',
          description: 'Uşaq ad günləri üçün sevimli personajlar, zərərsiz təbii rənglər və meyvəli biskvit.',
          price: 22,
          imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80',
          categoryId: customCat.id,
          categoryName: customCat.name
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
      <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem;">
        <p>Məhsullar yüklənərkən xəta baş verdi. Zəhmət olmasa bir az sonra yenidən cəhd edin.</p>
      </div>
    `;
  }
}

function filterByCategory(categoryId, clickedBtn) {
  currentCategory = categoryId;
  document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
  if (clickedBtn) {
    clickedBtn.classList.add('active');
  } else {
    const pill = document.querySelector(`.filter-pill[data-category="${categoryId}"]`);
    if (pill) pill.classList.add('active');
  }
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
      <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
        <i class="fa-regular fa-face-smile" style="font-size: 2.5rem; color: var(--primary-burgundy); margin-bottom: 0.8rem;"></i>
        <p>Bu kateqoriyada hələlik məhsul yoxdur.</p>
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
      <div class="card-image-box" onclick="openProductDetail('${prod.id}')">
        <img src="${prod.imageUrl}" alt="${prod.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80'" />
        <span class="card-category-badge">${prod.categoryName || 'Eksklüziv'}</span>
        <button class="card-fav-btn ${isFav ? 'active' : ''}" onclick="toggleWishlist('${prod.id}', event)" title="İstək siyahısına əlavə et">
          <i class="${isFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}"></i>
        </button>
      </div>
      <div class="card-content">
        <h3 onclick="openProductDetail('${prod.id}')">${prod.name}</h3>
        <p onclick="openProductDetail('${prod.id}')">${prod.description}</p>
        <div class="card-footer-row">
          <div class="card-price-tag">${prod.price} <span>AZN / kq</span></div>
          <button onclick="addToCart('${prod.id}', 1)" class="btn-card-order" title="Səbətə at">
            <i class="fa-solid fa-basket-shopping"></i> Sifariş et
          </button>
        </div>
      </div>
    `;

    grid.appendChild(card);

    setTimeout(() => {
      card.classList.add('loaded');
    }, index * 40);
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
  favBtn.innerHTML = `<i class="${isFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}" style="${isFav ? 'color:#E63946;' : ''}"></i>`;
  favBtn.onclick = () => {
    toggleWishlist(prod.id);
    const updatedFav = wishlist.some(item => item.id === prod.id);
    favBtn.innerHTML = `<i class="${updatedFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}" style="${updatedFav ? 'color:#E63946;' : ''}"></i>`;
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
  const openCartBtn = document.getElementById('openCartBtn');
  const cartDrawerBackdrop = document.getElementById('cartDrawerBackdrop');
  if (openCartBtn) openCartBtn.addEventListener('click', openCartDrawer);
  if (cartDrawerBackdrop) {
    cartDrawerBackdrop.addEventListener('click', (e) => {
      if (e.target === cartDrawerBackdrop) closeCartDrawer();
    });
  }

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
      <div class="cart-empty-state">
        <i class="fa-solid fa-basket-shopping"></i>
        <h4 style="color: var(--text-dark); margin-bottom: 0.3rem;">Səbətiniz boşdur</h4>
        <p style="font-size:0.88rem;">Zərif tortlarımızdan seçib səbətə əlavə edin.</p>
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
    row.className = 'cart-item-row';
    row.innerHTML = `
      <img src="${item.imageUrl}" class="cart-item-img" onerror="this.src='https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=100&q=80'" />
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <div class="item-unit-price">${item.price} AZN / kq</div>
        <div class="cart-item-qty-ctrl">
          <button onclick="updateCartQty('${item.id}', -0.5)">-</button>
          <span style="font-size:0.85rem; font-weight:700; min-width:32px; text-align:center;">${item.qty} kq</span>
          <button onclick="updateCartQty('${item.id}', 0.5)">+</button>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-weight:700; color:var(--primary-burgundy); font-size:1rem; margin-bottom:0.4rem;">${itemTotal} AZN</div>
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
// 4. İSTƏK SİYAHISI (WISHLIST) İDARƏETMƏSİ
// ----------------------------------------------------
window.toggleWishlist = function(productId, event) {
  if (event) event.stopPropagation();

  const prod = productsList.find(p => p.id === productId);
  if (!prod) return;

  const index = wishlist.findIndex(item => item.id === prod.id);
  if (index > -1) {
    wishlist.splice(index, 1);
    showToast(`"${prod.name}" istək siyahısından çıxarıldı.`);
  } else {
    wishlist.push({
      id: prod.id,
      name: prod.name,
      price: prod.price,
      imageUrl: prod.imageUrl,
      categoryName: prod.categoryName
    });
    showToast(`"${prod.name}" istək siyahısına əlavə edildi! ❤️`);
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
      <div style="text-align:center; padding: 3rem 1rem; color:var(--text-muted);">
        <i class="fa-regular fa-heart" style="font-size:2.5rem; color:var(--primary-burgundy); margin-bottom:0.8rem; opacity: 0.6;"></i>
        <p>Hələ heç bir tortu istək siyahısına əlavə etməmisiniz.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  wishlist.forEach(item => {
    const row = document.createElement('div');
    row.className = 'cart-item-row';
    row.innerHTML = `
      <img src="${item.imageUrl}" class="cart-item-img" />
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <div style="font-weight:700; color:var(--primary-burgundy);">${item.price} AZN / kq</div>
      </div>
      <div style="display:flex; gap:0.6rem; align-items:center;">
        <button onclick="addToCart('${item.id}', 1); closeWishlistModal();" class="btn-card-order">
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
// 5. FƏRDİ TORT SİFARİŞİ (CUSTOM CAKE ORDER FORM)
// ----------------------------------------------------
function initCustomOrderForm() {
  const form = document.getElementById('customOrderForm');
  const fileInput = document.getElementById('customImageFile');
  const fileNameText = document.getElementById('customFileName');
  const feedback = document.getElementById('customOrderFeedback');

  const sizeInput = document.getElementById('customSize');
  if (sizeInput) {
    // 1.2 kq yazmaq olar, amma 1.212 kimi 1-dən çox kəsr rəqəmi yazmağa icazə verilmir
    sizeInput.addEventListener('input', () => {
      let val = sizeInput.value;
      if (val.includes('.')) {
        const parts = val.split('.');
        if (parts[1].length > 1) {
          sizeInput.value = `${parts[0]}.${parts[1].slice(0, 1)}`;
        }
      }
    });
  }

  if (fileInput && fileNameText) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        fileNameText.textContent = `Seçildi: ${fileInput.files[0].name}`;
      } else {
        fileNameText.textContent = 'Şəkil faylını seçmək üçün bura klikləyin';
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('customName').value.trim();
      const phone = document.getElementById('customPhone').value.trim();
      const date = document.getElementById('customDate').value.trim();
      const rawSize = document.getElementById('customSize').value.trim();
      const flavor = document.getElementById('customFlavor').value;
      const design = document.getElementById('customDesign').value.trim();
      const notes = document.getElementById('customNotes').value.trim();

      const numSize = parseFloat(rawSize);

      if (!name || !phone || !date || !rawSize || isNaN(numSize) || numSize <= 0 || !flavor) {
        showToast('Zəhmət olmasa ulduzlu (*) bütün vacib sahələri düzgün doldurun.', true);
        return;
      }

      // Kəsr hissəsini maksimum 1 rəqəm olaraq dəqiqləşdiririk (məs: 1.2 kq)
      const size = `${numSize.toFixed(1)} kq`;

      feedback.innerHTML = '<span style="color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Sifariş hazırlanır...</span>';

      try {
        // Firestore-a qeyd etməyə cəhd edirik (əgər icazə varsa)
        await db.collection('custom_orders').add({
          clientName: name,
          phone: phone,
          deliveryDate: date,
          size: size,
          flavor: flavor,
          designDescription: design || 'Qeyd yoxdur',
          additionalNotes: notes || 'Qeyd yoxdur',
          status: 'Gözləmədə',
          createdAt: new Date()
        }).catch(err => {
          console.warn('Firestore-a yazılış xətası (WhatsApp vasitəsilə davam olunur):', err);
        });
      } catch (err) {
        console.warn('Firestore custom_orders fallback:', err);
      }

      // WhatsApp üçün aydın və estetik sifariş mətni
      let waText = `Salam Sweet Bakery! Özəl tort sifarişi vermək istəyirəm:%0A%0A`;
      waText += `🎂 *Müştəri:* ${encodeURIComponent(name)}%0A`;
      waText += `📞 *Əlaqə nömrəsi:* ${encodeURIComponent(phone)}%0A`;
      waText += `📅 *Lazım olan tarix:* ${encodeURIComponent(date)}%0A`;
      waText += `⚖️ *Ölçü / Nəfər sayı:* ${encodeURIComponent(size)}%0A`;
      waText += `🍫 *Dad və krem:* ${encodeURIComponent(flavor)}%0A`;
      if (design) waText += `🎨 *Dizayn haqqında:* ${encodeURIComponent(design)}%0A`;
      if (notes) waText += `📝 *Əlavə qeydlər:* ${encodeURIComponent(notes)}%0A`;
      waText += `%0AZəhmət olmasa qiymət və detalları təsdiqləyəsiniz.`;

      feedback.innerHTML = '<span style="color:#137333;"><i class="fa-solid fa-circle-check"></i> Sifarişiniz qeydə alındı! WhatsApp-a yönləndirilirsiniz...</span>';
      showToast('Sifariş qeydə alındı! WhatsApp açılır.');

      // WhatsApp-a yönləndirmə
      setTimeout(() => {
        window.open(`https://wa.me/994703676561?text=${waText}`, '_blank');
        form.reset();
        if (fileNameText) fileNameText.textContent = 'Şəkil faylını seçmək üçün bura klikləyin';
        feedback.innerHTML = '';
      }, 1000);
    });
  }
}

// ----------------------------------------------------
// 6. Vahid Giriş / Qeydiyyat və İstifadəçi Təhlili (Auth)
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
      <div class="user-logged-badge">
        <i class="fa-regular fa-user" style="color:var(--primary-burgundy);"></i>
        <span>${displayName}</span>
      </div>
      
      ${isUserAdmin ? `
        <a href="admin.html" class="btn-admin-pill" title="İdarəetmə Panelinə Keçid">
          <i class="fa-solid fa-crown"></i> Admin
        </a>
      ` : ''}

      <button id="navLogoutBtn" class="icon-action-btn" style="width:36px; height:36px; font-size:0.9rem;" title="Çıxış">
        <i class="fa-solid fa-right-from-bracket"></i>
      </button>
    `;

    document.getElementById('navLogoutBtn').addEventListener('click', async () => {
      await auth.signOut();
      showToast('Sistemdən çıxış edildi.');
    });

  } else {
    authArea.innerHTML = `
      <button id="openAuthModalBtn" class="btn-header-login">
        <i class="fa-regular fa-user"></i>
        <span>Giriş</span>
      </button>
    `;
    document.getElementById('openAuthModalBtn').addEventListener('click', () => openAuthModal('login'));
  }
}

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

// Standart dad seçimləri (Admin paneli ilə idarə olunur)
const DEFAULT_FLAVORS = [
  'Klassik Şokoladlı & Qanaş',
  'Qırmızı Məxmər (Red Velvet)',
  'Təbii Giləmeyvəli & Vanilli',
  'Antep Püstəli & Moruqlu',
  'Karamel & Fındıqlı Krukan',
  'Fərdi resept (izahda qeyd edəcəm)'
];

// Hər məhsul üçün stabil və unikal məhsul kodu (SKU / Məhsul Kodu)
function getProductCode(prod) {
  if (prod && prod.code && String(prod.code).trim()) {
    return String(prod.code).trim().toUpperCase();
  }
  // Baza və ya demo məhsulda kod qeyd edilməyibsə deterministik SB-XXX kodu
  const key = (prod && (prod.id || prod.name)) || 'cake';
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i);
    hash |= 0;
  }
  const codeNum = 101 + Math.abs(hash % 890);
  return `SB-${codeNum}`;
}

// XSS (Cross-Site Scripting) Təhlükəsizlik Filtrləməsi
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let currentCategory = 'all';
let productsList = [];
let categoriesList = [];
let flavorsList = [];

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
    bottom: 20px;
    right: 20px;
    max-width: calc(100vw - 40px);
    background: ${isError ? '#7B303C' : '#963F4D'};
    color: #fff;
    padding: 0.85rem 1.4rem;
    border-radius: 999px;
    font-weight: 600;
    font-size: 0.88rem;
    box-shadow: 0 10px 30px rgba(48, 33, 31, 0.25);
    z-index: 100000;
    display: flex;
    align-items: center;
    gap: 0.65rem;
    animation: fadeIn 0.3s ease;
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-sizing: border-box;
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
  await loadFlavors();
  checkSharedCakeUrl();
}

async function loadCategories() {
  const container = document.getElementById('categoryContainer');
  if (!container) return;

  try {
    const snapshot = await db.collection('categories').get();
    
    if (snapshot.empty) {
      categoriesList = [];
    } else {
      categoriesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    renderCategoryPills();

  } catch (error) {
    console.warn('Kateqoriya yüklənməsi xətası:', error);
    categoriesList = [];
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

async function loadFlavors() {
  const select = document.getElementById('customFlavor');
  if (!select) return;

  try {
    const snapshot = await db.collection('flavors').get();
    if (snapshot.empty) {
      flavorsList = [];
    } else {
      flavorsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  } catch (err) {
    console.warn('Dadların yüklənməsi xətası:', err);
    flavorsList = [];
  }

  // Dad seçim xanasını (select) dinamik doldururuq
  select.innerHTML = '<option value="">Dad və krem seçin...</option>';
  if (flavorsList.length === 0) {
    const opt = document.createElement('option');
    opt.value = 'Klassik Krem';
    opt.textContent = 'Klassik Krem (Standart)';
    select.appendChild(opt);
  } else {
    flavorsList.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.name;
      opt.textContent = f.name;
      select.appendChild(opt);
    });
  }
}

async function loadProducts() {
  const grid = document.getElementById('productContainer');
  if (!grid) return;

  try {
    const snapshot = await db.collection('products').get();

    if (snapshot.empty) {
      productsList = [];
    } else {
      productsList = snapshot.docs.map(doc => {
        const data = doc.data();
        const cat = categoriesList.find(c => c.id === data.categoryId);
        return {
          id: doc.id,
          code: data.code ? String(data.code).trim().toUpperCase() : getProductCode({ id: doc.id, name: data.name }),
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

  if (productsList.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 4.5rem 1.5rem; background: var(--white); border-radius: var(--radius-lg); border: 1.5px dashed var(--border-warm); margin: 2rem 0; box-shadow: var(--shadow-subtle);">
        <div style="width: 70px; height: 70px; margin: 0 auto 1.2rem auto; border-radius: 50%; background: var(--soft-pink); display: flex; align-items: center; justify-content: center; color: var(--primary-burgundy); font-size: 2rem;">
          <i class="fa-solid fa-cake-candles"></i>
        </div>
        <h3 style="font-family: var(--font-serif); font-size: 1.5rem; color: var(--text-dark); margin-bottom: 0.6rem;">Kataloq Hazırlanır</h3>
        <p style="color: var(--text-muted); max-width: 480px; margin: 0 auto 1.5rem auto; font-size: 0.95rem; line-height: 1.6;">
          Yeni və eksklüziv tort çeşidlərimiz admin paneli vasitəsilə əlavə olunur. İstədiyiniz dizaynda fərdi tort sifarişi vermək üçün dərhal bizimlə əlaqə saxlaya bilərsiniz!
        </p>
        <a href="#custom-order" class="btn-primary-burgundy" style="display: inline-flex; align-items: center; gap: 0.6rem; text-decoration: none; padding: 0.85rem 1.8rem;">
          <i class="fa-solid fa-wand-magic-sparkles"></i> Fərdi Tort Sifarişi Ver
        </a>
      </div>
    `;
    return;
  }

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
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.id = prod.id;

    card.innerHTML = `
      <div class="card-image-box" onclick="openProductDetail('${escapeHtml(prod.id)}')">
        <img src="${escapeHtml(prod.imageUrl)}" alt="${escapeHtml(prod.name)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80'" />
        <span class="card-category-badge">${escapeHtml(prod.categoryName || 'Tort')}</span>
      </div>
      <div class="card-content">
        <h3 onclick="openProductDetail('${escapeHtml(prod.id)}')">${escapeHtml(prod.name)}</h3>
        <p onclick="openProductDetail('${escapeHtml(prod.id)}')">${escapeHtml(prod.description || '')}</p>
        <div class="card-footer-row">
          <div class="card-price-tag">${Number(prod.price) || 0} <span>AZN / kq</span></div>
          <button onclick="openProductDetail('${escapeHtml(prod.id)}')" class="btn-card-order" title="Məhsula bax və sifariş et">
            <i class="fa-solid fa-eye"></i> Baxış & Sifariş
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
// 2. MƏHSULA TAM ŞƏKİLDƏ BAXIŞ (QUICK VIEW MODAL) & PAYLAŞMA
// ----------------------------------------------------
window.openProductDetail = function(productId) {
  const prod = productsList.find(p => p.id === productId || (p.code && p.code.toLowerCase() === String(productId).toLowerCase()));
  if (!prod) return;

  selectedDetailProduct = prod;
  currentDetailQty = 1;

  const prodCode = prod.code || getProductCode(prod);

  document.getElementById('detailImg').src = prod.imageUrl;
  const backdropEl = document.getElementById('detailImgBackdrop');
  if (backdropEl) {
    backdropEl.style.backgroundImage = `url("${prod.imageUrl}")`;
  }

  document.getElementById('detailCat').textContent = prod.categoryName || 'Eksklüziv';
  const codeEl = document.getElementById('detailCode');
  if (codeEl) codeEl.textContent = `Kod: ${prodCode}`;

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

  // WhatsApp birbaşa sifariş düyməsi yenilənməsi
  updateModalWhatsAppBtn();

  // Səbətə əlavə et düyməsi
  const addBtn = document.getElementById('modalAddToCartBtn');
  addBtn.onclick = () => {
    addToCart(prod.id, currentDetailQty);
    closeProductModal();
  };

  document.getElementById('productDetailModal').classList.add('active');
};

// Tam Ekran Şəkil Baxışı (Lightbox)
window.openImageLightbox = function() {
  const detailImg = document.getElementById('detailImg');
  const lbImg = document.getElementById('lightboxImg');
  const lbModal = document.getElementById('imageLightboxModal');
  if (detailImg && lbImg && lbModal && detailImg.src) {
    lbImg.src = detailImg.src;
    lbModal.classList.add('active');
  }
};

window.closeImageLightbox = function() {
  const lbModal = document.getElementById('imageLightboxModal');
  if (lbModal) lbModal.classList.remove('active');
};

function updateModalWhatsAppBtn() {
  const waBtn = document.getElementById('modalDirectWaBtn');
  if (!waBtn || !selectedDetailProduct) return;
  const prod = selectedDetailProduct;
  const prodCode = prod.code || getProductCode(prod);
  const itemTotal = +(prod.price * currentDetailQty).toFixed(1);
  const msg = `Salam Sweet Bakery! ${prodCode} kodlu "${prod.name}" tortunu sifariş etmək istəyirəm:%0A%0A` +
    `🍰 *Məhsul:* ${encodeURIComponent(prod.name)}%0A` +
    `🏷️ *Məhsul Kodu:* ${encodeURIComponent(prodCode)}%0A` +
    `⚖️ *Çəki:* ${currentDetailQty} kq%0A` +
    `💰 *Məbləğ:* ${itemTotal} AZN%0A` +
    `📍 *Çatdırılma:* Naxçıvan (Yalnız Bolt ilə)%0A%0A` +
    `Zəhmət olmasa sifarişi qəbul edəsiniz.`;
  waBtn.href = `https://wa.me/994703676561?text=${msg}`;
}

window.closeProductModal = function() {
  const modal = document.getElementById('productDetailModal');
  if (modal) modal.classList.remove('active');
};

window.changeDetailQty = function(delta) {
  currentDetailQty = Math.max(1.0, +(currentDetailQty + delta).toFixed(1));
  document.getElementById('detailQty').textContent = `${currentDetailQty} kq`;
  updateModalWhatsAppBtn();
};

// ----------------------------------------------------
// 2.1 MƏHSULU PAYLAŞMA MƏNTİQİ (NATIVE + MODAL + COPY)
// ----------------------------------------------------
window.shareProduct = function(productId, event) {
  if (event) event.stopPropagation();

  const prod = productsList.find(p => p.id === productId);
  if (!prod) return;

  const prodCode = prod.code || getProductCode(prod);
  const shareUrl = `${window.location.origin}${window.location.pathname}?cake=${encodeURIComponent(prod.id)}`;
  const shareTitle = `${prod.name} [${prodCode}] — Sweet Bakery`;
  const shareText = `Sweet Bakery-də zərif "${prod.name}" (${prod.price} AZN / kq) tortuna bax! [Kod: ${prodCode}] 🎂✨`;

  if (navigator.share) {
    navigator.share({
      title: shareTitle,
      text: shareText,
      url: shareUrl
    }).catch(err => {
      if (err.name !== 'AbortError') {
        openShareModal(prod, shareUrl, shareText);
      }
    });
  } else {
    openShareModal(prod, shareUrl, shareText);
  }
};

window.shareCurrentModalProduct = function() {
  if (selectedDetailProduct) {
    shareProduct(selectedDetailProduct.id);
  }
};

function openShareModal(prod, shareUrl, shareText) {
  const modal = document.getElementById('shareModal');
  if (!modal) return;

  const prodCode = prod.code || getProductCode(prod);
  const imgEl = document.getElementById('shareProdImg');
  const nameEl = document.getElementById('shareProdName');
  const codeEl = document.getElementById('shareProdCode');
  const priceEl = document.getElementById('shareProdPrice');
  const inputEl = document.getElementById('shareUrlInput');

  if (imgEl) imgEl.src = prod.imageUrl;
  if (nameEl) nameEl.textContent = prod.name;
  if (codeEl) codeEl.textContent = `Kod: ${prodCode}`;
  if (priceEl) priceEl.textContent = `${prod.price} AZN / kq`;
  if (inputEl) inputEl.value = shareUrl;

  // WhatsApp Paylaşma
  const waLink = document.getElementById('shareWaLink');
  if (waLink) {
    waLink.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`;
  }

  // Telegram Paylaşma
  const tgLink = document.getElementById('shareTgLink');
  if (tgLink) {
    tgLink.href = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
  }

  // Facebook Paylaşma
  const fbLink = document.getElementById('shareFbLink');
  if (fbLink) {
    fbLink.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  }

  modal.classList.add('active');
}

window.closeShareModal = function() {
  const modal = document.getElementById('shareModal');
  if (modal) modal.classList.remove('active');
};

window.copyShareUrl = function() {
  const input = document.getElementById('shareUrlInput');
  const btn = document.getElementById('copyShareUrlBtn');
  if (!input) return;

  input.select();
  input.setSelectionRange(0, 99999);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(input.value).then(() => {
      showCopySuccess(btn);
    }).catch(() => {
      document.execCommand('copy');
      showCopySuccess(btn);
    });
  } else {
    document.execCommand('copy');
    showCopySuccess(btn);
  }
};

function showCopySuccess(btn) {
  if (btn) {
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Kopyalandı!';
    setTimeout(() => {
      btn.innerHTML = '<i class="fa-regular fa-copy"></i> Kopyala';
    }, 2500);
  }
  showToast('Tortun linki kopyalandı! Yaxınlarınızla bölüşə bilərsiniz.');
}

// URL-dən paylaşılan tortu avtomatik açmaq (Deep-link)
function checkSharedCakeUrl() {
  const params = new URLSearchParams(window.location.search);
  const cakeId = params.get('cake');
  if (cakeId) {
    setTimeout(() => {
      openProductDetail(cakeId);
      const targetCard = document.querySelector(`.product-card[data-id="${cakeId}"]`);
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const catSection = document.getElementById('catalogue');
        if (catSection) catSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 450);
  }
}

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

  const shareModal = document.getElementById('shareModal');
  if (shareModal) {
    shareModal.addEventListener('click', (e) => {
      if (e.target === shareModal) closeShareModal();
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

  const prodCode = prod.code || getProductCode(prod);
  const existing = cart.find(item => item.id === prod.id);
  if (existing) {
    existing.qty = +(existing.qty + qty).toFixed(1);
    if (!existing.code) existing.code = prodCode;
  } else {
    cart.push({
      id: prod.id,
      code: prodCode,
      name: prod.name,
      price: prod.price,
      imageUrl: prod.imageUrl,
      qty: qty
    });
  }

  saveCart();
  updateBadgeCounts();
  showToast(`"${prod.name}" [${prodCode}] (${qty} kq) səbətə əlavə edildi!`);
  openCartDrawer();
};

window.updateCartQty = function(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;

  const newQty = +(item.qty + delta).toFixed(1);
  if (newQty < 1.0) {
    cart = cart.filter(i => i.id !== productId);
    showToast(`"${item.name}" səbətdən çıxarıldı.`);
  } else {
    item.qty = newQty;
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
    const itemCode = item.code || getProductCode(item);
    item.code = itemCode;
    const itemTotal = +(item.price * item.qty).toFixed(1);
    subtotal += itemTotal;
    orderSummaryText += `🍰 *${item.name}* [Kod: ${itemCode}] — ${item.qty} kq (${itemTotal} AZN)%0A`;

    const row = document.createElement('div');
    row.className = 'cart-item-row';
    row.innerHTML = `
      <img src="${escapeHtml(item.imageUrl)}" class="cart-item-img" onerror="this.src='https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=100&q=80'" />
      <div class="cart-item-info">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:0.4rem; margin-bottom:0.2rem;">
          <h4 style="margin:0;">${escapeHtml(item.name)}</h4>
          <span class="cart-item-code-tag">${escapeHtml(itemCode)}</span>
        </div>
        <div class="item-unit-price">${Number(item.price) || 0} AZN / kq</div>
        <div class="cart-item-qty-ctrl">
          <button onclick="updateCartQty('${escapeHtml(item.id)}', -0.5)">-</button>
          <span style="font-size:0.85rem; font-weight:700; min-width:32px; text-align:center;">${item.qty} kq</span>
          <button onclick="updateCartQty('${escapeHtml(item.id)}', 0.5)">+</button>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-weight:700; color:var(--primary-burgundy); font-size:1rem; margin-bottom:0.4rem;">${itemTotal} AZN</div>
        <button onclick="removeFromCart('${escapeHtml(item.id)}')" style="background:none; border:none; color:#c5221f; cursor:pointer;" title="Sil">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;
    container.appendChild(row);
  });

  subtotal = subtotal.toFixed(1);
  orderSummaryText += `%0A💰 *Ümumi Məbləğ:* ${subtotal} AZN%0A📍 *Çatdırılma:* Naxçıvan (Yalnız Bolt ilə)%0A%0AZəhmət olmasa sifarişi qəbul edəsiniz.`;
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

  const prodCode = prod.code || getProductCode(prod);
  const index = wishlist.findIndex(item => item.id === prod.id);
  if (index > -1) {
    wishlist.splice(index, 1);
    showToast(`"${prod.name}" istək siyahısından çıxarıldı.`);
  } else {
    wishlist.push({
      id: prod.id,
      code: prodCode,
      name: prod.name,
      price: prod.price,
      imageUrl: prod.imageUrl,
      categoryName: prod.categoryName
    });
    showToast(`"${prod.name}" [${prodCode}] istək siyahısına əlavə edildi! ❤️`);
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
    const itemCode = item.code || getProductCode(item);
    const row = document.createElement('div');
    row.className = 'cart-item-row';
    row.innerHTML = `
      <img src="${escapeHtml(item.imageUrl)}" class="cart-item-img" onerror="this.src='https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=100&q=80'" />
      <div class="cart-item-info">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:0.4rem; margin-bottom:0.2rem;">
          <h4 style="margin:0;">${escapeHtml(item.name)}</h4>
          <span class="cart-item-code-tag">${escapeHtml(itemCode)}</span>
        </div>
        <div style="font-weight:700; color:var(--primary-burgundy);">${Number(item.price) || 0} AZN / kq</div>
      </div>
      <div style="display:flex; gap:0.6rem; align-items:center;">
        <button onclick="addToCart('${escapeHtml(item.id)}', 1); closeWishlistModal();" class="btn-card-order">
          <i class="fa-solid fa-basket-shopping"></i> Səbətə At
        </button>
        <button onclick="toggleWishlist('${escapeHtml(item.id)}')" style="background:none; border:none; color:#c5221f; cursor:pointer; padding:0.4rem;" title="Sil">
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

      if (!name || !phone || !date || !rawSize || isNaN(numSize) || !flavor) {
        showToast('Zəhmət olmasa ulduzlu (*) bütün vacib sahələri düzgün doldurun.', true);
        return;
      }

      if (numSize < 1) {
        showToast('Tortun çəkisi minimum 1 kq olmalıdır.', true);
        return;
      }

      // Anti-Spam və DoS mühafizəsi: Ardıcıl sifarişlər arasında minimum 25 saniyə fasilə
      const lastOrderTime = parseInt(localStorage.getItem('sb_last_custom_order') || '0', 10);
      const now = Date.now();
      if (now - lastOrderTime < 25000) {
        const remainingSec = Math.ceil((25000 - (now - lastOrderTime)) / 1000);
        showToast(`Təhlükəsizlik: Növbəti sifariş üçün ${remainingSec} saniyə gözləməlisiniz.`, true);
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
      localStorage.setItem('sb_last_custom_order', Date.now());

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
  const mobileAuth = document.getElementById('mobileAuthZone');

  if (user) {
    const isUserAdmin = isAdminUser(user);
    const displayName = user.displayName || user.email.split('@')[0];

    if (authArea) {
      authArea.innerHTML = `
        ${isUserAdmin ? `
          <a href="admin.html" class="btn-admin-pill" title="İdarəetmə Panelinə Keçid (${displayName})">
            <i class="fa-solid fa-crown"></i> Admin
          </a>
        ` : `
          <div class="user-logged-badge" title="${displayName}">
            <i class="fa-regular fa-user" style="color:var(--primary-burgundy);"></i>
            <span>${displayName}</span>
          </div>
        `}

        <button id="navLogoutBtn" class="icon-action-btn" style="width:36px; height:36px; font-size:0.9rem;" title="Çıxış (${displayName})">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      `;

      document.getElementById('navLogoutBtn')?.addEventListener('click', async () => {
        await auth.signOut();
        showToast('Sistemdən çıxış edildi.');
      });
    }

    if (mobileAuth) {
      mobileAuth.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:0.6rem;">
          <div style="font-weight:700; color:var(--text-dark); display:flex; align-items:center; gap:0.5rem; font-size:0.95rem;">
            <i class="fa-solid fa-circle-user" style="color:var(--primary-burgundy); font-size:1.2rem;"></i> ${displayName}
          </div>
          ${isUserAdmin ? `
            <a href="admin.html" class="btn-primary-burgundy" style="width:100%; justify-content:center; padding:0.6rem; font-size:0.85rem; text-decoration:none;">
              <i class="fa-solid fa-crown"></i> Admin Paneli
            </a>
          ` : ''}
          <button id="mobileLogoutBtn" class="btn-outline" style="width:100%; justify-content:center; padding:0.55rem; font-size:0.85rem;">
            <i class="fa-solid fa-right-from-bracket"></i> Çıxış Et
          </button>
        </div>
      `;

      document.getElementById('mobileLogoutBtn')?.addEventListener('click', async () => {
        await auth.signOut();
        showToast('Sistemdən çıxış edildi.');
      });
    }

  } else {
    if (authArea) {
      authArea.innerHTML = `
        <button id="openAuthModalBtn" class="btn-header-login">
          <i class="fa-regular fa-user"></i>
          <span>Giriş</span>
        </button>
      `;
      document.getElementById('openAuthModalBtn')?.addEventListener('click', () => openAuthModal('login'));
    }

    if (mobileAuth) {
      mobileAuth.innerHTML = `
        <button id="mobileOpenAuthBtn" class="btn-primary-burgundy" style="width:100%; justify-content:center; padding:0.65rem; font-size:0.88rem;">
          <i class="fa-regular fa-user"></i> Daxil Ol / Qeydiyyat
        </button>
      `;
      document.getElementById('mobileOpenAuthBtn')?.addEventListener('click', () => {
        document.getElementById('mobileNavBackdrop')?.classList.remove('active');
        openAuthModal('login');
      });
    }
  }
}

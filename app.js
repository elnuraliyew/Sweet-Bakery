// app.js - Sweet Bakery Əsas Müştəri Məntiqi və Vahid Auth İdarəetməsi

// Qeyd: Bu siyahıda olan emaillər və ya Firestore-da role: 'admin' olan istifadəçilər avtomatik Admin hesab olunur
const ADMIN_EMAILS = [
  'admin@bakery.com',
  'admin@sweetbakery.az',
  'elnuraliyew@gmail.com'
];

let currentCategory = 'all';
let productsList = [];
let categoriesList = [];

// Səhifə yükləndikdə
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  initAuthUI();
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
    
    if (snapshot.empty) {
      categoriesList = [
        { id: 'cat-choc', name: 'Şokoladlı Tortlar' },
        { id: 'cat-berry', name: 'Meyvəli & Giləmeyvəli' },
        { id: 'cat-wedding', name: 'Toy & Nişan Tortları' },
        { id: 'cat-bento', name: 'Bento Tortlar' }
      ];
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
      productsList = [
        {
          id: 'demo-1',
          name: 'Belçika Şokoladlı Zəriflik',
          description: 'Həqiqi Belçika südlü şokoladı, qozlu biskvit və zərif qanaş kremi.',
          price: 55,
          imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
          categoryId: 'cat-choc',
          categoryName: 'Şokoladlı'
        },
        {
          id: 'demo-2',
          name: 'Qırmızı Məxmər & Moruq',
          description: 'Klassik Red Velvet biskviti, maskarpone pendirli krem və təbii təzə moruq.',
          price: 60,
          imageUrl: 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=800&q=80',
          categoryId: 'cat-berry',
          categoryName: 'Meyvəli'
        },
        {
          id: 'demo-3',
          name: 'Kraliça Gilaslı Bento',
          description: 'Fərdi miniatür bento tortu, yüngül vanilli mus və təzə giləmeyvələr.',
          price: 28,
          imageUrl: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=800&q=80',
          categoryId: 'cat-bento',
          categoryName: 'Bento'
        },
        {
          id: 'demo-4',
          name: 'Zərif Pastel Toy Tortu',
          description: '2 mərtəbəli, qızılı vərəq və canlı güllərlə bəzədilmiş xüsusi gün şedevri.',
          price: 180,
          imageUrl: 'https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&w=800&q=80',
          categoryId: 'cat-wedding',
          categoryName: 'Toy & Nişan'
        },
        {
          id: 'demo-5',
          name: 'Püstəli & Moruqlu Ekstaz',
          description: 'Təbii Antep püstəsi pastası, moruq konfisi və xırtıldayan laylar.',
          price: 65,
          imageUrl: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80',
          categoryId: 'cat-berry',
          categoryName: 'Meyvəli'
        },
        {
          id: 'demo-6',
          name: 'Karamel & Truffel Şokolad',
          description: 'Duzlu karamel qatı, qara şokoladlı muss və truffel topları ilə.',
          price: 58,
          imageUrl: 'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?auto=format&fit=crop&w=800&q=80',
          categoryId: 'cat-choc',
          categoryName: 'Şokoladlı'
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
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const orderText = encodeURIComponent(`Salam Sweet Bakery! Mən bu tortu sifariş vermək istəyirəm: "${prod.name}" (${prod.price} AZN). Zəhmət olmasa əlaqə saxlayın.`);
    const waUrl = `https://wa.me/994501234567?text=${orderText}`;

    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${prod.imageUrl}" alt="${prod.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80'" />
        <span class="card-badge">${prod.categoryName || 'Eksklüziv'}</span>
      </div>
      <div class="card-body">
        <h3>${prod.name}</h3>
        <p>${prod.description}</p>
        <div class="card-footer">
          <div class="card-price">${prod.price} <span>AZN</span></div>
          <a href="${waUrl}" target="_blank" class="btn-order">
            <i class="fa-brands fa-whatsapp"></i> Sifariş Et
          </a>
        </div>
      </div>
    `;

    grid.appendChild(card);

    setTimeout(() => {
      card.classList.add('loaded');
    }, index * 70);
  });
}

// ----------------------------------------------------
// 2. Vahid Giriş / Qeydiyyat və İstifadəçi Təhlili (Auth)
// ----------------------------------------------------
function initAuthUI() {
  const modal = document.getElementById('authModal');
  const openBtn = document.getElementById('openAuthModalBtn');
  const closeBtn = document.getElementById('closeAuthModalBtn');
  const loginForm = document.getElementById('userLoginForm');
  const registerForm = document.getElementById('userRegisterForm');

  // Modalı Açmaq
  if (openBtn) {
    openBtn.addEventListener('click', () => openAuthModal('login'));
  }

  // Modalı Bağlamaq
  if (closeBtn) {
    closeBtn.addEventListener('click', closeAuthModal);
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeAuthModal();
    });
  }

  // Giriş Formu
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Qeydiyyat Formu
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }

  // Firebase İstifadəçi Vəziyyətini Dinləyir
  auth.onAuthStateChanged(async (user) => {
    updateNavbarAuthState(user);
  });
}

// Modal Aç/Bağla
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

// Tab dəyişimi: Giriş <-> Qeydiyyat
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

// Daxil Olma Əməliyyatı
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

    // Əgər daxil olan şəxs Admindirsə xüsusi salamla
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

// Qeydiyyat Əməliyyatı
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

    // Profil adını yenilə
    await user.updateProfile({ displayName: fullName });

    // Firestore-da istifadəçi qeydi yarat
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

// Admin yoxlanışı (Email və ya xüsusi ad üzrə)
function isAdminUser(user) {
  if (!user || !user.email) return false;
  return ADMIN_EMAILS.some(e => e.toLowerCase() === user.email.toLowerCase());
}

// Sağ üst menyu vəziyyətini yeniləyir
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
    // Giriş edilməyibsə
    authArea.innerHTML = `
      <button id="openAuthModalBtn" class="btn-outline">
        <i class="fa-regular fa-user"></i> Daxil Ol / Qeydiyyat
      </button>
    `;
    document.getElementById('openAuthModalBtn').addEventListener('click', () => openAuthModal('login'));
  }
}

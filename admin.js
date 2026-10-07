// admin.js - Sweet Bakery Professional Admin Dashboard Məntiqi

const ADMIN_EMAILS = [
  'admin@bakery.com',
  'admin@sweetbakery.az',
  'elnuraliyew@gmail.com'
];

let adminProducts = [];
let adminCategories = [];
let adminFlavors = [];

// Hər məhsul üçün stabil və unikal məhsul kodu (SKU / Məhsul Kodu)
function getProductCode(prod) {
  if (prod && prod.code && String(prod.code).trim()) {
    return String(prod.code).trim().toUpperCase();
  }
  const key = (prod && (prod.id || prod.name)) || 'cake';
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i);
    hash |= 0;
  }
  const codeNum = 101 + Math.abs(hash % 890);
  return `SB-${codeNum}`;
}

function isAdminUser(user) {
  if (!user || !user.email) return false;
  return ADMIN_EMAILS.some(e => e.toLowerCase() === user.email.toLowerCase());
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

// Brute-force və Giriş Kilidi (5 yanlış cəhddən sonra 10 dəqiqə kilid)
const MAX_ADMIN_ATTEMPTS = 5;
const ADMIN_LOCKOUT_MS = 10 * 60 * 1000;

function checkAdminLockout() {
  const until = parseInt(localStorage.getItem('sb_admin_lockout_until') || '0', 10);
  const now = Date.now();
  if (until > now) {
    return Math.ceil((until - now) / 60000);
  }
  if (until && until <= now) {
    localStorage.removeItem('sb_admin_lockout_until');
    localStorage.removeItem('sb_admin_failed_attempts');
  }
  return 0;
}

function recordAdminFailedAttempt() {
  const attempts = parseInt(localStorage.getItem('sb_admin_failed_attempts') || '0', 10) + 1;
  localStorage.setItem('sb_admin_failed_attempts', attempts);
  if (attempts >= MAX_ADMIN_ATTEMPTS) {
    const lockoutUntil = Date.now() + ADMIN_LOCKOUT_MS;
    localStorage.setItem('sb_admin_lockout_until', lockoutUntil);
    return { locked: true, remainingMins: 10 };
  }
  return { locked: false, remaining: MAX_ADMIN_ATTEMPTS - attempts };
}

function clearAdminFailedAttempts() {
  localStorage.removeItem('sb_admin_failed_attempts');
  localStorage.removeItem('sb_admin_lockout_until');
}

// Bildiriş (Toast) Mesajı Funksiyası
function notify(text, isError = false) {
  const toast = document.createElement('div');
  toast.innerHTML = `<i class="fa-solid ${isError ? 'fa-triangle-exclamation' : 'fa-circle-check'}"></i> ${text}`;
  toast.style.cssText = `
    position: fixed;
    top: 25px;
    right: 25px;
    background: ${isError ? '#963F4D' : '#137333'};
    color: #fff;
    padding: 0.95rem 1.6rem;
    border-radius: 14px;
    font-weight: 600;
    font-size: 0.92rem;
    box-shadow: 0 10px 30px rgba(48, 33, 31, 0.25);
    z-index: 100000;
    display: flex;
    align-items: center;
    gap: 0.65rem;
    animation: fadeIn 0.3s ease;
    border: 1px solid rgba(255, 255, 255, 0.2);
    max-width: calc(100vw - 40px);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// 1. Auth Status Yoxlanışı və Yetkisiz Girişə Qarşı Mühafizə
auth.onAuthStateChanged(user => {
  const loginModal = document.getElementById('loginModal');
  const adminDashboard = document.getElementById('adminDashboard');
  const userEmailBadge = document.getElementById('userEmailBadge');

  if (user) {
    if (!isAdminUser(user)) {
      auth.signOut();
      if (adminDashboard) {
        adminDashboard.style.display = 'none';
        adminDashboard.innerHTML = ''; // DOM-u dərhal boşaldırıq ki, kod və elementlər kənardan görünməsin
      }
      alert('Təhlükəsizlik Bildirişi: Bu profilin Sweet Bakery idarəetmə panelinə daxil olmaq səlahiyyəti yoxdur.');
      window.location.replace('index.html');
      return;
    }

    if (loginModal) loginModal.style.display = 'none';
    if (adminDashboard) adminDashboard.style.display = 'flex';
    if (userEmailBadge) userEmailBadge.textContent = user.email;
    initAdminData();
  } else {
    if (loginModal) loginModal.style.display = 'flex';
    if (adminDashboard) adminDashboard.style.display = 'none';
  }
});

// 2. Giriş Formu (Brute-force və Şifrə Hücumlarına qarşı kilidləmə)
const loginForm = document.getElementById('adminLoginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const lockMins = checkAdminLockout();
    const errDiv = document.getElementById('loginError');
    if (lockMins > 0) {
      if (errDiv) errDiv.textContent = `Təhlükəsizlik kilidi aktivdir: Çox sayda yanlış cəhd! Zəhmət olmasa ${lockMins} dəqiqə sonra yenidən cəhd edin.`;
      return;
    }

    const email = document.getElementById('adminEmail').value.trim();
    const pass = document.getElementById('adminPassword').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');

    if (!ADMIN_EMAILS.some(e => e.toLowerCase() === email.toLowerCase())) {
      const status = recordAdminFailedAttempt();
      if (status.locked) {
        if (errDiv) errDiv.textContent = 'Giriş 10 dəqiqəlik bloklandı: Həddindən artıq yanlış cəhd!';
      } else {
        if (errDiv) errDiv.textContent = `Bu e-poçt ünvanı admin hüququna malik deyil. Qalan cəhdlər: ${status.remaining}`;
      }
      return;
    }

    try {
      if (errDiv) errDiv.textContent = '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yoxlanılır...';
      }
      await auth.signInWithEmailAndPassword(email, pass);
      clearAdminFailedAttempts();
      notify('Uğurla daxil oldunuz!');
    } catch (err) {
      console.error(err);
      const status = recordAdminFailedAttempt();
      if (status.locked) {
        if (errDiv) errDiv.textContent = 'Təhlükəsizlik kilidi aktiv edildi! 5 yanlış cəhd səbəbilə giriş 10 dəqiqəlik bloklandı.';
      } else {
        if (errDiv) errDiv.textContent = `Giriş uğursuz oldu: Şifrə yanlışdır. Qalan cəhdlər: ${status.remaining}`;
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Daxil Ol <i class="fa-solid fa-arrow-right-to-bracket"></i>';
      }
    }
  });
}

// 3. Çıxış Düyməsi
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await auth.signOut();
    notify('Sistemdən çıxış edildi.');
  });
}

// 4. İlkin Məlumatların Yüklənməsi
async function initAdminData() {
  await fetchCategories();
  await fetchProducts();
  await fetchFlavors();
  setupEventListeners();
}

function setupEventListeners() {
  // Tort Formu Submit
  const prodForm = document.getElementById('productForm');
  if (prodForm) {
    prodForm.addEventListener('submit', handleProductSubmit);
  }

  // Dropzone və Şəkil Seçimi İdarəetməsi (Klik, Drag & Drop, Cihaz Seçimi)
  const fileInput = document.getElementById('prodFileInput');
  const dropzone = document.getElementById('uploadDropzone');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', (e) => {
      if (e.target !== fileInput) {
        fileInput.click();
      }
    });

    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) processImageFile(file);
    });
  }

  // Drag & Drop Dəstəyi
  if (dropzone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      }, false);
    });

    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        processImageFile(files[0]);
      }
    });
  }

  // Clipboard Paste Dəstəyi (Ctrl+V ilə şəkil yapışdırmaq)
  window.addEventListener('paste', (e) => {
    const activeTab = document.getElementById('productsTab');
    if (!activeTab || activeTab.style.display === 'none') return;
    const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (items) {
      for (const item of items) {
        if (item.type && item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            notify('Kopyalanmış şəkil aşkar edildi və yüklənir...');
            processImageFile(blob);
            break;
          }
        }
      }
    }
  });

  // İnternet Şəkil Linki (URL) İdarəetməsi
  setupDirectUrlHandler();

  // Şəkli ləğv et / dəyiş düyməsi
  const removeImgBtn = document.getElementById('removeImgBtn');
  if (removeImgBtn) {
    removeImgBtn.addEventListener('click', resetSelectedImage);
  }

  // Redaktəni Ləğv Et
  const cancelBtn = document.getElementById('cancelProdEditBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', resetProductForm);
  }

  // Kateqoriya Formu Submit
  const catForm = document.getElementById('categoryForm');
  if (catForm) {
    catForm.addEventListener('submit', handleCategorySubmit);
  }

  // Dad Formu Submit
  const flvForm = document.getElementById('flavorForm');
  if (flvForm) {
    flvForm.addEventListener('submit', handleFlavorSubmit);
  }
}

// Şəkil URL Girişi Funksionallığı
function setupDirectUrlHandler() {
  const toggleBtn = document.getElementById('toggleUrlInputBtn');
  const urlContainer = document.getElementById('urlInputContainer');
  const applyBtn = document.getElementById('applyDirectUrlBtn');
  const directUrlInput = document.getElementById('prodDirectUrlInput');
  const hiddenInput = document.getElementById('prodImageUrl');
  const previewContainer = document.getElementById('imagePreviewContainer');
  const previewImg = document.getElementById('imagePreview');
  const previewText = document.getElementById('imagePreviewText');
  const dropzone = document.getElementById('uploadDropzone');

  if (toggleBtn && urlContainer) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = urlContainer.style.display === 'none';
      urlContainer.style.display = isHidden ? 'block' : 'none';
      if (isHidden && directUrlInput) directUrlInput.focus();
    });
  }

  const applyUrl = () => {
    const url = directUrlInput ? directUrlInput.value.trim() : '';
    if (!url) {
      notify('Zəhmət olmasa şəkil linkini daxil edin', true);
      return;
    }
    notify('Şəkil linki yoxlanılır...');
    const testImg = new Image();
    testImg.onload = () => {
      hiddenInput.value = url;
      previewImg.src = url;
      if (previewText) previewText.textContent = 'İnternet linkindən yükləndi';
      if (dropzone) dropzone.style.display = 'none';
      if (previewContainer) previewContainer.style.display = 'flex';
      notify('Şəkil linki uğurla tətbiq edildi!');
    };
    testImg.onerror = () => {
      notify('Daxil edilmiş linkdə şəkil tapılmadı və ya format dəstəklənmir.', true);
    };
    testImg.src = url;
  };

  if (applyBtn) applyBtn.addEventListener('click', applyUrl);
  if (directUrlInput) {
    directUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyUrl();
      }
    });
  }
}

// Şəkli sıxıb emal edən ümumi funksiya
async function processImageFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    notify('Zəhmət olmasa yalnız şəkil faylı seçin (PNG, JPG, WEBP)', true);
    return;
  }

  const dropzone = document.getElementById('uploadDropzone');
  const previewContainer = document.getElementById('imagePreviewContainer');
  const previewImg = document.getElementById('imagePreview');
  const hiddenInput = document.getElementById('prodImageUrl');
  const previewText = document.getElementById('imagePreviewText');

  try {
    notify('Şəkil oxunur və optimallaşdırılır...');
    const compressedDataUrl = await compressImageFile(file, 850, 0.82);
    hiddenInput.value = compressedDataUrl;
    previewImg.src = compressedDataUrl;
    if (previewText) {
      const sizeKb = Math.round((compressedDataUrl.length * 3 / 4) / 1024);
      previewText.textContent = `${file.name || 'Şəkil'} (~${sizeKb} KB)`;
    }
    if (dropzone) dropzone.style.display = 'none';
    if (previewContainer) previewContainer.style.display = 'flex';
    notify('Şəkil uğurla hazırlandı!');
  } catch (err) {
    console.error('Şəkil sıxma xətası:', err);
    notify('Şəkli emal edərkən xəta baş verdi', true);
  }
}

function resetSelectedImage() {
  const fileInput = document.getElementById('prodFileInput');
  const hiddenInput = document.getElementById('prodImageUrl');
  const dropzone = document.getElementById('uploadDropzone');
  const previewContainer = document.getElementById('imagePreviewContainer');
  const directUrlInput = document.getElementById('prodDirectUrlInput');
  const urlContainer = document.getElementById('urlInputContainer');

  if (fileInput) fileInput.value = '';
  if (hiddenInput) hiddenInput.value = '';
  if (directUrlInput) directUrlInput.value = '';
  if (previewContainer) previewContainer.style.display = 'none';
  if (urlContainer) urlContainer.style.display = 'none';
  if (dropzone) dropzone.style.display = 'block';
}

// Canvas ilə şəkli sıxmaq (Keyfiyyəti qoruyaraq yüngülləşdirir, şəffaf PNG-lərin arxasını ağ edir)
function compressImageFile(file, maxDimension = 850, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // Şəffaf PNG-lərin arxa fonunu təmiz ağ edirik
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Şəkil faylı oxuna bilmədi'));
      img.src = readerEvent.target.result;
    };
    reader.onerror = () => reject(new Error('Fayl oxuma xətası'));
    reader.readAsDataURL(file);
  });
}

// 5. Kateqoriyaları Gətir & Render Et
async function fetchCategories() {
  try {
    const snap = await db.collection('categories').get();
    adminCategories = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sayğacları yenilə
    const countEl = document.getElementById('totalCategoriesCount');
    if (countEl) countEl.textContent = adminCategories.length;
    const sideCatCount = document.getElementById('sideCatCount');
    if (sideCatCount) sideCatCount.textContent = adminCategories.length;

    // Select menyunu doldur
    const select = document.getElementById('prodCategory');
    if (select) {
      select.innerHTML = '<option value="">Kateqoriya seçin...</option>';
      adminCategories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        select.appendChild(opt);
      });
    }

    // Cədvəli doldur
    const tableBody = document.getElementById('categoriesTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (adminCategories.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="2">
            <div class="empty-state-box">
              <i class="fa-solid fa-layer-group"></i>
              <h4>Heç bir kateqoriya yaradılmayıb</h4>
              <p>Yuxarıdakı formadan kateqoriya əlavə edin və ya standart kateqoriyaları dərhal bərpa edin.</p>
              <button onclick="seedDefaultCategories()" class="btn-admin-primary">
                <i class="fa-solid fa-wand-magic-sparkles"></i> Standart Kateqoriyaları Bərpa Et
              </button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    adminCategories.forEach(cat => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 700; color: var(--text-dark);">${escapeHtml(cat.name)}</td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="action-btn-pill action-edit" onclick="editCategory('${escapeHtml(cat.id)}')">
            <i class="fa-solid fa-pen-to-square"></i> Redaktə
          </button>
          <button class="action-btn-pill action-delete" onclick="deleteCategory('${escapeHtml(cat.id)}')">
            <i class="fa-solid fa-trash"></i> Sil
          </button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
    notify('Kateqoriyaları yükləyərkən xəta baş verdi', true);
  }
}

// 6. Kateqoriya Əlavə Et
async function handleCategorySubmit(e) {
  e.preventDefault();
  const input = document.getElementById('newCatName');
  const name = input.value.trim();

  if (!name) return;

  try {
    await db.collection('categories').add({ name, createdAt: new Date() });
    notify(`"${name}" kateqoriyası yaradıldı!`);
    input.value = '';
    await fetchCategories();
  } catch (err) {
    console.error(err);
    notify(err.message, true);
  }
}

// 7. Kateqoriyanı Redaktə Et
window.editCategory = async function(id) {
  const cat = adminCategories.find(c => c.id === id);
  if (!cat) return;
  const newName = prompt('Kateqoriyanın yeni adını daxil edin:', cat.name);
  if (!newName || newName.trim() === '' || newName.trim() === cat.name) return;

  try {
    await db.collection('categories').doc(id).update({ name: newName.trim() });
    notify(`Kateqoriya "${newName.trim()}" olaraq yeniləndi!`);
    await fetchCategories();
    await fetchProducts();
  } catch (err) {
    console.error(err);
    notify(err.message, true);
  }
};

// 8. Standart Kateqoriyaları Tətbiq Et
window.seedDefaultCategories = async function() {
  if (!confirm('Standart kateqoriyalar (Şokoladlı, Ad günü, Nişan və toy, Fərdi dizaynlı) əlavə edilsin?')) return;
  const DEFAULT_CATS = [
    'Şokoladlı tortlar',
    'Ad günü tortları',
    'Nişan və toy tortları',
    'Fərdi dizaynlı tortlar'
  ];

  try {
    const batch = db.batch();
    for (const catName of DEFAULT_CATS) {
      const exists = adminCategories.some(c => c.name.toLowerCase() === catName.toLowerCase());
      if (!exists) {
        const docRef = db.collection('categories').doc();
        batch.set(docRef, { name: catName, createdAt: new Date() });
      }
    }
    await batch.commit();
    notify('Standart kateqoriyalar uğurla tətbiq edildi!');
    await fetchCategories();
  } catch (err) {
    console.error(err);
    notify(err.message, true);
  }
};

// 9. Kateqoriyanı Sil
window.deleteCategory = async function(id) {
  if (!confirm('Bu kateqoriyanı silmək istəyirsiniz?')) return;
  try {
    await db.collection('categories').doc(id).delete();
    notify('Kateqoriya silindi.');
    await fetchCategories();
    await fetchProducts();
  } catch (err) {
    console.error(err);
    notify(err.message, true);
  }
};

// 10. Tortları Gətir & Render Et
async function fetchProducts() {
  try {
    const snap = await db.collection('products').get();
    adminProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sayğacları yenilə
    const countEl = document.getElementById('totalProductsCount');
    if (countEl) countEl.textContent = adminProducts.length;
    const sideProdCount = document.getElementById('sideProdCount');
    if (sideProdCount) sideProdCount.textContent = adminProducts.length;
    const tableBadge = document.getElementById('tableProductsCountBadge');
    if (tableBadge) tableBadge.textContent = adminProducts.length;

    const tableBody = document.getElementById('productsTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (adminProducts.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state-box">
              <i class="fa-solid fa-cake-candles"></i>
              <h4>Kataloqda hələ heç bir tort yoxdur</h4>
              <p>Yuxarıdakı formanı dolduraraq ilk tortunuzu əlavə edin. Şəkli birbaşa cihazınızdan seçə bilərsiniz.</p>
              <button onclick="focusProductForm()" class="btn-admin-primary">
                <i class="fa-solid fa-plus"></i> İlk Tortu Əlavə Et
              </button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    adminProducts.forEach(prod => {
      const cat = adminCategories.find(c => c.id === prod.categoryId);
      const catName = cat ? cat.name : 'Eksklüziv';
      const prodCode = prod.code || getProductCode(prod);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <img src="${escapeHtml(prod.imageUrl)}" class="table-cake-img" alt="${escapeHtml(prod.name)}" onerror="this.src='https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=120&q=80'" />
        </td>
        <td><span class="table-code-badge">${escapeHtml(prodCode)}</span></td>
        <td style="font-weight: 700; color: var(--text-dark);">${escapeHtml(prod.name)}</td>
        <td><span class="category-badge-pill">${escapeHtml(catName)}</span></td>
        <td><span class="price-badge-bold">${Number(prod.price) || 0} <span>AZN / kq</span></span></td>
        <td style="max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-muted); font-size: 0.85rem;" title="${escapeHtml(prod.description)}">${escapeHtml(prod.description)}</td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="action-btn-pill action-edit" onclick="startEditProduct('${escapeHtml(prod.id)}')">
            <i class="fa-solid fa-pen-to-square"></i> Redaktə
          </button>
          <button class="action-btn-pill action-delete" onclick="deleteProduct('${escapeHtml(prod.id)}')">
            <i class="fa-solid fa-trash"></i> Sil
          </button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
    notify('Məhsullar yüklənərkən xəta baş verdi', true);
  }
}

// 11. Tort Əlavə Et və ya Yenilə (Create / Update)
async function handleProductSubmit(e) {
  e.preventDefault();

  const editId = document.getElementById('editProdId').value;
  const name = document.getElementById('prodName').value.trim();
  let code = document.getElementById('prodCode').value.trim().toUpperCase();
  const price = Number(document.getElementById('prodPrice').value);
  const categoryId = document.getElementById('prodCategory').value;
  const imageUrl = document.getElementById('prodImageUrl').value.trim();
  const description = document.getElementById('prodDesc').value.trim();

  if (!code) {
    code = `SB-${Math.floor(100 + Math.random() * 899)}`;
  }

  if (!imageUrl) {
    notify('Zəhmət olmasa tortun şəklini yaddaşdan seçin!', true);
    return;
  }

  const productData = {
    name,
    code,
    price,
    categoryId,
    imageUrl,
    description,
    priceUnit: 'kq',
    updatedAt: new Date()
  };

  try {
    notify('Məlumatlar saxlanılır...');
    if (editId) {
      await db.collection('products').doc(editId).update(productData);
      notify(`"${name}" (${code}) uğurla yeniləndi!`);
    } else {
      productData.createdAt = new Date();
      await db.collection('products').add(productData);
      notify(`"${name}" (${code}) tortu kataloqa əlavə edildi!`);
    }

    resetProductForm();
    await fetchProducts();

  } catch (err) {
    console.error(err);
    notify(err.message, true);
  }
}

// 12. Tort Redaktəsinə Başla
window.startEditProduct = function(id) {
  const prod = adminProducts.find(p => p.id === id);
  if (!prod) return;

  switchTab('productsTab');

  document.getElementById('editProdId').value = prod.id;
  document.getElementById('prodName').value = prod.name;
  document.getElementById('prodCode').value = prod.code || getProductCode(prod);
  document.getElementById('prodPrice').value = prod.price;
  document.getElementById('prodCategory').value = prod.categoryId;
  document.getElementById('prodImageUrl').value = prod.imageUrl;
  document.getElementById('prodDesc').value = prod.description;

  // Şəklin önizlənməsi
  const dropzone = document.getElementById('uploadDropzone');
  const previewContainer = document.getElementById('imagePreviewContainer');
  const previewImg = document.getElementById('imagePreview');
  const previewText = document.getElementById('imagePreviewText');
  const urlContainer = document.getElementById('urlInputContainer');

  if (prod.imageUrl) {
    previewImg.src = prod.imageUrl;
    if (previewText) previewText.textContent = 'Mövcud şəkil saxlanıldı';
    if (dropzone) dropzone.style.display = 'none';
    if (previewContainer) previewContainer.style.display = 'flex';
  } else {
    if (dropzone) dropzone.style.display = 'block';
    if (previewContainer) previewContainer.style.display = 'none';
  }
  if (urlContainer) urlContainer.style.display = 'none';

  document.getElementById('productFormTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Tortu Redaktə Et';
  document.getElementById('submitProdBtn').innerHTML = '<i class="fa-solid fa-check"></i> Yenilə';
  document.getElementById('cancelProdEditBtn').style.display = 'inline-flex';

  focusProductForm();
};

// 13. Redaktəni Ləğv Et
function resetProductForm() {
  document.getElementById('editProdId').value = '';
  document.getElementById('productForm').reset();
  document.getElementById('prodCode').value = '';
  document.getElementById('prodImageUrl').value = '';
  const fileInput = document.getElementById('prodFileInput');
  if (fileInput) fileInput.value = '';
  const directUrlInput = document.getElementById('prodDirectUrlInput');
  if (directUrlInput) directUrlInput.value = '';
  const dropzone = document.getElementById('uploadDropzone');
  if (dropzone) dropzone.style.display = 'block';
  const previewContainer = document.getElementById('imagePreviewContainer');
  if (previewContainer) previewContainer.style.display = 'none';
  const urlContainer = document.getElementById('urlInputContainer');
  if (urlContainer) urlContainer.style.display = 'none';
  document.getElementById('productFormTitle').innerHTML = '<i class="fa-solid fa-circle-plus"></i> Yeni Tort Əlavə Et';
  document.getElementById('submitProdBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Yadda Saxla';
  document.getElementById('cancelProdEditBtn').style.display = 'none';
}

// 14. Tortu Sil
window.deleteProduct = async function(id) {
  if (!confirm('Bu tortu birdəfəlik silmək istədiyinizdən əminsiniz?')) return;
  try {
    await db.collection('products').doc(id).delete();
    notify('Tort kataloqdan silindi.');
    await fetchProducts();
  } catch (err) {
    console.error(err);
    notify(err.message, true);
  }
};

// 15. Tab Keçidləri
window.switchTab = function(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
  const target = document.getElementById(tabId);
  if (target) target.style.display = 'block';

  document.querySelectorAll('.admin-nav-item').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`.admin-nav-item[onclick*="${tabId}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  const desc = document.getElementById('adminHeaderDesc');
  if (desc) {
    if (tabId === 'productsTab') desc.textContent = 'Məhsul kataloqu, qiymətlər və tortlar üzərində tam nəzarət';
    else if (tabId === 'categoriesTab') desc.textContent = 'Tortların çeşidlənməsi üçün kateqoriya qrupları';
    else if (tabId === 'flavorsTab') desc.textContent = 'Müştərilərin fərdi sifarişdə seçə biləcəyi dad və krem seçimləri';
  }
};

// 16. Formaya Fokuslanmaq
window.focusProductForm = function() {
  switchTab('productsTab');
  const card = document.getElementById('productFormCard');
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      document.getElementById('prodName')?.focus();
    }, 400);
  }
};

// 17. Dadları Gətir & Render Et
async function fetchFlavors() {
  const alertBanner = document.getElementById('rulesAlertBanner');
  try {
    const snap = await db.collection('flavors').get();
    adminFlavors = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (alertBanner) alertBanner.style.display = 'none';

    const countEl = document.getElementById('totalFlavorsCount');
    if (countEl) countEl.textContent = adminFlavors.length;
    const sideFlvCount = document.getElementById('sideFlvCount');
    if (sideFlvCount) sideFlvCount.textContent = adminFlavors.length;

    const tableBody = document.getElementById('flavorsTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (adminFlavors.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="2">
            <div class="empty-state-box">
              <i class="fa-solid fa-ice-cream"></i>
              <h4>Hələ heç bir dad əlavə edilməyib</h4>
              <p>Müştəriləriniz üçün standart patisserie dadlarını (Şokoladlı, Qırmızı Məxmər, Püstəli və s.) bir kliklə bərpa edin.</p>
              <button onclick="seedDefaultFlavors()" class="btn-admin-primary">
                <i class="fa-solid fa-wand-magic-sparkles"></i> Standart Dadları Bərpa Et
              </button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    adminFlavors.forEach(flavor => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 700; color: var(--text-dark);">${escapeHtml(flavor.name)}</td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="action-btn-pill action-edit" onclick="editFlavor('${escapeHtml(flavor.id)}')">
            <i class="fa-solid fa-pen-to-square"></i> Redaktə
          </button>
          <button class="action-btn-pill action-delete" onclick="deleteFlavor('${escapeHtml(flavor.id)}')">
            <i class="fa-solid fa-trash"></i> Sil
          </button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error('fetchFlavors error:', err);
    if (alertBanner) alertBanner.style.display = 'flex';
    if (err.code === 'permission-denied') {
      notify('Firestore qaydaları yenilənməlidir! Firebase Console-da qaydaları təsdiqləyin.', true);
    } else {
      notify('Dadları yükləyərkən xəta: ' + (err.message || 'Baza xətası'), true);
    }
  }
}

// 18. Dad Əlavə Et
async function handleFlavorSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('newFlavorName');
  const name = input.value.trim();
  if (!name) return;

  try {
    await db.collection('flavors').add({ name, createdAt: new Date() });
    notify(`"${name}" dadı əlavə edildi!`);
    input.value = '';
    await fetchFlavors();
  } catch (err) {
    console.error(err);
    notify(err.message, true);
  }
}

// 19. Dadı Redaktə Et
window.editFlavor = async function(id) {
  const flavor = adminFlavors.find(f => f.id === id);
  if (!flavor) return;
  const newName = prompt('Dadın yeni adını daxil edin:', flavor.name);
  if (!newName || newName.trim() === '' || newName.trim() === flavor.name) return;

  try {
    await db.collection('flavors').doc(id).update({ name: newName.trim() });
    notify(`Dad "${newName.trim()}" olaraq yeniləndi!`);
    await fetchFlavors();
  } catch (err) {
    console.error(err);
    notify(err.message, true);
  }
};

// 20. Dadı Sil
window.deleteFlavor = async function(id) {
  if (!confirm('Bu dadı silmək istəyirsiniz?')) return;
  try {
    await db.collection('flavors').doc(id).delete();
    notify('Dad silindi.');
    await fetchFlavors();
  } catch (err) {
    console.error(err);
    notify(err.message, true);
  }
};

// 21. Standart Dadları Bərpa Et
window.seedDefaultFlavors = async function() {
  if (!confirm('Standart dadlar bazaya əlavə edilsin?')) return;
  const DEFAULT_FLAVORS = [
    'Klassik Şokoladlı & Qanaş',
    'Qırmızı Məxmər (Red Velvet)',
    'Təbii Giləmeyvəli & Vanilli',
    'Antep Püstəli & Moruqlu',
    'Karamel & Fındıqlı Krukan',
    'Fərdi resept (izahda qeyd edəcəm)'
  ];

  try {
    const batch = db.batch();
    for (const flvName of DEFAULT_FLAVORS) {
      const exists = adminFlavors.some(f => f.name.toLowerCase() === flvName.toLowerCase());
      if (!exists) {
        const docRef = db.collection('flavors').doc();
        batch.set(docRef, { name: flvName, createdAt: new Date() });
      }
    }
    await batch.commit();
    notify('Standart dadlar uğurla tətbiq edildi!');
    await fetchFlavors();
  } catch (err) {
    console.error(err);
    notify(err.message, true);
  }
};

// 22. Firestore Qaydalarını Kopyalama Köməkçisi
window.copyFirestoreRulesPrompt = function() {
  const rulesCode = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isAdmin() {
      return isAuthenticated() &&
        request.auth.token.email != null &&
        (
          request.auth.token.email in [
            'admin@bakery.com',
            'admin@sweetbakery.az',
            'elnuraliyew@gmail.com'
          ] ||
          (request.auth.token.keys().hasAll(['admin']) && request.auth.token.admin == true)
        );
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function hasRequiredFields(fields) {
      return request.resource.data.keys().hasAll(fields);
    }

    function hasOnlyAllowedFields(fields) {
      return request.resource.data.keys().hasOnly(fields);
    }

    function isValidEmail(email) {
      return email is string &&
        email.matches("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}$");
    }

    function isValidProduct(data) {
      return hasOnlyAllowedFields([
          'name', 'code', 'price', 'categoryId', 'imageUrl',
          'description', 'priceUnit', 'createdAt', 'updatedAt'
        ]) &&
        hasRequiredFields(['name', 'code', 'price', 'categoryId', 'imageUrl']) &&
        data.name is string && data.name.size() >= 1 && data.name.size() <= 150 &&
        data.code is string && data.code.size() >= 1 && data.code.size() <= 30 &&
        data.price is number && data.price > 0 && data.price <= 100000 &&
        data.categoryId is string && data.categoryId.size() >= 1 && data.categoryId.size() <= 100 &&
        data.imageUrl is string && data.imageUrl.size() >= 1 && data.imageUrl.size() <= 850000 &&
        (data.imageUrl.matches('^https?://.*') || data.imageUrl.matches('^data:image/.*') || data.imageUrl.matches('^gs://.*')) &&
        (!('description' in data) || (data.description is string && data.description.size() <= 2000)) &&
        (!('priceUnit' in data) || (data.priceUnit is string && data.priceUnit.size() <= 20)) &&
        (!('createdAt' in data) || data.createdAt is timestamp) &&
        (!('updatedAt' in data) || data.updatedAt is timestamp);
    }

    function isValidCategory(data) {
      return hasOnlyAllowedFields(['name', 'createdAt']) &&
        hasRequiredFields(['name']) &&
        data.name is string && data.name.size() >= 1 && data.name.size() <= 100 &&
        (!('createdAt' in data) || data.createdAt is timestamp);
    }

    function isValidFlavor(data) {
      return hasOnlyAllowedFields(['name', 'createdAt']) &&
        hasRequiredFields(['name']) &&
        data.name is string && data.name.size() >= 1 && data.name.size() <= 100 &&
        (!('createdAt' in data) || data.createdAt is timestamp);
    }

    function isValidCustomOrderCreate(data) {
      return hasOnlyAllowedFields([
          'clientName', 'phone', 'deliveryDate', 'size', 'flavor',
          'status', 'createdAt', 'designDescription', 'additionalNotes'
        ]) &&
        hasRequiredFields([
          'clientName', 'phone', 'deliveryDate', 'size', 'flavor',
          'status', 'createdAt'
        ]) &&
        data.clientName is string && data.clientName.size() >= 1 && data.clientName.size() <= 100 &&
        data.phone is string && data.phone.size() >= 1 && data.phone.size() <= 35 &&
        data.deliveryDate is string && data.deliveryDate.size() >= 1 && data.deliveryDate.size() <= 60 &&
        data.size is string && data.size.size() >= 1 && data.size.size() <= 30 &&
        data.flavor is string && data.flavor.size() >= 1 && data.flavor.size() <= 100 &&
        data.status == 'Gözləmədə' &&
        data.createdAt is timestamp &&
        (!('designDescription' in data) || (data.designDescription is string && data.designDescription.size() <= 1000)) &&
        (!('additionalNotes' in data) || (data.additionalNotes is string && data.additionalNotes.size() <= 1000));
    }

    function isValidCustomOrderUpdate(data) {
      return hasOnlyAllowedFields([
          'clientName', 'phone', 'deliveryDate', 'size', 'flavor',
          'status', 'createdAt', 'designDescription', 'additionalNotes', 'updatedAt'
        ]) &&
        hasRequiredFields([
          'clientName', 'phone', 'deliveryDate', 'size', 'flavor',
          'status', 'createdAt'
        ]) &&
        data.clientName is string && data.clientName.size() >= 1 && data.clientName.size() <= 100 &&
        data.phone is string && data.phone.size() >= 1 && data.phone.size() <= 35 &&
        data.deliveryDate is string && data.deliveryDate.size() >= 1 && data.deliveryDate.size() <= 60 &&
        data.size is string && data.size.size() >= 1 && data.size.size() <= 30 &&
        data.flavor is string && data.flavor.size() >= 1 && data.flavor.size() <= 100 &&
        data.status is string && data.status.size() >= 1 && data.status.size() <= 50 &&
        data.createdAt is timestamp &&
        data.createdAt == resource.data.createdAt &&
        (!('designDescription' in data) || (data.designDescription is string && data.designDescription.size() <= 1000)) &&
        (!('additionalNotes' in data) || (data.additionalNotes is string && data.additionalNotes.size() <= 1000)) &&
        (!('updatedAt' in data) || data.updatedAt is timestamp);
    }

    function isValidUser(data) {
      return hasOnlyAllowedFields(['uid', 'name', 'email', 'role', 'createdAt', 'updatedAt']) &&
        hasRequiredFields(['uid', 'name', 'email', 'role']) &&
        data.uid is string && data.uid.size() >= 1 && data.uid.size() <= 128 &&
        data.name is string && data.name.size() >= 1 && data.name.size() <= 100 &&
        data.email is string && data.email.size() >= 3 && data.email.size() <= 100 && isValidEmail(data.email) &&
        data.role is string && (data.role == 'client' || data.role == 'admin') &&
        (!('createdAt' in data) || data.createdAt is timestamp) &&
        (!('updatedAt' in data) || data.updatedAt is timestamp);
    }

    match /products/{productId} {
      allow read: if true;
      allow create: if isAdmin() && isValidProduct(request.resource.data);
      allow update: if isAdmin() &&
        isValidProduct(request.resource.data) &&
        (!('createdAt' in resource.data) || request.resource.data.createdAt == resource.data.createdAt);
      allow delete: if isAdmin();
    }

    match /categories/{categoryId} {
      allow read: if true;
      allow create: if isAdmin() && isValidCategory(request.resource.data);
      allow update: if isAdmin() &&
        isValidCategory(request.resource.data) &&
        (!('createdAt' in resource.data) || request.resource.data.createdAt == resource.data.createdAt);
      allow delete: if isAdmin();
    }

    match /flavors/{flavorId} {
      allow read: if true;
      allow create: if isAdmin() && isValidFlavor(request.resource.data);
      allow update: if isAdmin() &&
        isValidFlavor(request.resource.data) &&
        (!('createdAt' in resource.data) || request.resource.data.createdAt == resource.data.createdAt);
      allow delete: if isAdmin();
    }

    match /custom_orders/{orderId} {
      allow create: if isValidCustomOrderCreate(request.resource.data);
      allow read, delete: if isAdmin();
      allow update: if isAdmin() && isValidCustomOrderUpdate(request.resource.data);
    }

    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create: if isAuthenticated() &&
        isValidUser(request.resource.data) &&
        (
          (isOwner(userId) && request.resource.data.uid == userId && request.resource.data.role == 'client') ||
          isAdmin()
        );
      allow update: if isAuthenticated() &&
        isValidUser(request.resource.data) &&
        (
          (
            isOwner(userId) &&
            request.resource.data.uid == resource.data.uid &&
            request.resource.data.role == resource.data.role &&
            (!('createdAt' in resource.data) || request.resource.data.createdAt == resource.data.createdAt)
          ) ||
          isAdmin()
        );
      allow delete: if isAdmin();
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}`;
  navigator.clipboard.writeText(rulesCode).then(() => {
    alert('Firestore Qaydaları kopyalandı!\\n\\nFirebase Console -> Firestore Database -> Rules bölməsinə keçib yapışdırın və "Publish" vurun.');
  }).catch(() => {
    prompt('Firestore Qaydalarını kopyalayın və Firebase Console-da yapışdırın:', rulesCode);
  });
};

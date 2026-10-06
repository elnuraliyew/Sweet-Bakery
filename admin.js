// admin.js - Sweet Bakery Professional Admin Dashboard Məntiqi

const ADMIN_EMAILS = [
  'admin@bakery.com',
  'admin@sweetbakery.az',
  'elnuraliyew@gmail.com'
];

let adminProducts = [];
let adminCategories = [];

function isAdminUser(user) {
  if (!user || !user.email) return false;
  return ADMIN_EMAILS.some(e => e.toLowerCase() === user.email.toLowerCase());
}

// Bildiriş (Toast) Mesajı Funksiyası
function notify(text, isError = false) {
  const toast = document.createElement('div');
  toast.innerHTML = `<i class="fa-solid ${isError ? 'fa-triangle-exclamation' : 'fa-circle-check'}"></i> ${text}`;
  toast.style.cssText = `
    position: fixed;
    top: 25px;
    right: 25px;
    background: ${isError ? '#c5221f' : '#137333'};
    color: #fff;
    padding: 1rem 1.6rem;
    border-radius: 12px;
    font-weight: 600;
    font-size: 0.95rem;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    animation: fadeIn 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// 1. Auth Status Yoxlanışı (Giriş etməyibsə modal çıxır, adi müştəridirsə bloklanır)
auth.onAuthStateChanged(user => {
  const loginModal = document.getElementById('loginModal');
  const adminDashboard = document.getElementById('adminDashboard');
  const userBadge = document.getElementById('userBadge');

  if (user) {
    if (!isAdminUser(user)) {
      alert('Bu səhifə yalnız Sweet Bakery adminləri üçündür!');
      window.location.href = 'index.html';
      return;
    }

    if (loginModal) loginModal.style.display = 'none';
    if (adminDashboard) adminDashboard.style.display = 'flex';
    if (userBadge) userBadge.innerHTML = `<i class="fa-solid fa-crown" style="color:#d4a373;"></i> ${user.email}`;
    initAdminData();
  } else {
    if (loginModal) loginModal.style.display = 'flex';
    if (adminDashboard) adminDashboard.style.display = 'none';
  }
});

// 2. Giriş Formu
const loginForm = document.getElementById('adminLoginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value.trim();
    const pass = document.getElementById('adminPassword').value;
    const errDiv = document.getElementById('loginError');

    try {
      errDiv.textContent = '';
      await auth.signInWithEmailAndPassword(email, pass);
      notify('Uğurla daxil oldunuz!');
    } catch (err) {
      console.error(err);
      errDiv.textContent = 'Giriş uğursuz oldu: E-poçt və ya şifrə yanlışdır.';
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
  setupEventListeners();
}

function setupEventListeners() {
  // Tort Formu Submit
  const prodForm = document.getElementById('productForm');
  if (prodForm) {
    prodForm.addEventListener('submit', handleProductSubmit);
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
}

// 5. Kateqoriyaları Gətir & Render Et
async function fetchCategories() {
  try {
    const snap = await db.collection('categories').get();
    adminCategories = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sayğacı yenilə
    document.getElementById('totalCategoriesCount').textContent = adminCategories.length;

    // Select menyunu doldur
    const select = document.getElementById('prodCategory');
    select.innerHTML = '<option value="">Kateqoriya seçin...</option>';

    // Cədvəli doldur
    const tableBody = document.getElementById('categoriesTableBody');
    tableBody.innerHTML = '';

    if (adminCategories.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:#888;">Hələ heç bir kateqoriya yaradılmayıb.</td></tr>';
    }

    adminCategories.forEach(cat => {
      // Option
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      select.appendChild(opt);

      // Row
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600;">${cat.name}</td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="action-btn action-edit" onclick="editCategory('${cat.id}', '${cat.name.replace(/'/g, "\\'")}')">
            <i class="fa-solid fa-pen-to-square"></i> Redaktə
          </button>
          <button class="action-btn action-delete" onclick="deleteCategory('${cat.id}')">
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
window.editCategory = async function(id, currentName) {
  const newName = prompt('Kateqoriyanın yeni adını daxil edin:', currentName);
  if (!newName || newName.trim() === '' || newName.trim() === currentName) return;

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

// 8. Standart Kateqoriyaları Tətbiq Et (Şəkildəki 4 kateqoriya)
window.seedDefaultCategories = async function() {
  if (!confirm('Standart kateqoriyalar (Şokoladlı, Meyvəli, Toy & Nişan, Bento) bazaya əlavə edilsin?')) return;
  const DEFAULT_CATS = [
    'Şokoladlı Tortlar',
    'Meyvəli & Giləmeyvəli',
    'Toy & Nişan Tortları',
    'Bento Tortlar'
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

// 8. Tortları Gətir & Render Et
async function fetchProducts() {
  try {
    const snap = await db.collection('products').get();
    adminProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sayğacı yenilə
    document.getElementById('totalProductsCount').textContent = adminProducts.length;

    const tableBody = document.getElementById('productsTableBody');
    tableBody.innerHTML = '';

    if (adminProducts.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#888; padding: 2rem;">Kataloqda hələ tort yoxdur. Yuxarıdakı formadan əlavə edin.</td></tr>';
      return;
    }

    adminProducts.forEach(prod => {
      const cat = adminCategories.find(c => c.id === prod.categoryId);
      const catName = cat ? cat.name : 'Təyin edilməyib';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <img src="${prod.imageUrl}" class="table-img" onerror="this.src='https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=100&q=80'" />
        </td>
        <td style="font-weight: 700; color: var(--choco-dark);">${prod.name}</td>
        <td><span style="background: var(--soft-rose); color: var(--dusty-rose); padding: 0.25rem 0.7rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600;">${catName}</span></td>
        <td style="font-weight: 700; color: var(--dusty-rose);">${prod.price} AZN</td>
        <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--choco-muted); font-size: 0.85rem;">${prod.description}</td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="action-btn action-edit" onclick="startEditProduct('${prod.id}')">
            <i class="fa-solid fa-pen-to-square"></i> Redaktə
          </button>
          <button class="action-btn action-delete" onclick="deleteProduct('${prod.id}')">
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

// 9. Tort Əlavə Et və ya Yenilə (Create / Update)
async function handleProductSubmit(e) {
  e.preventDefault();

  const editId = document.getElementById('editProdId').value;
  const name = document.getElementById('prodName').value.trim();
  const price = Number(document.getElementById('prodPrice').value);
  const categoryId = document.getElementById('prodCategory').value;
  const imageUrl = document.getElementById('prodImageUrl').value.trim();
  const description = document.getElementById('prodDesc').value.trim();

  const productData = {
    name,
    price,
    categoryId,
    imageUrl,
    description,
    updatedAt: new Date()
  };

  try {
    if (editId) {
      await db.collection('products').doc(editId).update(productData);
      notify(`"${name}" uğurla yeniləndi!`);
    } else {
      productData.createdAt = new Date();
      await db.collection('products').add(productData);
      notify(`"${name}" tortu kataloqa əlavə edildi!`);
    }

    resetProductForm();
    await fetchProducts();

  } catch (err) {
    console.error(err);
    notify(err.message, true);
  }
}

// 10. Tort Redaktəsinə Başla
window.startEditProduct = function(id) {
  const prod = adminProducts.find(p => p.id === id);
  if (!prod) return;

  document.getElementById('editProdId').value = prod.id;
  document.getElementById('prodName').value = prod.name;
  document.getElementById('prodPrice').value = prod.price;
  document.getElementById('prodCategory').value = prod.categoryId;
  document.getElementById('prodImageUrl').value = prod.imageUrl;
  document.getElementById('prodDesc').value = prod.description;

  document.getElementById('productFormTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Tortu Redaktə Et';
  document.getElementById('submitProdBtn').innerHTML = '<i class="fa-solid fa-check"></i> Yenilə';
  document.getElementById('cancelProdEditBtn').style.display = 'inline-block';

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 11. Redaktəni Ləğv Et
function resetProductForm() {
  document.getElementById('editProdId').value = '';
  document.getElementById('productForm').reset();
  document.getElementById('productFormTitle').innerHTML = '<i class="fa-solid fa-circle-plus"></i> Yeni Tort Əlavə Et';
  document.getElementById('submitProdBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Yadda Saxla';
  document.getElementById('cancelProdEditBtn').style.display = 'none';
}

// 12. Tortu Sil
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

// 13. Tab Keçidləri (Tortlar <-> Kateqoriyalar)
window.switchTab = function(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
  document.getElementById(tabId).style.display = 'block';

  document.querySelectorAll('.admin-nav-item').forEach(btn => btn.classList.remove('active'));
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  }
};

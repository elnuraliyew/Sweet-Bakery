// admin.js - Sweet Bakery Admin İdarəetmə Paneli

function showMessage(msg, isError = false) {
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.position = 'fixed';
    el.style.bottom = '20px';
    el.style.left = '50%';
    el.style.transform = 'translateX(-50%)';
    el.style.background = isError ? '#d9534f' : '#5cb85c';
    el.style.color = '#fff';
    el.style.padding = '0.75rem 1.5rem';
    el.style.borderRadius = '8px';
    el.style.zIndex = 9999;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

// Giriş qoruması (Auth check)
firebase.auth().onAuthStateChanged(user => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    initAdmin();
});

let allCategories = [];
let allProducts = [];

function initAdmin() {
    loadCategories();
    loadProducts();

    document.getElementById('addCategoryBtn').addEventListener('click', addCategory);
    document.getElementById('saveProductBtn').addEventListener('click', saveProduct);
    document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);
    
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await firebase.auth().signOut();
        window.location.href = 'login.html';
    });
}

// Kateqoriyaları yüklə
async function loadCategories() {
    try {
        const snap = await firebase.firestore().collection('categories').get();
        allCategories = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Siyahını render et
        const list = document.getElementById('categoryList');
        list.innerHTML = '';
        
        // Select menyusunu yenilə
        const select = document.getElementById('prodCategory');
        select.innerHTML = '<option value="">Kateqoriya seçin</option>';

        allCategories.forEach(cat => {
            // Siyahı elementi
            const li = document.createElement('li');
            li.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: rgba(255,255,255,0.25); border-radius: 8px; margin-bottom: 0.5rem;';
            li.innerHTML = `
                <span><strong>${cat.name}</strong></span>
                <button onclick="deleteCategory('${cat.id}')" style="width: auto; background: #d9534f; padding: 0.25rem 0.75rem; font-size: 0.85rem;">Sil</button>
            `;
            list.appendChild(li);

            // Select option
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error(err);
        showMessage('Kateqoriyalar yüklənmədi', true);
    }
}

// Kateqoriya əlavə et
async function addCategory() {
    const input = document.getElementById('newCatName');
    const name = input.value.trim();
    if (!name) {
        showMessage('Kateqoriya adını daxil edin!', true);
        return;
    }
    try {
        await firebase.firestore().collection('categories').add({ name });
        input.value = '';
        showMessage('Kateqoriya uğurla əlavə edildi!');
        loadCategories();
    } catch (err) {
        console.error(err);
        showMessage(err.message, true);
    }
}

// Kateqoriya sil
window.deleteCategory = async function(id) {
    if (!confirm('Bu kateqoriyanı silmək istədiyinizdən əminsiniz?')) return;
    try {
        await firebase.firestore().collection('categories').doc(id).delete();
        showMessage('Kateqoriya silindi');
        loadCategories();
    } catch (err) {
        console.error(err);
        showMessage(err.message, true);
    }
};

// Tortları yüklə
async function loadProducts() {
    try {
        const snap = await firebase.firestore().collection('products').get();
        allProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const list = document.getElementById('productList');
        list.innerHTML = '';

        allProducts.forEach(prod => {
            const cat = allCategories.find(c => c.id === prod.categoryId);
            const catName = cat ? cat.name : 'Kateqoriyasız';

            const card = document.createElement('div');
            card.style.cssText = 'background: rgba(255,255,255,0.25); border-radius: 10px; padding: 1rem; text-align: left;';
            card.innerHTML = `
                <img src="${prod.imageUrl}" alt="${prod.name}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 8px; margin-bottom: 0.5rem;" onerror="this.src='https://via.placeholder.com/300x200?text=Tort+Şəkli'" />
                <h4 style="color: var(--accent-rose); margin-bottom: 0.25rem;">${prod.name}</h4>
                <p style="font-size: 0.85rem; margin-bottom: 0.25rem;"><strong>Tərkib:</strong> ${prod.description}</p>
                <p style="font-size: 0.85rem; margin-bottom: 0.25rem;"><strong>Kateqoriya:</strong> ${catName}</p>
                <p style="font-weight: bold; margin-bottom: 0.75rem;">Qiymət: ${prod.price} AZN</p>
                <div style="display: flex; gap: 8px;">
                    <button onclick="startEditProduct('${prod.id}')" style="background: #2b7a78; font-size: 0.85rem; padding: 0.4rem;">Redaktə et</button>
                    <button onclick="deleteProduct('${prod.id}')" style="background: #d9534f; font-size: 0.85rem; padding: 0.4rem;">Sil</button>
                </div>
            `;
            list.appendChild(card);
        });
    } catch (err) {
        console.error(err);
        showMessage('Tortlar yüklənmədi', true);
    }
}

// Tort əlavə et və ya yenilə
async function saveProduct() {
    const editId = document.getElementById('editProductId').value;
    const name = document.getElementById('prodName').value.trim();
    const desc = document.getElementById('prodDesc').value.trim();
    const price = Number(document.getElementById('prodPrice').value);
    const img = document.getElementById('prodImg').value.trim();
    const catId = document.getElementById('prodCategory').value;

    if (!name || !desc || !price || !img || !catId) {
        showMessage('Zəhmət olmasa bütün sahələri doldurun!', true);
        return;
    }

    const prodData = {
        name,
        description: desc,
        price,
        imageUrl: img,
        categoryId: catId
    };

    try {
        if (editId) {
            // Redaktə
            await firebase.firestore().collection('products').doc(editId).update(prodData);
            showMessage('Tort məlumatları yeniləndi!');
        } else {
            // Yeni əlavə
            await firebase.firestore().collection('products').add(prodData);
            showMessage('Yeni tort uğurla əlavə edildi!');
        }
        cancelEdit();
        loadProducts();
    } catch (err) {
        console.error(err);
        showMessage(err.message, true);
    }
}

// Redaktə rejiminə keçid
window.startEditProduct = function(id) {
    const prod = allProducts.find(p => p.id === id);
    if (!prod) return;

    document.getElementById('formTitle').textContent = 'Tortu Redaktə Et';
    document.getElementById('editProductId').value = prod.id;
    document.getElementById('prodName').value = prod.name;
    document.getElementById('prodDesc').value = prod.description;
    document.getElementById('prodPrice').value = prod.price;
    document.getElementById('prodImg').value = prod.imageUrl;
    document.getElementById('prodCategory').value = prod.categoryId;

    document.getElementById('saveProductBtn').textContent = 'Yenilə';
    document.getElementById('cancelEditBtn').style.display = 'inline-block';

    window.scrollTo({ top: document.getElementById('productSection').offsetTop - 20, behavior: 'smooth' });
};

// Redaktəni ləğv et
function cancelEdit() {
    document.getElementById('formTitle').textContent = 'Yeni Tort Əlavə Et';
    document.getElementById('editProductId').value = '';
    document.getElementById('prodName').value = '';
    document.getElementById('prodDesc').value = '';
    document.getElementById('prodPrice').value = '';
    document.getElementById('prodImg').value = '';
    document.getElementById('prodCategory').value = '';

    document.getElementById('saveProductBtn').textContent = 'Tortu Yadda Saxla';
    document.getElementById('cancelEditBtn').style.display = 'none';
}

// Tortu sil
window.deleteProduct = async function(id) {
    if (!confirm('Bu tortu silmək istədiyinizdən əminsiniz?')) return;
    try {
        await firebase.firestore().collection('products').doc(id).delete();
        showMessage('Tort silindi!');
        loadProducts();
    } catch (err) {
        console.error(err);
        showMessage(err.message, true);
    }
};

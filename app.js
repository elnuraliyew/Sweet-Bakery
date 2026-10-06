// app.js - Sweet Bakery Əsas Müştəri Məntiqi (İctimai Açıq Vitrin)

let currentCategory = 'all';
let productsList = [];
let categoriesList = [];

// İlkin Başlanğıc
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  await loadCategories();
  await loadProducts();
}

// 1. Kateqoriyaları yüklə və dinamik filtrləri qur
async function loadCategories() {
  const container = document.getElementById('categoryContainer');
  if (!container) return;

  try {
    const snapshot = await db.collection('categories').get();
    
    // Əgər bazada hələ heç bir kateqoriya yoxdursa, ilkin nümunələr göstər
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

    // HTML filtr düymələrini yarat
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

    // "Bütün Tortlar" düyməsinin dinləyicisi
    container.querySelector('[data-category="all"]').addEventListener('click', function() {
      filterByCategory('all', this);
    });

  } catch (error) {
    console.warn('Firebase kateqoriya xətası (nümunə data istifadə edilir):', error);
  }
}

// 2. Məhsulları (Tortları) Yüklə
async function loadProducts() {
  const grid = document.getElementById('productContainer');
  if (!grid) return;

  try {
    const snapshot = await db.collection('products').get();

    if (snapshot.empty) {
      // Əgər admin hələ tort əlavə etməyibsə, saytın lüks vizual görünməsi üçün nümunə tortlar göstəririk
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
    console.error('Məhsul yüklənməsində xəta:', error);
    grid.innerHTML = `
      <div class="empty-state">
        <p>Məhsullar yüklənərkən xəta baş verdi. Zəhmət olmasa bir az sonra yenidən cəhd edin.</p>
      </div>
    `;
  }
}

// 3. Kateqoriya üzrə filtrlə
function filterByCategory(categoryId, clickedBtn) {
  currentCategory = categoryId;

  // Aktiv sinfi dəyiş
  document.querySelectorAll('.category-pill').forEach(btn => btn.classList.remove('active'));
  if (clickedBtn) clickedBtn.classList.add('active');

  renderProducts();
}

// 4. Məhsul kartlarını ekrana ver
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
    
    // WhatsApp sifariş mesajı mətni
    const orderText = encodeURIComponent(`Salam Sweet Bakery! Mən bu tortu sifariş vermək istəyirəm: "${prod.name}" (Qiymət: ${prod.price} AZN). Ətraflı məlumat ala bilərəm?`);
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

    // Yumşaq animasiya ilə açılış
    setTimeout(() => {
      card.classList.add('loaded');
    }, index * 70);
  });
}

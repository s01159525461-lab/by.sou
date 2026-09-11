// by-sou — تفاعلات الموقع الرئيسي (بيقرأ المنتجات من السيرفر مباشرة)

const API_URL = '/api/products';

document.addEventListener('DOMContentLoaded', () => {
    renderStoreProducts();

    const productsContainer = document.querySelector('.products');
    if (!productsContainer) return;

    productsContainer.addEventListener('click', (e) => {
        const heartBtn = e.target.closest('.heart');
        if (heartBtn) {
            const active = heartBtn.classList.toggle('active');
            heartBtn.textContent = active ? '♥' : '♡';
            heartBtn.style.color = active ? '#e83e8c' : '';
            return;
        }

        const cartBtn = e.target.closest('.cart-btn');
        if (cartBtn) {
            const originalText = cartBtn.dataset.originalText || cartBtn.textContent;
            cartBtn.dataset.originalText = originalText;
            cartBtn.textContent = 'تمت الإضافة ✓';
            cartBtn.disabled = true;

            setTimeout(() => {
                cartBtn.textContent = originalText;
                cartBtn.disabled = false;
            }, 1200);
        }
    });
});

async function renderStoreProducts() {
    const container = document.querySelector('.products');
    if (!container) return;

    container.innerHTML = '<p class="no-products">جاري تحميل المنتجات...</p>';

    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error('server-error');
        const products = await res.json();

        if (!products.length) {
            container.innerHTML = '<p class="no-products">لا توجد منتجات حالياً، تابعينا قريباً 🌸</p>';
            return;
        }

        container.innerHTML = products.map(renderProductCard).join('');
    } catch (err) {
        console.error(err);
        container.innerHTML = '<p class="no-products">تعذّر تحميل المنتجات، تأكدي إن السيرفر شغال وحدّثي الصفحة.</p>';
    }
}

function renderProductCard(product) {
    const rating = Math.max(0, Math.min(5, Number(product.rating) || 0));
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);

    const imageMarkup = product.imageType === 'photo'
        ? `<img src="${product.image}" alt="${escapeHTML(product.name)}">`
        : escapeHTML(product.image || '🛍️');

    const oldPriceMarkup = product.oldPrice
        ? `<del>${escapeHTML(product.oldPrice)} جنيه</del>`
        : '';

    return `
        <div class="product" data-id="${product.id}">
            <div class="product-image">
                ${imageMarkup}
                <button class="heart" aria-label="إضافة للمفضلة">♡</button>
            </div>
            <div class="product-info">
                <h3>${escapeHTML(product.name)}</h3>
                <div class="rating">${stars}</div>
                <div class="price">
                    ${escapeHTML(product.price)} جنيه
                    ${oldPriceMarkup}
                </div>
                <button class="cart-btn">إضافة إلى السلة 🛍️</button>
            </div>
        </div>`;
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}

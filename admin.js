// by-sou — لوحة التحكم: إضافة وتعديل وحذف المنتجات عن طريق API السيرفر

const API_URL = '/api/products';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('product-form');
    const nameInput = document.getElementById('p-name');
    const priceInput = document.getElementById('p-price');
    const oldPriceInput = document.getElementById('p-old-price');
    const ratingButtons = document.querySelectorAll('#star-select button');
    const ratingValueInput = document.getElementById('p-rating');
    const emojiField = document.getElementById('emoji-field');
    const photoField = document.getElementById('photo-field');
    const emojiInput = document.getElementById('p-emoji');
    const photoInput = document.getElementById('p-photo');
    const photoPreview = document.getElementById('photo-preview');
    const typeEmojiRadio = document.getElementById('type-emoji');
    const typePhotoRadio = document.getElementById('type-photo');
    const submitBtn = document.getElementById('submit-btn');
    const cancelBtn = document.getElementById('cancel-edit');
    const formTitle = document.getElementById('form-title');
    const listEl = document.getElementById('admin-product-list');
    const countEl = document.getElementById('product-count');
    const emptyState = document.getElementById('empty-state');

    let editingId = null;
    let editingProduct = null;
    let selectedPhotoFile = null;
    let productsCache = [];

    function setRating(value) {
        ratingValueInput.value = value;
        ratingButtons.forEach((btn, i) => {
            const filled = i < value;
            btn.classList.toggle('active', filled);
            btn.textContent = filled ? '★' : '☆';
        });
    }

    ratingButtons.forEach((btn, i) => {
        btn.addEventListener('click', () => setRating(i + 1));
    });

    function toggleImageFields() {
        const isPhoto = typePhotoRadio.checked;
        emojiField.hidden = isPhoto;
        photoField.hidden = !isPhoto;
    }

    typeEmojiRadio.addEventListener('change', toggleImageFields);
    typePhotoRadio.addEventListener('change', toggleImageFields);

    photoInput.addEventListener('change', () => {
        const file = photoInput.files[0];
        if (!file) return;

        selectedPhotoFile = file;
        const reader = new FileReader();
        reader.onload = () => {
            photoPreview.src = reader.result;
            photoPreview.hidden = false;
        };
        reader.readAsDataURL(file);
    });

    function resetForm() {
        form.reset();
        setRating(5);
        editingId = null;
        editingProduct = null;
        selectedPhotoFile = null;
        photoPreview.hidden = true;
        photoPreview.removeAttribute('src');
        typeEmojiRadio.checked = true;
        emojiInput.value = '💄';
        toggleImageFields();
        submitBtn.disabled = false;
        submitBtn.textContent = 'إضافة المنتج';
        formTitle.textContent = 'إضافة منتج جديد';
        cancelBtn.hidden = true;
    }

    function productRowHTML(p) {
        const rating = Math.max(0, Math.min(5, Number(p.rating) || 0));
        const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);

        const thumb = p.imageType === 'photo'
            ? `<img src="${p.image}" alt="${escapeHTML(p.name)}">`
            : escapeHTML(p.image || '🛍️');

        const oldPriceHTML = p.oldPrice
            ? `<del>${escapeHTML(p.oldPrice)} جنيه</del>`
            : '';

        return `
            <div class="admin-product" data-id="${p.id}">
                <div class="admin-product-thumb">${thumb}</div>
                <div class="admin-product-info">
                    <h4>${escapeHTML(p.name)}</h4>
                    <div class="admin-product-meta">
                        <span class="admin-rating">${stars}</span>
                        <span class="admin-price">${escapeHTML(p.price)} جنيه ${oldPriceHTML}</span>
                    </div>
                </div>
                <div class="admin-product-actions">
                    <button type="button" class="icon-btn edit-btn" title="تعديل">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button type="button" class="icon-btn delete-btn" title="حذف">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>`;
    }

    async function renderList() {
        try {
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error('تعذّر تحميل المنتجات');
            productsCache = await res.json();

            countEl.textContent = productsCache.length;
            emptyState.hidden = productsCache.length > 0;
            listEl.hidden = productsCache.length === 0;
            listEl.innerHTML = productsCache.map(productRowHTML).join('');
        } catch (err) {
            console.error(err);
            listEl.innerHTML = '';
            listEl.hidden = true;
            emptyState.hidden = false;
            emptyState.textContent = 'تعذّر الاتصال بالسيرفر، تأكدي إنه شغال (npm start).';
        }
    }

    listEl.addEventListener('click', async (e) => {
        const card = e.target.closest('.admin-product');
        if (!card) return;

        const id = card.dataset.id;
        const product = productsCache.find((p) => String(p.id) === String(id));
        if (!product) return;

        if (e.target.closest('.delete-btn')) {
            if (!confirm(`هل تريدين حذف "${product.name}"؟`)) return;

            try {
                const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
                if (!res.ok && res.status !== 204) throw new Error('فشل الحذف');
                await renderList();
                if (editingId === String(id)) resetForm();
            } catch (err) {
                alert('حصل خطأ أثناء الحذف');
            }
            return;
        }

        if (e.target.closest('.edit-btn')) {
            editingId = String(id);
            editingProduct = product;

            nameInput.value = product.name;
            priceInput.value = product.price;
            oldPriceInput.value = product.oldPrice || '';
            setRating(product.rating);

            selectedPhotoFile = null;
            if (product.imageType === 'photo') {
                typePhotoRadio.checked = true;
                photoPreview.src = product.image;
                photoPreview.hidden = false;
            } else {
                typeEmojiRadio.checked = true;
                emojiInput.value = product.image;
            }
            toggleImageFields();

            submitBtn.textContent = 'حفظ التعديلات';
            formTitle.textContent = 'تعديل المنتج';
            cancelBtn.hidden = false;
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    cancelBtn.addEventListener('click', resetForm);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = nameInput.value.trim();
        const price = Number(priceInput.value);
        const oldPriceRaw = oldPriceInput.value.trim();
        const isPhoto = typePhotoRadio.checked;

        if (!name) {
            alert('من فضلك اكتبي اسم المنتج');
            return;
        }
        if (!price || price <= 0) {
            alert('من فضلك أدخلي سعر صحيح');
            return;
        }
        const alreadyHasPhoto = editingProduct && editingProduct.imageType === 'photo';
        if (isPhoto && !selectedPhotoFile && !alreadyHasPhoto) {
            alert('من فضلك ارفعي صورة للمنتج');
            return;
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('price', price);
        formData.append('oldPrice', oldPriceRaw);
        formData.append('rating', ratingValueInput.value);
        formData.append('imageType', isPhoto ? 'photo' : 'emoji');
        if (!isPhoto) formData.append('emoji', emojiInput.value.trim() || '🛍️');
        if (isPhoto && selectedPhotoFile) formData.append('photo', selectedPhotoFile);

        const wasEditing = Boolean(editingId);
        submitBtn.disabled = true;
        submitBtn.textContent = wasEditing ? 'جاري الحفظ...' : 'جاري الإضافة...';

        try {
            const url = wasEditing ? `${API_URL}/${editingId}` : API_URL;
            const method = wasEditing ? 'PUT' : 'POST';
            const res = await fetch(url, { method, body: formData });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'حصل خطأ أثناء الحفظ');
            }

            await renderList();
            resetForm();
        } catch (err) {
            alert(err.message || 'حصل خطأ أثناء الحفظ');
            submitBtn.disabled = false;
            submitBtn.textContent = wasEditing ? 'حفظ التعديلات' : 'إضافة المنتج';
        }
    });

    setRating(5);
    toggleImageFields();
    renderList();
});

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}

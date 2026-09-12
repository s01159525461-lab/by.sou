// by-sou — سيرفر Node.js (Express + ملف JSON كقاعدة بيانات بسيطة)
// بيشغّل الموقع وكمان API حقيقي للمنتجات بيتخزن في ملف على السيرفر
// (بالتالي أي زائر هيشوف نفس المنتجات، مش زي localStorage اللي بيفرق من متصفح لتاني)
// ملحوظة: مفيش هنا أي مكتبة محتاجة تجميع (compilation)، عشان تشتغل على أي جهاز
// من غير الحاجة لتثبيت أدوات بناء زي Visual Studio Build Tools.

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- قاعدة البيانات (ملف JSON) ----------
const dbDir = path.join(__dirname, 'db');
const dbFile = path.join(dbDir, 'products.json');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const DEFAULT_PRODUCTS = [
    { id: 'p1', name: 'Velvet Rose Lipstick', price: 320, oldPrice: 400, rating: 5, image: '💄', imageType: 'emoji' },
    { id: 'p2', name: 'Pink Dream Blush', price: 280, oldPrice: 350, rating: 5, image: '🌸', imageType: 'emoji' },
    { id: 'p3', name: 'Glow Eyeshadow Palette', price: 450, oldPrice: 550, rating: 5, image: '🎨', imageType: 'emoji' },
    { id: 'p4', name: 'Long Lash Mascara', price: 240, oldPrice: 290, rating: 5, image: '🖤', imageType: 'emoji' },
];

function readProducts() {
    if (!fs.existsSync(dbFile)) {
        writeProducts(DEFAULT_PRODUCTS);
        return DEFAULT_PRODUCTS.slice();
    }
    try {
        const raw = fs.readFileSync(dbFile, 'utf-8');
        return JSON.parse(raw);
    } catch (err) {
        console.error('تعذّرت قراءة قاعدة البيانات، هيتم البدء بقائمة فاضية', err);
        return [];
    }
}

function writeProducts(products) {
    fs.writeFileSync(dbFile, JSON.stringify(products, null, 2), 'utf-8');
}

function generateId() {
    return 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1000);
}

// ---------- رفع الصور ----------
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
        const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
        cb(null, `product-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('الملف المرفوع لازم يكون صورة'));
        }
        cb(null, true);
    },
});

// ---------- الميدل وير العام ----------
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));
// app.use(express.static(path.join(__dirname, 'public')));
// حماية صفحة الأدمن بكلمة سر
app.use('/admin.html', (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
        return res.status(401).send('يلزم تسجيل الدخول لدخول لوحة التحكم');
    }

    const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const user = auth[0];
    const pass = auth[1];

    if (user === 'admin' && pass === 'admin123') { // تقدر تغير كلمة السر هنا
        next();
    } else {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
        return res.status(401).send('بيانات الدخول غير صحيحة');
    }
});

// الملفات العامة للموقع
app.use(express.static(path.join(__dirname, 'public')));

function deleteUploadedFileIfAny(imageType, image) {
    if (imageType === 'photo' && typeof image === 'string' && image.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, image);
        fs.unlink(filePath, () => {});
    }
}

// ---------- API المنتجات ----------

// كل المنتجات (الأحدث الأول)
app.get('/api/products', (req, res) => {
    const products = readProducts();
    res.json(products.slice().reverse());
});

// إضافة منتج جديد
app.post('/api/products', upload.single('photo'), (req, res) => {
    try {
        const { name, price, oldPrice, rating, imageType, emoji } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'اسم المنتج مطلوب' });
        }
        const numericPrice = Number(price);
        if (!numericPrice || numericPrice <= 0) {
            return res.status(400).json({ error: 'السعر لازم يكون رقم أكبر من صفر' });
        }

        let image;
        let finalImageType;

        if (imageType === 'photo') {
            if (!req.file) {
                return res.status(400).json({ error: 'من فضلك ارفعي صورة للمنتج' });
            }
            image = `/uploads/${req.file.filename}`;
            finalImageType = 'photo';
        } else {
            image = emoji && emoji.trim() ? emoji.trim() : '🛍️';
            finalImageType = 'emoji';
        }

        const products = readProducts();
        const newProduct = {
            id: generateId(),
            name: name.trim(),
            price: numericPrice,
            oldPrice: oldPrice ? Number(oldPrice) : null,
            rating: Number(rating) || 5,
            image,
            imageType: finalImageType,
        };

        products.push(newProduct);
        writeProducts(products);
        res.status(201).json(newProduct);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'حصل خطأ في السيرفر أثناء إضافة المنتج' });
    }
});

// تعديل منتج موجود
app.put('/api/products/:id', upload.single('photo'), (req, res) => {
    try {
        const { id } = req.params;
        const products = readProducts();
        const idx = products.findIndex((p) => String(p.id) === String(id));
        if (idx === -1) {
            return res.status(404).json({ error: 'المنتج مش موجود' });
        }

        const existing = products[idx];
        const { name, price, oldPrice, rating, imageType, emoji } = req.body;

        let image = existing.image;
        let finalImageType = existing.imageType;

        if (imageType === 'photo') {
            if (req.file) {
                deleteUploadedFileIfAny(existing.imageType, existing.image);
                image = `/uploads/${req.file.filename}`;
            }
            finalImageType = 'photo';
        } else if (imageType === 'emoji') {
            deleteUploadedFileIfAny(existing.imageType, existing.image);
            image = emoji && emoji.trim() ? emoji.trim() : '🛍️';
            finalImageType = 'emoji';
        }

        products[idx] = {
            ...existing,
            name: name && name.trim() ? name.trim() : existing.name,
            price: price ? Number(price) : existing.price,
            oldPrice: oldPrice ? Number(oldPrice) : null,
            rating: rating ? Number(rating) : existing.rating,
            image,
            imageType: finalImageType,
        };

        writeProducts(products);
        res.json(products[idx]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'حصل خطأ في السيرفر أثناء تعديل المنتج' });
    }
});

// حذف منتج
app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const products = readProducts();
    const idx = products.findIndex((p) => String(p.id) === String(id));
    if (idx === -1) {
        return res.status(404).json({ error: 'المنتج مش موجود' });
    }

    deleteUploadedFileIfAny(products[idx].imageType, products[idx].image);
    products.splice(idx, 1);
    writeProducts(products);
    res.status(204).send();
});

// أي خطأ من multer (زي حجم الصورة الكبير) يترجع كرسالة مفهومة
app.use((err, req, res, next) => {
    if (err) {
        return res.status(400).json({ error: err.message || 'حصل خطأ غير متوقع' });
    }
    next();
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`سيرفر شغال محلياً على port ${PORT}`));
}

module.exports = app;
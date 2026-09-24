const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const AuditLog = require('../models/AuditLog');
const Lead = require('../models/Lead');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Project = require('../models/Project');
const RefreshSession = require('../models/RefreshSession');
const Service = require('../models/Service');
const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');

const router = express.Router();
const phonePattern = /^(?:\+84|0)[0-9]{9,10}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const staffRoles = new Set(['staff', 'admin']);
const userRoles = new Set(['customer', 'staff', 'admin']);
const userStatuses = new Set(['active', 'blocked']);
const imageDirectory = path.join(__dirname, '..', '..', 'storage', 'content-images');
const imageExtensions = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
fs.mkdirSync(imageDirectory, { recursive: true });
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, imageDirectory),
    filename: (_req, file, callback) => callback(null, `${crypto.randomUUID()}${imageExtensions[file.mimetype]}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => imageExtensions[file.mimetype] ? callback(null, true) : callback(Object.assign(new Error('Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP'), { status: 400 }))
});
const validId = value => mongoose.isValidObjectId(value);
const clean = (value, max = 5000) => String(value ?? '').trim().slice(0, max);
const normalizePhone = value => clean(value, 20).replace(/[\s.-]/g, '');
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const pageValues = query => ({ page: Math.max(1, Number(query.page) || 1), limit: Math.min(50, Math.max(1, Number(query.limit) || 20)) });
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const slugify = value => clean(value, 200).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const publicUser = user => ({ _id: user._id, name: user.name, email: user.email, phone: user.phone || '', role: user.role, permissions: user.permissions || [], status: user.status, lastLoginAt: user.lastLoginAt, createdAt: user.createdAt });

async function hasValidImageSignature(file) {
  const handle = await fs.promises.open(file.path, 'r');
  try {
    const buffer = Buffer.alloc(12); const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (file.mimetype === 'image/jpeg') return bytesRead >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (file.mimetype === 'image/png') return bytesRead >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (file.mimetype === 'image/webp') return bytesRead >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
    return false;
  } finally { await handle.close(); }
}

async function audit(req, action, entity, entityId, summary, metadata = {}) {
  await AuditLog.create({ actor: req.user._id, action, entity, entityId, summary, metadata });
}

function listFilter(query, searchable, extra = {}) {
  const filter = { ...extra };
  const q = clean(query.q, 100);
  if (q) {
    const pattern = { $regex: escapeRegex(q), $options: 'i' };
    filter.$or = searchable.map(field => ({ [field]: pattern }));
  }
  return filter;
}

router.get('/dashboard', async (req, res, next) => {
  try {
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const [customers, staff, blockedUsers, products, lowStock, services, projects, openLeads, openRequests, openOrders, pendingOrders, revenue, monthlyRevenue, recentOrders, recentActivity] = await Promise.all([
      User.countDocuments({ role: 'customer' }), User.countDocuments({ role: 'staff', status: 'active' }), User.countDocuments({ status: 'blocked' }),
      Product.countDocuments({ active: true }), Product.countDocuments({ active: true, priceOnRequest: false, stock: { $lte: 5 } }), Service.countDocuments({ published: true }), Project.countDocuments({ published: true }),
      Lead.countDocuments({ status: { $nin: ['won', 'lost', 'spam'] } }), ServiceRequest.countDocuments({ status: { $nin: ['accepted', 'rejected', 'cancelled'] } }), Order.countDocuments({ status: { $nin: ['delivered', 'cancelled'] } }), Order.countDocuments({ status: 'pending' }),
      Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, value: { $sum: '$total' } } }]),
      Order.aggregate([{ $match: { paymentStatus: 'paid', paidAt: { $gte: monthStart } } }, { $group: { _id: null, value: { $sum: '$total' } } }]),
      Order.find().select('code total status paymentStatus createdAt').populate('customer', 'name').sort({ createdAt: -1 }).limit(6).lean(),
      AuditLog.find().populate('actor', 'name email').sort({ createdAt: -1 }).limit(8).lean()
    ]);
    res.json({ success: true, data: { customers, staff, blockedUsers, products, lowStock, services, projects, openLeads, openRequests, openOrders, pendingOrders, revenue: revenue[0]?.value || 0, monthlyRevenue: monthlyRevenue[0]?.value || 0, recentOrders, recentActivity } });
  } catch (error) { next(error); }
});

router.get('/users', async (req, res, next) => {
  try {
    const { page, limit } = pageValues(req.query);
    const filter = listFilter(req.query, ['name', 'email', 'phone']);
    if (userRoles.has(req.query.role)) filter.role = req.query.role;
    if (userStatuses.has(req.query.status)) filter.status = req.query.status;
    const [items, total] = await Promise.all([User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), User.countDocuments(filter)]);
    res.json({ success: true, data: { items: items.map(publicUser), total, page, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

router.post('/users', async (req, res, next) => {
  try {
    const name = clean(req.body.name, 100); const email = clean(req.body.email, 200).toLowerCase(); const phone = normalizePhone(req.body.phone); const password = String(req.body.password || '');
    const role = staffRoles.has(req.body.role) ? req.body.role : 'staff';
    if (name.length < 2 || !emailPattern.test(email) || !phonePattern.test(phone)) fail('Họ tên, email hoặc số điện thoại không hợp lệ');
    if (password.length < 8 || password.length > 128) fail('Mật khẩu tạm thời phải có từ 8 đến 128 ký tự');
    const user = await User.create({ name, email, phone, role, permissions: [], passwordHash: await User.hashPassword(password), status: 'active' });
    await audit(req, 'user.created', 'user', user._id, `Đã tạo tài khoản ${role}: ${user.name}`);
    res.status(201).json({ success: true, message: 'Đã tạo tài khoản nhân sự', data: publicUser(user) });
  } catch (error) { next(error); }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) fail('Tài khoản không hợp lệ', 404);
    const user = await User.findById(req.params.id).select('+tokenVersion');
    if (!user) fail('Không tìm thấy tài khoản', 404);
    const isSelf = String(user._id) === String(req.user._id);
    const nextRole = req.body.role === undefined ? user.role : req.body.role;
    const nextStatus = req.body.status === undefined ? user.status : req.body.status;
    if (!userRoles.has(nextRole) || !userStatuses.has(nextStatus)) fail('Vai trò hoặc trạng thái không hợp lệ');
    if (isSelf && (nextRole !== user.role || nextStatus !== user.status)) fail('Không thể tự thay đổi vai trò hoặc khóa chính tài khoản đang đăng nhập', 409);
    if (user.role === 'admin' && (nextRole !== 'admin' || nextStatus !== 'active')) {
      const activeAdmins = await User.countDocuments({ role: 'admin', status: 'active' });
      if (activeAdmins <= 1) fail('Hệ thống phải luôn còn ít nhất một Admin đang hoạt động', 409);
    }
    const before = { role: user.role, status: user.status };
    if (req.body.name !== undefined) { const name = clean(req.body.name, 100); if (name.length < 2) fail('Họ tên không hợp lệ'); user.name = name; }
    if (req.body.email !== undefined) { const email = clean(req.body.email, 200).toLowerCase(); if (!emailPattern.test(email)) fail('Email không hợp lệ'); user.email = email; }
    if (req.body.phone !== undefined) { const phone = normalizePhone(req.body.phone); if (!phonePattern.test(phone)) fail('Số điện thoại không hợp lệ'); user.phone = phone; }
    user.role = nextRole; user.status = nextStatus;
    const securityChanged = before.role !== user.role || before.status !== user.status;
    if (securityChanged) user.tokenVersion += 1;
    await user.save();
    if (securityChanged) await RefreshSession.deleteMany({ user: user._id });
    await audit(req, 'user.updated', 'user', user._id, `Đã cập nhật tài khoản ${user.name}`, { before, after: { role: user.role, status: user.status } });
    res.json({ success: true, message: 'Đã cập nhật tài khoản', data: publicUser(user) });
  } catch (error) { next(error); }
});

router.post('/users/:id/reset-password', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) fail('Tài khoản không hợp lệ', 404);
    const password = String(req.body.password || '');
    if (password.length < 8 || password.length > 128) fail('Mật khẩu mới phải có từ 8 đến 128 ký tự');
    const user = await User.findById(req.params.id).select('+passwordHash +tokenVersion');
    if (!user) fail('Không tìm thấy tài khoản', 404);
    user.passwordHash = await User.hashPassword(password); user.tokenVersion += 1; await user.save();
    await RefreshSession.deleteMany({ user: user._id });
    await audit(req, 'user.password_reset', 'user', user._id, `Đã đặt lại mật khẩu cho ${user.name}`);
    res.json({ success: true, message: 'Đã đặt lại mật khẩu và đăng xuất các phiên cũ' });
  } catch (error) { next(error); }
});

router.post('/uploads/images', imageUpload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) fail('Vui lòng chọn một ảnh để tải lên');
    if (!await hasValidImageSignature(req.file)) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      fail('Nội dung tệp không phải ảnh hợp lệ');
    }
    const url = `${req.protocol}://${req.get('host')}/uploads/content/${req.file.filename}`;
    res.status(201).json({ success: true, message: 'Đã tải ảnh lên', data: { url, filename: req.file.filename } });
  } catch (error) { next(error); }
});

function contentValues(kind, body, current = {}) {
  const name = clean(body.name ?? body.title ?? current.name ?? current.title, 200);
  const values = { ...current, ...body, slug: slugify(body.slug || name || current.slug) };
  delete values._id; delete values.createdAt; delete values.updatedAt; delete values.__v;
  if (!name || !values.slug) fail('Tên và đường dẫn nội dung không hợp lệ');
  if (kind === 'product') {
    const allowed = ['name', 'slug', 'sku', 'category', 'description', 'specifications', 'price', 'unit', 'stock', 'priceOnRequest', 'image', 'images', 'featured', 'active'];
    const result = Object.fromEntries(allowed.filter(key => values[key] !== undefined).map(key => [key, values[key]]));
    result.name = name; result.category = clean(result.category, 150); result.sku = clean(result.sku, 100) || undefined; result.unit = clean(result.unit, 50) || 'sản phẩm';
    if (!result.category) fail('Danh mục sản phẩm là bắt buộc');
    if (result.priceOnRequest) result.price = null; else { result.price = Number(result.price); if (!Number.isFinite(result.price) || result.price < 0) fail('Giá sản phẩm không hợp lệ'); }
    result.stock = Number(result.stock || 0); if (!Number.isInteger(result.stock) || result.stock < 0) fail('Tồn kho không hợp lệ');
    return result;
  }
  if (kind === 'service') {
    const allowed = ['name', 'slug', 'summary', 'description', 'capabilities', 'materials', 'applications', 'image', 'order', 'featured', 'published'];
    const result = Object.fromEntries(allowed.filter(key => values[key] !== undefined).map(key => [key, values[key]])); result.name = name; result.summary = clean(result.summary, 500);
    if (!result.summary) fail('Mô tả ngắn dịch vụ là bắt buộc'); return result;
  }
  const allowed = ['title', 'slug', 'category', 'client', 'location', 'year', 'description', 'challenge', 'solution', 'image', 'gallery', 'featured', 'published'];
  const result = Object.fromEntries(allowed.filter(key => values[key] !== undefined).map(key => [key, values[key]])); result.title = name; result.category = clean(result.category, 150);
  if (!result.category) fail('Danh mục dự án là bắt buộc'); return result;
}

for (const [path, kind, Model, activeField, searchable] of [
  ['products', 'product', Product, 'active', ['name', 'sku', 'category']],
  ['services', 'service', Service, 'published', ['name', 'summary']],
  ['projects', 'project', Project, 'published', ['title', 'client', 'category']]
]) {
  router.get(`/${path}`, async (req, res, next) => { try { const { page, limit } = pageValues(req.query); const filter = listFilter(req.query, searchable); if (req.query.state === 'published') filter[activeField] = true; if (req.query.state === 'hidden') filter[activeField] = false; const [items, total] = await Promise.all([Model.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), Model.countDocuments(filter)]); res.json({ success: true, data: { items, total, page, pages: Math.ceil(total / limit) } }); } catch (error) { next(error); } });
  router.post(`/${path}`, async (req, res, next) => { try { const data = await Model.create(contentValues(kind, req.body)); await audit(req, `${kind}.created`, kind, data._id, `Đã tạo ${kind}: ${data.name || data.title}`); res.status(201).json({ success: true, message: 'Đã tạo nội dung', data }); } catch (error) { next(error); } });
  router.patch(`/${path}/:id`, async (req, res, next) => { try { if (!validId(req.params.id)) fail('Nội dung không hợp lệ', 404); const current = await Model.findById(req.params.id).lean(); if (!current) fail('Không tìm thấy nội dung', 404); const data = await Model.findByIdAndUpdate(req.params.id, contentValues(kind, req.body, current), { new: true, runValidators: true }); await audit(req, `${kind}.updated`, kind, data._id, `Đã cập nhật ${kind}: ${data.name || data.title}`); res.json({ success: true, message: 'Đã cập nhật nội dung', data }); } catch (error) { next(error); } });
  router.delete(`/${path}/:id`, async (req, res, next) => { try { if (!validId(req.params.id)) fail('Nội dung không hợp lệ', 404); const data = await Model.findByIdAndUpdate(req.params.id, { [activeField]: false }, { new: true }); if (!data) fail('Không tìm thấy nội dung', 404); await audit(req, `${kind}.hidden`, kind, data._id, `Đã ẩn ${kind}: ${data.name || data.title}`); res.json({ success: true, message: 'Đã ẩn nội dung thay vì xóa vĩnh viễn', data }); } catch (error) { next(error); } });
}

router.get('/audit-logs', async (req, res, next) => {
  try { const { page, limit } = pageValues(req.query); const filter = {}; if (req.query.entity && ['user', 'product', 'service', 'project'].includes(req.query.entity)) filter.entity = req.query.entity; const [items, total] = await Promise.all([AuditLog.find(filter).populate('actor', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), AuditLog.countDocuments(filter)]); res.json({ success: true, data: { items, total, page, pages: Math.ceil(total / limit) } }); } catch (error) { next(error); }
});

module.exports = router;

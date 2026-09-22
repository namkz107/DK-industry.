const User = require('../models/User');
const RefreshSession = require('../models/RefreshSession');

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function bootstrapAdmin({ required = false } = {}) {
  const email = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD;
  const configured = email && password && !password.startsWith('replace_with_');

  if (!configured) {
    if (required) throw new Error('Hãy cấu hình ADMIN_SEED_EMAIL và ADMIN_SEED_PASSWORD trong backend/.env');
    return 'skipped (configure ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD)';
  }
  if (!emailPattern.test(email)) throw new Error('ADMIN_SEED_EMAIL không hợp lệ');
  if (!passwordPattern.test(password)) throw new Error('ADMIN_SEED_PASSWORD phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số');

  const phone = String(process.env.ADMIN_SEED_PHONE || '').replace(/[\s.-]/g, '');
  const existing = await User.findOne({ email }).select('+passwordHash +tokenVersion');
  const values = {
    name: process.env.ADMIN_SEED_NAME || 'Quản trị Đăng Khoa',
    email,
    passwordHash: await User.hashPassword(password),
    role: 'admin',
    permissions: [],
    status: 'active'
  };
  if (phone) values.phone = phone;

  if (existing) {
    Object.assign(existing, values);
    existing.tokenVersion = (existing.tokenVersion || 0) + 1;
    await existing.save();
    await RefreshSession.updateMany({ user: existing._id, revokedAt: null }, { revokedAt: new Date() });
  } else {
    await User.create(values);
  }
  return `ready (${email})`;
}

module.exports = bootstrapAdmin;

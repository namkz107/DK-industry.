const express = require('express');
const User = require('../models/User');
const RefreshSession = require('../models/RefreshSession');
const { authenticate } = require('../middleware/authenticate');
const { createAccessToken, createSession, hashToken, newRefreshToken, refreshExpiry, publicUser, cookieOptions, cookieBaseOptions } = require('../services/authService');

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^(?:\+84|0)[0-9]{9,10}$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;
const normalizePhone = value => String(value || '').replace(/[\s.-]/g, '');

function validatePassword(password) {
  return passwordPattern.test(String(password || ''));
}

router.post('/register', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const phone = normalizePhone(req.body.phone);
    const password = String(req.body.password || '');
    if (name.length < 2 || name.length > 100) return res.status(400).json({ success: false, message: 'Họ tên phải có từ 2 đến 100 ký tự' });
    if (!emailPattern.test(email)) return res.status(400).json({ success: false, message: 'Email không hợp lệ' });
    if (!phonePattern.test(phone)) return res.status(400).json({ success: false, message: 'Số điện thoại Việt Nam không hợp lệ' });
    if (!validatePassword(password)) return res.status(400).json({ success: false, message: 'Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số' });
    const exists = await User.exists({ $or: [{ email }, { phone }] });
    if (exists) return res.status(409).json({ success: false, message: 'Email hoặc số điện thoại đã được sử dụng' });

    const user = await User.create({ name, email, phone, passwordHash: await User.hashPassword(password), role: 'customer' });
    const tokens = await createSession(user, req);
    res.cookie('dk_refresh', tokens.refreshToken, cookieOptions);
    res.status(201).json({ success: true, data: { user: publicUser(user), accessToken: tokens.accessToken } });
  } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
  try {
    const identifier = String(req.body.identifier || '').trim();
    const password = String(req.body.password || '');
    const query = identifier.includes('@') ? { email: identifier.toLowerCase() } : { phone: normalizePhone(identifier) };
    const user = await User.findOne(query).select('+passwordHash +tokenVersion');
    if (!user || !(await user.verifyPassword(password))) return res.status(401).json({ success: false, message: 'Email, số điện thoại hoặc mật khẩu không đúng' });
    if (user.status !== 'active') return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.' });

    user.lastLoginAt = new Date();
    await user.save();
    const tokens = await createSession(user, req);
    res.cookie('dk_refresh', tokens.refreshToken, cookieOptions);
    res.json({ success: true, data: { user: publicUser(user), accessToken: tokens.accessToken } });
  } catch (error) { next(error); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const currentToken = req.cookies.dk_refresh;
    if (!currentToken) return res.status(401).json({ success: false, message: 'Không tìm thấy phiên đăng nhập' });
    const session = await RefreshSession.findOne({ tokenHash: hashToken(currentToken), revokedAt: null, expiresAt: { $gt: new Date() } });
    if (!session) { res.clearCookie('dk_refresh', cookieBaseOptions); return res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hạn' }); }
    const user = await User.findById(session.user).select('+tokenVersion');
    if (!user || user.status !== 'active') { session.revokedAt = new Date(); await session.save(); res.clearCookie('dk_refresh', cookieBaseOptions); return res.status(401).json({ success: false, message: 'Tài khoản không còn hoạt động' }); }

    const refreshToken = newRefreshToken();
    session.tokenHash = hashToken(refreshToken);
    session.expiresAt = refreshExpiry();
    session.lastUsedAt = new Date();
    await session.save();
    res.cookie('dk_refresh', refreshToken, cookieOptions);
    res.json({ success: true, data: { user: publicUser(user), accessToken: createAccessToken(user, session._id) } });
  } catch (error) { next(error); }
});

router.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies.dk_refresh;
    if (token) await RefreshSession.updateOne({ tokenHash: hashToken(token), revokedAt: null }, { revokedAt: new Date() });
    res.clearCookie('dk_refresh', cookieBaseOptions);
    res.json({ success: true, message: 'Đã đăng xuất' });
  } catch (error) { next(error); }
});

router.get('/me', authenticate, (req, res) => res.json({ success: true, data: { user: publicUser(req.user) } }));

router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');
    if (!validatePassword(newPassword)) return res.status(400).json({ success: false, message: 'Mật khẩu mới cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số' });
    const user = await User.findById(req.user._id).select('+passwordHash +tokenVersion');
    if (!(await user.verifyPassword(currentPassword))) return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
    if (await user.verifyPassword(newPassword)) return res.status(400).json({ success: false, message: 'Mật khẩu mới phải khác mật khẩu hiện tại' });
    user.passwordHash = await User.hashPassword(newPassword);
    user.tokenVersion += 1;
    await user.save();
    await RefreshSession.updateMany({ user: user._id, revokedAt: null }, { revokedAt: new Date() });
    res.clearCookie('dk_refresh', cookieBaseOptions);
    res.json({ success: true, message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' });
  } catch (error) { next(error); }
});

module.exports = router;

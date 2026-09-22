const User = require('../models/User');
const { verifyAccessToken } = require('../services/authService');

async function authenticate(req, res, next) {
  try {
    const [scheme, token] = (req.get('authorization') || '').split(' ');
    if (scheme !== 'Bearer' || !token) return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('+tokenVersion');
    if (!user || user.status !== 'active' || user.tokenVersion !== payload.tv) {
      return res.status(401).json({ success: false, message: 'Phiên đăng nhập không còn hiệu lực' });
    }
    req.user = user;
    req.auth = payload;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') return res.status(401).json({ success: false, code: 'ACCESS_TOKEN_EXPIRED', message: 'Phiên đăng nhập đã hết hạn' });
    return res.status(401).json({ success: false, message: 'Thông tin xác thực không hợp lệ' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => roles.includes(req.user?.role)
    ? next()
    : res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện thao tác này' });
}

function requirePermission(permission) {
  return (req, res, next) => req.user?.role === 'admin' || req.user?.permissions?.includes(permission)
    ? next()
    : res.status(403).json({ success: false, message: 'Tài khoản chưa được cấp quyền này' });
}

module.exports = { authenticate, requireRole, requirePermission };

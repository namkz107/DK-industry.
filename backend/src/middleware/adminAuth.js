function adminAuth(req, res, next) {
  const expectedKey = process.env.ADMIN_API_KEY;
  if (!expectedKey && process.env.NODE_ENV !== 'production') return next();
  if (!expectedKey) return res.status(503).json({ success: false, message: 'Admin API chưa được cấu hình' });
  if (req.get('x-admin-key') !== expectedKey) return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
  next();
}

module.exports = adminAuth;

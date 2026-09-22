const { rateLimit } = require('express-rate-limit');

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau' } });
const leadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 8, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng gọi hotline để được hỗ trợ.' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, skipSuccessfulRequests: true, message: { success: false, message: 'Quá nhiều lần thử đăng nhập. Vui lòng chờ 15 phút.' } });
const registrationLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, message: 'Đã tạo quá nhiều tài khoản từ kết nối này. Vui lòng thử lại sau.' } });
const customerRequestLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, skip: req => req.method === 'GET', message: { success: false, message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.' } });

function rejectUnsafeKeys(req, res, next) {
  const unsafe = value => value && typeof value === 'object' && Object.entries(value).some(([key, child]) => key.startsWith('$') || key.includes('.') || unsafe(child));
  if (unsafe(req.body) || unsafe(req.query) || unsafe(req.params)) return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
  next();
}

module.exports = { apiLimiter, leadLimiter, authLimiter, registrationLimiter, customerRequestLimiter, rejectUnsafeKeys };

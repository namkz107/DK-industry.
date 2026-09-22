const { rateLimit } = require('express-rate-limit');

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau' } });
const leadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 8, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng gọi hotline để được hỗ trợ.' } });

function rejectUnsafeKeys(req, res, next) {
  const unsafe = value => value && typeof value === 'object' && Object.entries(value).some(([key, child]) => key.startsWith('$') || key.includes('.') || unsafe(child));
  if (unsafe(req.body) || unsafe(req.query) || unsafe(req.params)) return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
  next();
}

module.exports = { apiLimiter, leadLimiter, rejectUnsafeKeys };

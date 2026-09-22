function notFound(req, res) {
  res.status(404).json({ success: false, message: `Không tìm thấy ${req.originalUrl}` });
}

function errorHandler(error, req, res, next) {
  console.error(error);
  if (error.code === 11000) return res.status(409).json({ success: false, message: 'Dữ liệu đã tồn tại trong hệ thống' });
  const status = error.name === 'ValidationError' ? 400 : (error.status || 500);
  res.status(status).json({ success: false, message: status === 500 ? 'Lỗi máy chủ, vui lòng thử lại sau' : error.message });
}

module.exports = { notFound, errorHandler };

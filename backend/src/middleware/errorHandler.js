function notFound(req, res) {
  res.status(404).json({ success: false, message: `Không tìm thấy ${req.originalUrl}` });
}

function errorHandler(error, req, res, next) {
  if (error.name === 'MulterError') {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? (error.field === 'image' ? 'Ảnh tối đa 5MB' : 'Mỗi tệp tối đa 10MB')
      : error.code === 'LIMIT_FILE_COUNT' ? 'Tối đa 5 tệp cho mỗi yêu cầu' : 'Tệp tải lên không hợp lệ';
    return res.status(400).json({ success: false, message });
  }
  if (error.code === 11000) return res.status(409).json({ success: false, message: 'Dữ liệu đã tồn tại trong hệ thống' });
  const status = error.name === 'ValidationError' ? 400 : (error.status || 500);
  if (status >= 500) console.error(error);
  res.status(status).json({ success: false, message: status === 500 ? 'Lỗi máy chủ, vui lòng thử lại sau' : error.message });
}

module.exports = { notFound, errorHandler };

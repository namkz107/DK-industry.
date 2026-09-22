const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Quotation = require('../models/Quotation');
const RequestMessage = require('../models/RequestMessage');
const ServiceRequest = require('../models/ServiceRequest');
const { transitionServiceRequest } = require('../services/workflowService');

const router = express.Router();
const phonePattern = /^(?:\+84|0)[0-9]{9,10}$/;
const requestTypes = new Set(['machining', 'product_quote', 'consulting']);
const paymentMethods = new Set(['cod', 'bank_transfer']);
const uploadDirectory = path.join(__dirname, '..', '..', 'storage', 'customer-requests');
const allowedExtensions = new Set(['.pdf', '.dxf', '.dwg', '.step', '.stp', '.iges', '.igs', '.png', '.jpg', '.jpeg', '.zip']);

fs.mkdirSync(uploadDirectory, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (req, file, callback) => callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { files: 5, fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.has(extension)) return callback(Object.assign(new Error('Chỉ nhận PDF, ảnh, DXF, DWG, STEP, IGES hoặc ZIP'), { status: 400 }));
    callback(null, true);
  }
});

const clean = value => String(value || '').trim();
const normalizePhone = value => clean(value).replace(/[\s.-]/g, '');
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const code = prefix => `${prefix}-${new Date().toISOString().slice(2, 10).replaceAll('-', '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
const validId = value => mongoose.isValidObjectId(value);

function addressValues(body) {
  const values = {
    label: clean(body.label) || 'Địa chỉ giao hàng',
    recipientName: clean(body.recipientName),
    phone: normalizePhone(body.phone),
    addressLine: clean(body.addressLine),
    ward: clean(body.ward),
    district: clean(body.district),
    province: clean(body.province),
    isDefault: body.isDefault === true || body.isDefault === 'true'
  };
  if (!values.recipientName || !phonePattern.test(values.phone) || !values.addressLine || !values.district || !values.province) {
    fail('Vui lòng nhập đủ người nhận, số điện thoại và địa chỉ giao hàng');
  }
  return values;
}

function cartView(cart) {
  const items = (cart?.items || []).filter(item => item.product).map(item => ({
    product: item.product,
    quantity: item.quantity,
    lineTotal: Number(item.product.price || 0) * item.quantity
  }));
  return {
    id: cart?._id,
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce((total, item) => total + item.lineTotal, 0)
  };
}

async function populatedCart(customerId) {
  return Cart.findOne({ customer: customerId }).populate({ path: 'items.product', match: { active: true } });
}

async function removeUploadedFiles(files = []) {
  await Promise.all(files.map(file => fs.promises.unlink(file.path).catch(() => {})));
}

router.get('/summary', async (req, res, next) => {
  try {
    const [orders, openOrders, requests, openRequests, cart] = await Promise.all([
      Order.countDocuments({ customer: req.user._id }),
      Order.countDocuments({ customer: req.user._id, status: { $nin: ['delivered', 'cancelled'] } }),
      ServiceRequest.countDocuments({ customer: req.user._id }),
      ServiceRequest.countDocuments({ customer: req.user._id, status: { $nin: ['accepted', 'rejected', 'cancelled'] } }),
      populatedCart(req.user._id)
    ]);
    res.json({ success: true, data: { orders, openOrders, requests, openRequests, cartItems: cartView(cart).itemCount } });
  } catch (error) { next(error); }
});

router.get('/profile', (req, res) => res.json({ success: true, data: {
  name: req.user.name, email: req.user.email, phone: req.user.phone || '', company: req.user.company || '', taxCode: req.user.taxCode || '', addresses: req.user.addresses || []
} }));

router.patch('/profile', async (req, res, next) => {
  try {
    const name = clean(req.body.name);
    const phone = normalizePhone(req.body.phone);
    if (name.length < 2 || name.length > 100) fail('Họ tên phải có từ 2 đến 100 ký tự');
    if (!phonePattern.test(phone)) fail('Số điện thoại Việt Nam không hợp lệ');
    req.user.name = name;
    req.user.phone = phone;
    req.user.company = clean(req.body.company);
    req.user.taxCode = clean(req.body.taxCode);
    await req.user.save();
    res.json({ success: true, message: 'Đã cập nhật hồ sơ', data: { name, email: req.user.email, phone, company: req.user.company || '', taxCode: req.user.taxCode || '' } });
  } catch (error) { next(error); }
});

router.post('/addresses', async (req, res, next) => {
  try {
    if (req.user.addresses.length >= 5) fail('Mỗi tài khoản được lưu tối đa 5 địa chỉ');
    const values = addressValues(req.body);
    if (!req.user.addresses.length) values.isDefault = true;
    if (values.isDefault) req.user.addresses.forEach(item => { item.isDefault = false; });
    req.user.addresses.push(values);
    await req.user.save();
    res.status(201).json({ success: true, message: 'Đã thêm địa chỉ', data: req.user.addresses });
  } catch (error) { next(error); }
});

router.patch('/addresses/:addressId', async (req, res, next) => {
  try {
    const address = req.user.addresses.id(req.params.addressId);
    if (!address) fail('Không tìm thấy địa chỉ', 404);
    const values = addressValues(req.body);
    if (values.isDefault) req.user.addresses.forEach(item => { item.isDefault = false; });
    Object.assign(address, values);
    if (!req.user.addresses.some(item => item.isDefault)) address.isDefault = true;
    await req.user.save();
    res.json({ success: true, message: 'Đã cập nhật địa chỉ', data: req.user.addresses });
  } catch (error) { next(error); }
});

router.delete('/addresses/:addressId', async (req, res, next) => {
  try {
    const address = req.user.addresses.id(req.params.addressId);
    if (!address) fail('Không tìm thấy địa chỉ', 404);
    const wasDefault = address.isDefault;
    address.deleteOne();
    if (wasDefault && req.user.addresses[0]) req.user.addresses[0].isDefault = true;
    await req.user.save();
    res.json({ success: true, message: 'Đã xóa địa chỉ', data: req.user.addresses });
  } catch (error) { next(error); }
});

router.get('/cart', async (req, res, next) => {
  try { res.json({ success: true, data: cartView(await populatedCart(req.user._id)) }); } catch (error) { next(error); }
});

router.post('/cart/items', async (req, res, next) => {
  try {
    if (!validId(req.body.productId)) fail('Sản phẩm không hợp lệ');
    const quantity = Math.max(1, Math.min(Number(req.body.quantity) || 1, 999));
    const product = await Product.findOne({ _id: req.body.productId, active: true });
    if (!product) fail('Sản phẩm không còn tồn tại', 404);
    if (product.priceOnRequest || product.price === null || product.price === undefined) fail('Sản phẩm này cần gửi yêu cầu báo giá');
    if (product.stock < quantity) fail(`Sản phẩm chỉ còn ${product.stock} ${product.unit}`);
    const cart = await Cart.findOneAndUpdate({ customer: req.user._id }, { $setOnInsert: { customer: req.user._id } }, { new: true, upsert: true });
    const item = cart.items.find(value => String(value.product) === String(product._id));
    if (item) item.quantity = Math.min(item.quantity + quantity, product.stock, 999);
    else cart.items.push({ product: product._id, quantity });
    await cart.save();
    res.status(201).json({ success: true, message: 'Đã thêm vào giỏ hàng', data: cartView(await populatedCart(req.user._id)) });
  } catch (error) { next(error); }
});

router.patch('/cart/items/:productId', async (req, res, next) => {
  try {
    if (!validId(req.params.productId)) fail('Sản phẩm không hợp lệ');
    const quantity = Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) fail('Số lượng phải từ 1 đến 999');
    const [cart, product] = await Promise.all([Cart.findOne({ customer: req.user._id }), Product.findById(req.params.productId)]);
    if (!cart) fail('Giỏ hàng đang trống', 404);
    const item = cart.items.find(value => String(value.product) === req.params.productId);
    if (!item) fail('Sản phẩm không có trong giỏ', 404);
    if (!product?.active || product.stock < quantity) fail(`Số lượng khả dụng hiện tại là ${product?.stock || 0}`);
    item.quantity = quantity;
    await cart.save();
    res.json({ success: true, message: 'Đã cập nhật số lượng', data: cartView(await populatedCart(req.user._id)) });
  } catch (error) { next(error); }
});

router.delete('/cart/items/:productId', async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ customer: req.user._id });
    if (cart) { cart.items = cart.items.filter(item => String(item.product) !== req.params.productId); await cart.save(); }
    res.json({ success: true, message: 'Đã xóa sản phẩm', data: cartView(await populatedCart(req.user._id)) });
  } catch (error) { next(error); }
});

router.get('/orders', async (req, res, next) => {
  try { res.json({ success: true, data: await Order.find({ customer: req.user._id }).sort({ createdAt: -1 }).limit(100).lean() }); } catch (error) { next(error); }
});

router.get('/orders/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) fail('Đơn hàng không hợp lệ', 404);
    const order = await Order.findOne({ _id: req.params.id, customer: req.user._id }).lean();
    if (!order) fail('Không tìm thấy đơn hàng', 404);
    res.json({ success: true, data: order });
  } catch (error) { next(error); }
});

router.post('/orders', async (req, res, next) => {
  try {
    const address = req.user.addresses.id(req.body.addressId);
    if (!address) fail('Vui lòng chọn địa chỉ giao hàng hợp lệ');
    const paymentMethod = paymentMethods.has(req.body.paymentMethod) ? req.body.paymentMethod : 'cod';
    const cart = await populatedCart(req.user._id);
    if (!cart?.items.length) fail('Giỏ hàng đang trống');
    const items = [];
    for (const cartItem of cart.items) {
      const product = cartItem.product;
      if (!product || product.priceOnRequest || product.price === null || product.price === undefined) fail('Giỏ hàng có sản phẩm cần báo giá hoặc đã ngừng bán');
      if (product.stock < cartItem.quantity) fail(`${product.name} chỉ còn ${product.stock} ${product.unit}`);
      items.push({ product: product._id, name: product.name, sku: product.sku, image: product.image, unit: product.unit, price: product.price, quantity: cartItem.quantity, lineTotal: product.price * cartItem.quantity });
    }
    const subtotal = items.reduce((total, item) => total + item.lineTotal, 0);
    const order = await Order.create({
      code: code('DH'), customer: req.user._id, items,
      shippingAddress: { recipientName: address.recipientName, phone: address.phone, addressLine: address.addressLine, ward: address.ward, district: address.district, province: address.province },
      subtotal, shippingFee: 0, total: subtotal, paymentMethod,
      customerNote: clean(req.body.customerNote),
      timeline: [{ status: 'pending', message: 'Đơn hàng đã được tiếp nhận, đang chờ xác nhận tồn kho và vận chuyển.' }]
    });
    cart.items = [];
    await cart.save();
    res.status(201).json({ success: true, message: 'Đặt hàng thành công', data: order });
  } catch (error) { next(error); }
});

router.patch('/orders/:id/cancel', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) fail('Đơn hàng không hợp lệ', 404);
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, customer: req.user._id, status: 'pending' },
      { $set: { status: 'cancelled' }, $push: { timeline: { status: 'cancelled', message: clean(req.body.reason) || 'Khách hàng đã hủy đơn.' } } },
      { new: true }
    );
    if (!order) fail('Chỉ có thể hủy đơn đang chờ xác nhận', 409);
    res.json({ success: true, message: 'Đã hủy đơn hàng', data: order });
  } catch (error) { next(error); }
});

router.get('/requests', async (req, res, next) => {
  try {
    const requests = await ServiceRequest.find({ customer: req.user._id }).select('-attachments.storedName').sort({ createdAt: -1 }).limit(100).lean();
    const quotations = await Quotation.find({ request: { $in: requests.map(item => item._id) }, status: { $ne: 'draft' } }).sort({ version: -1 }).lean();
    const latestByRequest = new Map();
    for (const quotation of quotations) if (!latestByRequest.has(String(quotation.request))) latestByRequest.set(String(quotation.request), quotation);
    res.json({ success: true, data: requests.map(request => ({ ...request, latestQuotation: latestByRequest.get(String(request._id)) || null })) });
  } catch (error) { next(error); }
});

router.get('/requests/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) fail('Yêu cầu không hợp lệ', 404);
    const request = await ServiceRequest.findOne({ _id: req.params.id, customer: req.user._id }).select('-attachments.storedName').lean();
    if (!request) fail('Không tìm thấy yêu cầu', 404);
    const [messages, quotations] = await Promise.all([
      RequestMessage.find({ request: request._id, visibility: 'customer' }).sort({ createdAt: 1 }).limit(200).lean(),
      Quotation.find({ request: request._id, customer: req.user._id, status: { $ne: 'draft' } }).sort({ version: -1 }).lean()
    ]);
    await RequestMessage.updateMany({ request: request._id, visibility: 'customer', senderRole: { $in: ['staff', 'admin', 'system'] }, readByCustomerAt: null }, { readByCustomerAt: new Date() });
    res.json({ success: true, data: { request, messages, quotations } });
  } catch (error) { next(error); }
});

router.post('/requests', upload.array('attachments', 5), async (req, res, next) => {
  try {
    const requestType = clean(req.body.requestType);
    const title = clean(req.body.title);
    const description = clean(req.body.description);
    if (!requestTypes.has(requestType)) fail('Loại yêu cầu không hợp lệ');
    if (title.length < 5 || title.length > 200) fail('Tiêu đề cần từ 5 đến 200 ký tự');
    if (description.length < 10 || description.length > 5000) fail('Mô tả cần từ 10 đến 5.000 ký tự');
    let product;
    if (req.body.productId) {
      if (!validId(req.body.productId)) fail('Sản phẩm báo giá không hợp lệ');
      product = await Product.findOne({ _id: req.body.productId, active: true });
      if (!product) fail('Sản phẩm không còn tồn tại', 404);
    }
    const desiredDate = req.body.desiredDate ? new Date(req.body.desiredDate) : undefined;
    if (desiredDate && Number.isNaN(desiredDate.getTime())) fail('Ngày mong muốn không hợp lệ');
    const quantity = req.body.quantity ? Number(req.body.quantity) : undefined;
    if (quantity !== undefined && (!Number.isFinite(quantity) || quantity < 1 || quantity > 1000000)) fail('Số lượng không hợp lệ');
    const request = await ServiceRequest.create({
      code: code('YC'), customer: req.user._id, requestType, title, description,
      material: clean(req.body.material), quantity, dimensions: clean(req.body.dimensions), desiredDate, budget: clean(req.body.budget),
      product: product?._id,
      productSnapshot: product ? { name: product.name, sku: product.sku, unit: product.unit } : undefined,
      contact: { name: req.user.name, phone: req.user.phone, email: req.user.email, company: req.user.company },
      attachments: (req.files || []).map(file => ({ originalName: file.originalname, storedName: file.filename, mimeType: file.mimetype, size: file.size })),
      timeline: [{ status: 'submitted', message: 'Yêu cầu đã được tiếp nhận và chờ kỹ thuật kiểm tra.', actorType: 'customer', actor: req.user._id }],
      lastCustomerMessageAt: new Date()
    });
    await RequestMessage.create({ request: request._id, sender: req.user._id, senderRole: 'customer', visibility: 'customer', content: description, readByCustomerAt: new Date() });
    res.status(201).json({ success: true, message: 'Đã gửi yêu cầu, kỹ thuật sẽ phản hồi trong giờ làm việc', data: { id: request._id, code: request.code, status: request.status } });
  } catch (error) { await removeUploadedFiles(req.files); next(error); }
});

router.post('/requests/:id/messages', upload.array('attachments', 3), async (req, res, next) => {
  try {
    if (!validId(req.params.id)) fail('Yêu cầu không hợp lệ', 404);
    const request = await ServiceRequest.findOne({ _id: req.params.id, customer: req.user._id });
    if (!request) fail('Không tìm thấy yêu cầu', 404);
    if (['rejected', 'cancelled'].includes(request.status)) fail('Yêu cầu đã đóng, không thể gửi thêm trao đổi', 409);
    const content = clean(req.body.content);
    if (!content && !req.files?.length) fail('Vui lòng nhập nội dung hoặc đính kèm tệp');
    if (content.length > 3000) fail('Nội dung trao đổi tối đa 3.000 ký tự');
    const message = await RequestMessage.create({
      request: request._id, sender: req.user._id, senderRole: 'customer', visibility: 'customer',
      content: content || 'Khách hàng đã gửi thêm tệp đính kèm.', readByCustomerAt: new Date(),
      attachments: (req.files || []).map(file => ({ originalName: file.originalname, storedName: file.filename, mimeType: file.mimetype, size: file.size }))
    });
    request.lastCustomerMessageAt = new Date();
    if (request.status === 'need_more_info') {
      transitionServiceRequest(request, 'reviewing', { message: 'Khách hàng đã bổ sung thông tin.', actorType: 'customer', actor: req.user._id });
    }
    await request.save();
    res.status(201).json({ success: true, message: 'Đã gửi trao đổi', data: { id: message._id, createdAt: message.createdAt } });
  } catch (error) { await removeUploadedFiles(req.files); next(error); }
});

router.get('/requests/:requestId/messages/:messageId/attachments/:attachmentId', async (req, res, next) => {
  try {
    if (![req.params.requestId, req.params.messageId, req.params.attachmentId].every(validId)) fail('Tệp đính kèm không hợp lệ', 404);
    const request = await ServiceRequest.exists({ _id: req.params.requestId, customer: req.user._id });
    if (!request) fail('Không tìm thấy tệp đính kèm', 404);
    const message = await RequestMessage.findOne({ _id: req.params.messageId, request: req.params.requestId, visibility: 'customer' }).select('+attachments.storedName');
    const attachment = message?.attachments.id(req.params.attachmentId);
    if (!attachment?.storedName) fail('Không tìm thấy tệp đính kèm', 404);
    res.download(path.join(uploadDirectory, attachment.storedName), attachment.originalName);
  } catch (error) { next(error); }
});

router.patch('/requests/:requestId/quotations/:quotationId/respond', async (req, res, next) => {
  try {
    if (!validId(req.params.requestId) || !validId(req.params.quotationId)) fail('Báo giá không hợp lệ', 404);
    const decision = clean(req.body.decision);
    if (!['accepted', 'rejected'].includes(decision)) fail('Phản hồi báo giá không hợp lệ');
    const request = await ServiceRequest.findOne({ _id: req.params.requestId, customer: req.user._id });
    if (!request) fail('Không tìm thấy yêu cầu', 404);
    const latest = await Quotation.findOne({ request: request._id, customer: req.user._id, status: 'sent' }).sort({ version: -1 });
    if (!latest || String(latest._id) !== req.params.quotationId) fail('Báo giá không còn chờ phản hồi', 409);
    if (latest.validUntil < new Date()) {
      latest.status = 'expired'; await latest.save();
      if (request.status === 'quoted') { transitionServiceRequest(request, 'reviewing', { message: `Báo giá ${latest.code} đã hết hiệu lực.` }); await request.save(); }
      fail('Báo giá đã hết hiệu lực, vui lòng yêu cầu báo giá mới', 409);
    }
    const nextStatus = decision === 'accepted' ? 'accepted' : 'reviewing';
    transitionServiceRequest(request, nextStatus, { message: decision === 'accepted' ? `Khách hàng đã chấp thuận báo giá ${latest.code}.` : `Khách hàng chưa chấp thuận báo giá ${latest.code}.`, actorType: 'customer', actor: req.user._id });
    const responseNote = clean(req.body.note).slice(0, 1000);
    const quotation = await Quotation.findOneAndUpdate(
      { _id: latest._id, status: 'sent' },
      { status: decision, respondedAt: new Date(), responseNote },
      { new: true, runValidators: true }
    );
    if (!quotation) fail('Báo giá đã được phản hồi trước đó', 409);
    if (decision === 'accepted') {
      await Quotation.updateMany({ request: request._id, _id: { $ne: quotation._id }, status: 'sent' }, { status: 'superseded' });
    } else {
      request.timeline[request.timeline.length - 1].message = `Khách hàng chưa chấp thuận báo giá ${quotation.code}${responseNote ? `: ${responseNote}` : '.'}`;
    }
    request.lastCustomerMessageAt = new Date();
    await request.save();
    await RequestMessage.create({ request: request._id, sender: req.user._id, senderRole: 'customer', visibility: 'customer', content: decision === 'accepted' ? `Tôi chấp thuận báo giá ${quotation.code}.` : `Tôi chưa chấp thuận báo giá ${quotation.code}.${responseNote ? ` ${responseNote}` : ''}`, readByCustomerAt: new Date() });
    res.json({ success: true, message: decision === 'accepted' ? 'Đã chấp thuận báo giá' : 'Đã gửi phản hồi báo giá', data: quotation });
  } catch (error) { next(error); }
});

router.get('/requests/:requestId/attachments/:attachmentId', async (req, res, next) => {
  try {
    if (!validId(req.params.requestId) || !validId(req.params.attachmentId)) fail('Tệp đính kèm không hợp lệ', 404);
    const request = await ServiceRequest.findOne({ _id: req.params.requestId, customer: req.user._id });
    const attachment = request?.attachments.id(req.params.attachmentId);
    if (!attachment) fail('Không tìm thấy tệp đính kèm', 404);
    res.download(path.join(uploadDirectory, attachment.storedName), attachment.originalName);
  } catch (error) { next(error); }
});

router.patch('/requests/:id/cancel', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) fail('Yêu cầu không hợp lệ', 404);
    const request = await ServiceRequest.findOneAndUpdate(
      { _id: req.params.id, customer: req.user._id, status: { $in: ['submitted', 'need_more_info'] } },
      { $set: { status: 'cancelled' }, $push: { timeline: { status: 'cancelled', message: 'Khách hàng đã hủy yêu cầu.' } } },
      { new: true }
    );
    if (!request) fail('Không thể hủy yêu cầu ở trạng thái hiện tại', 409);
    await RequestMessage.create({ request: request._id, sender: req.user._id, senderRole: 'customer', visibility: 'customer', content: 'Khách hàng đã hủy yêu cầu.', readByCustomerAt: new Date() });
    res.json({ success: true, message: 'Đã hủy yêu cầu', data: request });
  } catch (error) { next(error); }
});

module.exports = router;

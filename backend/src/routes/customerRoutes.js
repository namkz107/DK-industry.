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
const WorkOrder = require('../models/WorkOrder');
const { transitionOrder, transitionPayment, transitionServiceRequest } = require('../services/workflowService');
const { withTransaction } = require('../services/transactionService');
const { writeAudit } = require('../services/auditService');
const { notifyOperations, dispatchSoon } = require('../services/notificationService');
const { validateUploadedFiles } = require('../services/fileSecurityService');

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
const finiteCoordinate = (value, min, max) => {
  if (value === undefined || value === null || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : undefined;
};

function addressValues(body) {
  const values = {
    label: clean(body.label) || 'Địa chỉ giao hàng',
    recipientName: clean(body.recipientName),
    phone: normalizePhone(body.phone),
    addressLine: clean(body.addressLine),
    ward: clean(body.ward),
    district: clean(body.district),
    province: clean(body.province),
    formattedAddress: clean(body.formattedAddress),
    placeId: clean(body.placeId),
    latitude: finiteCoordinate(body.latitude, -90, 90),
    longitude: finiteCoordinate(body.longitude, -180, 180),
    accuracyMeters: finiteCoordinate(body.accuracyMeters, 0, 100000),
    locationConfirmed: body.locationConfirmed === true || body.locationConfirmed === 'true',
    isDefault: body.isDefault === true || body.isDefault === 'true'
  };
  if (values.latitude === undefined || values.longitude === undefined) {
    values.latitude = undefined;
    values.longitude = undefined;
    values.accuracyMeters = undefined;
    values.locationConfirmed = false;
  }
  if (!values.recipientName || !phonePattern.test(values.phone) || !values.addressLine || !values.district || !values.province) {
    fail('Vui lòng nhập đủ người nhận, số điện thoại và địa chỉ giao hàng');
  }
  return values;
}

function googleMapsKey() {
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!key) fail('Tìm kiếm vị trí chưa được cấu hình', 503);
  return key;
}

async function googleRequest(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body?.error?.message || 'Không thể kết nối dịch vụ bản đồ');
      error.status = response.status === 429 ? 429 : 502;
      throw error;
    }
    return body;
  } catch (error) {
    if (error.name === 'AbortError') fail('Dịch vụ bản đồ phản hồi quá chậm', 504);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function componentValue(components, types) {
  const component = (components || []).find(item => types.some(type => item.types?.includes(type)));
  return component?.longText || component?.long_name || '';
}

function structuredAddress(components) {
  return {
    province: componentValue(components, ['administrative_area_level_1']),
    district: componentValue(components, ['administrative_area_level_2', 'locality']),
    ward: componentValue(components, ['administrative_area_level_3', 'sublocality_level_1', 'ward']),
    addressLine: [
      componentValue(components, ['street_number']),
      componentValue(components, ['route']),
      componentValue(components, ['premise', 'establishment'])
    ].filter(Boolean).join(' ')
  };
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

async function populatedCart(customerId, session = null) {
  const query = Cart.findOne({ customer: customerId }).populate({ path: 'items.product', match: { active: true } });
  if (session) query.session(session);
  return query;
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

router.get('/locations/autocomplete', async (req, res, next) => {
  try {
    const input = clean(req.query.input).slice(0, 200);
    if (input.length < 3) return res.json({ success: true, data: [] });
    const sessionToken = clean(req.query.sessionToken).slice(0, 100);
    const latitude = finiteCoordinate(req.query.latitude, -90, 90);
    const longitude = finiteCoordinate(req.query.longitude, -180, 180);
    const requestBody = { input, languageCode: 'vi', regionCode: 'VN' };
    if (sessionToken) requestBody.sessionToken = sessionToken;
    if (latitude !== undefined && longitude !== undefined) requestBody.locationBias = {
      circle: { center: { latitude, longitude }, radius: 50000 }
    };
    const result = await googleRequest('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleMapsKey(),
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat'
      },
      body: JSON.stringify(requestBody)
    });
    const suggestions = (result.suggestions || []).flatMap(item => item.placePrediction ? [{
      placeId: item.placePrediction.placeId,
      text: item.placePrediction.text?.text || '',
      mainText: item.placePrediction.structuredFormat?.mainText?.text || item.placePrediction.text?.text || '',
      secondaryText: item.placePrediction.structuredFormat?.secondaryText?.text || ''
    }] : []);
    res.json({ success: true, data: suggestions });
  } catch (error) { next(error); }
});

router.get('/locations/place/:placeId', async (req, res, next) => {
  try {
    const placeId = clean(req.params.placeId).slice(0, 300);
    if (!placeId) fail('Địa điểm không hợp lệ');
    const query = new URLSearchParams({ languageCode: 'vi' });
    const sessionToken = clean(req.query.sessionToken).slice(0, 100);
    if (sessionToken) query.set('sessionToken', sessionToken);
    const result = await googleRequest(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?${query}`, {
      headers: {
        'X-Goog-Api-Key': googleMapsKey(),
        'X-Goog-FieldMask': 'id,formattedAddress,location,addressComponents,displayName'
      }
    });
    res.json({ success: true, data: {
      placeId: result.id || placeId,
      formattedAddress: result.formattedAddress || '',
      latitude: result.location?.latitude,
      longitude: result.location?.longitude,
      ...structuredAddress(result.addressComponents)
    } });
  } catch (error) { next(error); }
});

router.post('/locations/reverse', async (req, res, next) => {
  try {
    const latitude = finiteCoordinate(req.body.latitude, -90, 90);
    const longitude = finiteCoordinate(req.body.longitude, -180, 180);
    if (latitude === undefined || longitude === undefined) fail('Tọa độ không hợp lệ');
    const query = new URLSearchParams({ latlng: `${latitude},${longitude}`, language: 'vi', key: googleMapsKey() });
    const result = await googleRequest(`https://maps.googleapis.com/maps/api/geocode/json?${query}`);
    if (result.status === 'ZERO_RESULTS' || !result.results?.length && result.status === 'OK') fail('Không tìm thấy địa chỉ tại vị trí này', 404);
    if (result.status !== 'OK') fail(result.error_message || 'Dịch vụ bản đồ không thể xử lý vị trí', 502);
    const match = result.results[0];
    res.json({ success: true, data: {
      placeId: match.place_id || '',
      formattedAddress: match.formatted_address || '',
      latitude,
      longitude,
      ...structuredAddress(match.address_components)
    } });
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
    if (req.body.acceptedTerms !== true) fail('Bạn cần đồng ý điều khoản bán hàng và chính sách thanh toán trước khi đặt hàng');
    const paymentMethod = paymentMethods.has(req.body.paymentMethod) ? req.body.paymentMethod : 'cod';
    const idempotencyKey = clean(req.get('Idempotency-Key') || req.body.idempotencyKey).slice(0, 100);
    if (!/^[A-Za-z0-9._:-]{16,100}$/.test(idempotencyKey)) fail('Yêu cầu đặt hàng thiếu khóa chống trùng hợp lệ');
    let duplicate = false;
    const order = await withTransaction(async session => {
      const existingQuery = Order.findOne({ customer: req.user._id, idempotencyKey });
      if (session) existingQuery.session(session);
      const existing = await existingQuery;
      if (existing) { duplicate = true; return existing; }

      const cart = await populatedCart(req.user._id, session);
      if (!cart?.items.length) fail('Giỏ hàng đang trống');
      const items = [];
      for (const cartItem of cart.items) {
        const product = cartItem.product;
        if (!product || product.priceOnRequest || product.price === null || product.price === undefined) fail('Giỏ hàng có sản phẩm cần báo giá hoặc đã ngừng bán');
        if (product.stock < cartItem.quantity) fail(`${product.name} chỉ còn ${product.stock} ${product.unit}`);
        items.push({ product: product._id, name: product.name, sku: product.sku, image: product.image, unit: product.unit, price: product.price, quantity: cartItem.quantity, lineTotal: product.price * cartItem.quantity });
      }
      const subtotal = items.reduce((total, item) => total + item.lineTotal, 0);
      const documents = await Order.create([{
        code: code('DH'), customer: req.user._id, idempotencyKey, items,
        shippingAddress: {
          recipientName: address.recipientName, phone: address.phone, addressLine: address.addressLine, ward: address.ward,
          district: address.district, province: address.province, formattedAddress: address.formattedAddress,
          placeId: address.placeId, latitude: address.latitude, longitude: address.longitude,
          accuracyMeters: address.accuracyMeters, locationConfirmed: address.locationConfirmed
        },
        subtotal, shippingFee: 0, total: subtotal, paymentMethod,
        termsAcceptedAt: new Date(), termsVersion: '2026-09-29',
        customerNote: clean(req.body.customerNote),
        paymentTimeline: [{ status: 'unpaid', message: paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng.' : 'Chờ nhân viên xác nhận thông tin chuyển khoản.' }],
        timeline: [{ status: 'pending', message: 'Đơn hàng đã được tiếp nhận, đang chờ xác nhận tồn kho và vận chuyển.', actorType: 'customer', actor: req.user._id }]
      }], session ? { session } : undefined);
      const created = documents[0];
      const cleared = await Cart.updateOne({ _id: cart._id, __v: cart.__v }, { $set: { items: [] }, $inc: { __v: 1 } }, session ? { session } : undefined);
      if (!cleared.modifiedCount) fail('Giỏ hàng vừa thay đổi, vui lòng kiểm tra lại trước khi đặt', 409);
      await writeAudit({ actor: req.user._id, action: 'order.created', entity: 'order', entityId: created._id, summary: `Khách hàng tạo đơn ${created.code}`, metadata: { total: created.total, paymentMethod }, session });
      return created;
    });
    if (!duplicate) {
      await notifyOperations({ type: 'order.created', title: `Đơn hàng mới ${order.code}`, message: `${req.user.name} vừa đặt đơn trị giá ${order.total.toLocaleString('vi-VN')}đ.`, link: '/staff/orders', metadata: { orderId: order._id } });
      dispatchSoon();
    }
    res.status(duplicate ? 200 : 201).json({ success: true, duplicate, message: duplicate ? 'Đơn hàng đã được ghi nhận trước đó' : 'Đặt hàng thành công', data: order });
  } catch (error) {
    if (error.code === 11000) {
      const idempotencyKey = clean(req.get('Idempotency-Key') || req.body.idempotencyKey).slice(0, 100);
      const existing = await Order.findOne({ customer: req.user._id, idempotencyKey });
      if (existing) return res.json({ success: true, duplicate: true, message: 'Đơn hàng đã được ghi nhận trước đó', data: existing });
    }
    next(error);
  }
});

router.patch('/orders/:id/cancel', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) fail('Đơn hàng không hợp lệ', 404);
    const reason = clean(req.body.reason);
    if (reason.length < 5) fail('Vui lòng nhập lý do hủy đơn rõ ràng');
    const order = await withTransaction(async session => {
      const query = Order.findOne({ _id: req.params.id, customer: req.user._id });
      if (session) query.session(session);
      const current = await query;
      if (!current) fail('Không tìm thấy đơn hàng', 404);
      if (current.status !== 'pending') fail('Chỉ có thể hủy đơn đang chờ xác nhận', 409);
      transitionOrder(current, 'cancelled', { actor: req.user._id, actorType: 'customer', message: reason });
      current.cancellationReason = reason;
      if (current.paymentStatus === 'paid') transitionPayment(current, 'refund_pending', { actor: req.user._id, message: 'Khách đã hủy đơn đã thanh toán; cần hoàn tiền.', amount: current.amountPaid, reference: current.paymentReference });
      await current.save(session ? { session } : undefined);
      await writeAudit({ actor: req.user._id, action: 'order.cancelled_by_customer', entity: 'order', entityId: current._id, summary: `Khách hủy đơn ${current.code}`, metadata: { reason, paymentStatus: current.paymentStatus }, session });
      return current;
    });
    await notifyOperations({ type: 'order.cancelled', title: `Khách hủy đơn ${order.code}`, message: reason, link: '/staff/orders', metadata: { orderId: order._id } });
    dispatchSoon();
    res.json({ success: true, message: 'Đã hủy đơn hàng', data: order });
  } catch (error) { next(error); }
});

router.post('/orders/:id/after-sales', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) fail('Đơn hàng không hợp lệ', 404);
    const type = clean(req.body.type);
    const reason = clean(req.body.reason).slice(0, 3000);
    if (!['return', 'warranty', 'complaint'].includes(type)) fail('Loại yêu cầu hậu mãi không hợp lệ');
    if (reason.length < 10) fail('Vui lòng mô tả vấn đề ít nhất 10 ký tự');
    const order = await Order.findOne({ _id: req.params.id, customer: req.user._id });
    if (!order) fail('Không tìm thấy đơn hàng', 404);
    if (order.status !== 'delivered') fail('Chỉ có thể gửi yêu cầu hậu mãi cho đơn đã giao', 409);
    if (order.afterSalesRequests.some(item => !['rejected', 'resolved'].includes(item.status))) fail('Đơn hàng đang có một yêu cầu hậu mãi được xử lý', 409);
    order.afterSalesRequests.push({ type, reason, status: 'submitted' });
    await order.save();
    const item = order.afterSalesRequests.at(-1);
    await writeAudit({ actor: req.user._id, action: 'order.after_sales_created', entity: 'order', entityId: order._id, summary: `Tạo yêu cầu hậu mãi cho ${order.code}`, metadata: { afterSalesId: item._id, type } });
    await notifyOperations({ type: 'order.after_sales_created', title: `Yêu cầu hậu mãi ${order.code}`, message: reason, link: '/staff/orders', metadata: { orderId: order._id, afterSalesId: item._id } });
    dispatchSoon();
    res.status(201).json({ success: true, message: 'Đã tiếp nhận yêu cầu hậu mãi', data: order });
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
    const workOrder = await WorkOrder.findOne({ request: request._id, customer: req.user._id }).lean();
    await RequestMessage.updateMany({ request: request._id, visibility: 'customer', senderRole: { $in: ['staff', 'admin', 'system'] }, readByCustomerAt: null }, { readByCustomerAt: new Date() });
    res.json({ success: true, data: { request, messages, quotations, workOrder } });
  } catch (error) { next(error); }
});

router.post('/requests', upload.array('attachments', 5), async (req, res, next) => {
  try {
    await validateUploadedFiles(req.files);
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
    await notifyOperations({ type: 'request.created', title: `Yêu cầu mới ${request.code}`, message: `${req.user.name}: ${request.title}`, link: '/staff/requests', metadata: { requestId: request._id } });
    dispatchSoon();
    res.status(201).json({ success: true, message: 'Đã gửi yêu cầu, kỹ thuật sẽ phản hồi trong giờ làm việc', data: { id: request._id, code: request.code, status: request.status } });
  } catch (error) { await removeUploadedFiles(req.files); next(error); }
});

router.post('/requests/:id/messages', upload.array('attachments', 3), async (req, res, next) => {
  try {
    await validateUploadedFiles(req.files);
    if (!validId(req.params.id)) fail('Yêu cầu không hợp lệ', 404);
    const request = await ServiceRequest.findOne({ _id: req.params.id, customer: req.user._id });
    if (!request) fail('Không tìm thấy yêu cầu', 404);
    if (['accepted', 'rejected', 'cancelled'].includes(request.status)) fail('Yêu cầu đã đóng, không thể gửi thêm trao đổi', 409);
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
    await notifyOperations({ type: 'request.customer_message', title: `Khách bổ sung yêu cầu ${request.code}`, message: content || 'Khách hàng đã gửi thêm tệp đính kèm.', link: '/staff/requests', metadata: { requestId: request._id } });
    dispatchSoon();
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
    const responseNote = clean(req.body.note).slice(0, 1000);
    let workOrder;
    const quotation = await withTransaction(async session => {
      const requestQuery = ServiceRequest.findOne({ _id: req.params.requestId, customer: req.user._id });
      if (session) requestQuery.session(session);
      const request = await requestQuery;
      if (!request) fail('Không tìm thấy yêu cầu', 404);
      const latestQuery = Quotation.findOne({ request: request._id, customer: req.user._id, status: 'sent' }).sort({ version: -1 });
      if (session) latestQuery.session(session);
      const latest = await latestQuery;
      if (!latest || String(latest._id) !== req.params.quotationId) fail('Báo giá không còn chờ phản hồi', 409);
      if (latest.validUntil < new Date()) fail('Báo giá đã hết hiệu lực, vui lòng yêu cầu báo giá mới', 409);

      const nextStatus = decision === 'accepted' ? 'accepted' : 'reviewing';
      transitionServiceRequest(request, nextStatus, { message: decision === 'accepted' ? `Khách hàng đã chấp thuận báo giá ${latest.code}.` : `Khách hàng chưa chấp thuận báo giá ${latest.code}.`, actorType: 'customer', actor: req.user._id });
      const updated = await Quotation.findOneAndUpdate(
        { _id: latest._id, status: 'sent', validUntil: { $gt: new Date() } },
        { status: decision, respondedAt: new Date(), responseNote },
        { new: true, runValidators: true, ...(session ? { session } : {}) }
      );
      if (!updated) fail('Báo giá đã được phản hồi hoặc hết hiệu lực', 409);
      if (decision === 'accepted') {
        await Quotation.updateMany({ request: request._id, _id: { $ne: updated._id }, status: 'sent' }, { status: 'superseded' }, session ? { session } : undefined);
        const workQuery = WorkOrder.findOne({ request: request._id });
        if (session) workQuery.session(session);
        workOrder = await workQuery;
        if (!workOrder) {
          const created = await WorkOrder.create([{
            request: request._id, quotation: updated._id, customer: req.user._id, assignedTo: request.assignedTo,
            agreedTotal: updated.total, status: 'awaiting_contract',
            timeline: [{ status: 'awaiting_contract', message: `Khởi tạo từ báo giá ${updated.code} đã được khách hàng chấp thuận.`, actorType: 'customer', actor: req.user._id }]
          }], session ? { session } : undefined);
          workOrder = created[0];
        }
      } else {
        request.timeline[request.timeline.length - 1].message = `Khách hàng chưa chấp thuận báo giá ${updated.code}${responseNote ? `: ${responseNote}` : '.'}`;
      }
      request.lastCustomerMessageAt = new Date();
      await request.save(session ? { session } : undefined);
      await RequestMessage.create([{ request: request._id, sender: req.user._id, senderRole: 'customer', visibility: 'customer', content: decision === 'accepted' ? `Tôi chấp thuận báo giá ${updated.code}.` : `Tôi chưa chấp thuận báo giá ${updated.code}.${responseNote ? ` ${responseNote}` : ''}`, readByCustomerAt: new Date() }], session ? { session } : undefined);
      await writeAudit({ actor: req.user._id, action: `quotation.${decision}`, entity: 'quotation', entityId: updated._id, summary: `Khách hàng ${decision === 'accepted' ? 'chấp thuận' : 'từ chối'} báo giá ${updated.code}`, metadata: { requestId: request._id, workOrderId: workOrder?._id, responseNote }, session });
      return updated;
    });
    await notifyOperations({ type: `quotation.${decision}`, title: `Báo giá ${quotation.code} đã được phản hồi`, message: decision === 'accepted' ? `Khách hàng đã chấp thuận. Công việc ${workOrder?.code || ''} đã được khởi tạo.` : `Khách hàng chưa chấp thuận.${responseNote ? ` ${responseNote}` : ''}`, link: '/staff/requests', metadata: { quotationId: quotation._id, workOrderId: workOrder?._id } });
    dispatchSoon();
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
    const request = await withTransaction(async session => {
      const query = ServiceRequest.findOne({ _id: req.params.id, customer: req.user._id });
      if (session) query.session(session);
      const current = await query;
      if (!current || !['submitted', 'need_more_info'].includes(current.status)) fail('Không thể hủy yêu cầu ở trạng thái hiện tại', 409);
      transitionServiceRequest(current, 'cancelled', { actor: req.user._id, actorType: 'customer', message: 'Khách hàng đã hủy yêu cầu.' });
      await current.save(session ? { session } : undefined);
      await RequestMessage.create([{ request: current._id, sender: req.user._id, senderRole: 'customer', visibility: 'customer', content: 'Khách hàng đã hủy yêu cầu.', readByCustomerAt: new Date() }], session ? { session } : undefined);
      await writeAudit({ actor: req.user._id, action: 'request.cancelled_by_customer', entity: 'request', entityId: current._id, summary: `Khách hủy yêu cầu ${current.code}`, session });
      return current;
    });
    await notifyOperations({ type: 'request.cancelled', title: `Yêu cầu ${request.code} đã bị hủy`, message: `${req.user.name} đã hủy yêu cầu.`, link: '/staff/requests', metadata: { requestId: request._id } });
    dispatchSoon();
    res.json({ success: true, message: 'Đã hủy yêu cầu', data: request });
  } catch (error) { next(error); }
});

module.exports = router;

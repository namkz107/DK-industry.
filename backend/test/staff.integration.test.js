const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'local_staff_integration_secret_longer_than_32_characters';

const app = require('../src/app');
const Lead = require('../src/models/Lead');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const Quotation = require('../src/models/Quotation');
const RequestMessage = require('../src/models/RequestMessage');
const ServiceRequest = require('../src/models/ServiceRequest');
const User = require('../src/models/User');
const { createAccessToken } = require('../src/services/authService');

const runIntegration = process.env.RUN_STAFF_INTEGRATION === '1';

test('Staff xử lý Lead, Service Request, trao đổi và báo giá đúng quyền', { skip: !runIntegration }, async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const suffix = Date.now();
  const users = [];
  let lead;
  let serviceRequest;
  let product;
  let order;
  let deliveryOrder;

  const call = (url, token, options = {}) => fetch(`${baseUrl}${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers }
  });

  try {
    const passwordHash = await User.hashPassword('StrongPass123');
    const [customer, staff, otherStaff] = await User.create([
      { name: 'Khách Staff Test', email: `staff-customer-${suffix}@example.com`, phone: `091${String(suffix).slice(-7)}`, passwordHash, role: 'customer' },
      { name: 'Nhân viên Test', email: `staff-owner-${suffix}@example.com`, phone: `092${String(suffix).slice(-7)}`, passwordHash, role: 'staff' },
      { name: 'Nhân viên Khác', email: `staff-other-${suffix}@example.com`, phone: `093${String(suffix).slice(-7)}`, passwordHash, role: 'staff' }
    ]);
    users.push(customer._id, staff._id, otherStaff._id);
    const customerToken = createAccessToken(customer, new mongoose.Types.ObjectId());
    const staffToken = createAccessToken(staff, new mongoose.Types.ObjectId());

    lead = await Lead.create({ name: 'Lead Staff Test', phone: '0901234567', email: `lead-${suffix}@example.com`, serviceType: 'Gia công CNC', message: 'Cần tư vấn gia công.', consent: true });
    serviceRequest = await ServiceRequest.create({
      code: `YC-STAFF-${suffix}`, customer: customer._id, requestType: 'machining', title: 'Gia công chi tiết Staff test',
      description: 'Hồ sơ dùng để kiểm thử quy trình nhân viên.', contact: { name: customer.name, phone: customer.phone, email: customer.email },
      timeline: [{ status: 'submitted', message: 'Khách đã gửi yêu cầu.', actorType: 'customer', actor: customer._id }]
    });
    product = await Product.create({ name: 'Sản phẩm Staff Test', slug: `staff-test-${suffix}`, sku: `ST-${suffix}`, category: 'Kiểm thử', price: 250000, unit: 'chiếc', stock: 5, active: true });
    order = await Order.create({
      code: `DH-STAFF-${suffix}`, customer: customer._id, items: [{ product: product._id, name: product.name, sku: product.sku, unit: product.unit, price: product.price, quantity: 2, lineTotal: 500000 }],
      shippingAddress: { recipientName: customer.name, phone: customer.phone, addressLine: 'Cụm 3, Duyên Trường', district: 'Thường Tín', province: 'Hà Nội' },
      subtotal: 500000, total: 500000, timeline: [{ status: 'pending', message: 'Đơn mới.' }]
    });

    const customerForbidden = await call('/staff/dashboard', customerToken);
    assert.equal(customerForbidden.status, 403);
    assert.equal((await call('/staff/dashboard', staffToken)).status, 200);

    const claimLead = await call(`/staff/leads/${lead._id}`, staffToken, { method: 'PATCH', body: JSON.stringify({ assignedTo: 'me', priority: 'high', status: 'qualified', message: 'Đã xác minh nhu cầu.' }) });
    assert.equal(claimLead.status, 200);
    const savedLead = await Lead.findById(lead._id);
    assert.equal(String(savedLead.assignedTo), String(staff._id));
    assert.equal(savedLead.status, 'qualified');
    assert.ok(savedLead.timeline.some(item => item.action === 'status_changed'));

    const assignOther = await call(`/staff/leads/${lead._id}`, staffToken, { method: 'PATCH', body: JSON.stringify({ assignedTo: otherStaff._id }) });
    assert.equal(assignOther.status, 403);

    const review = await call(`/staff/requests/${serviceRequest._id}`, staffToken, { method: 'PATCH', body: JSON.stringify({ assignedTo: 'me', priority: 'urgent', status: 'reviewing', message: 'Kỹ thuật bắt đầu kiểm tra bản vẽ.' }) });
    assert.equal(review.status, 200);
    const internalMessage = await call(`/staff/requests/${serviceRequest._id}/messages`, staffToken, { method: 'POST', body: JSON.stringify({ visibility: 'internal', content: 'Cần kiểm tra lại dung sai trước khi báo giá.' }) });
    assert.equal(internalMessage.status, 201);

    const quote = await call(`/staff/requests/${serviceRequest._id}/quotations`, staffToken, { method: 'POST', body: JSON.stringify({
      status: 'sent', validUntil: new Date(Date.now() + 7 * 86400000), taxRate: 10, leadTime: '10 ngày', paymentTerms: 'Đặt cọc 50%',
      items: [{ description: 'Gia công chi tiết CNC', quantity: 10, unit: 'chiếc', unitPrice: 100000 }]
    }) });
    const quoteBody = await quote.json();
    assert.equal(quote.status, 201);
    assert.equal(quoteBody.data.total, 1100000);

    const customerDetail = await call(`/customer/requests/${serviceRequest._id}`, customerToken);
    const customerBody = await customerDetail.json();
    assert.equal(customerDetail.status, 200);
    assert.equal(customerBody.data.quotations.length, 1);
    assert.equal(customerBody.data.messages.some(item => item.visibility === 'internal'), false);
    assert.ok(customerBody.data.messages.some(item => item.content.includes(quoteBody.data.code)));

    const confirmOrder = await call(`/staff/orders/${order._id}`, staffToken, { method: 'PATCH', body: JSON.stringify({ assignedTo: 'me', status: 'confirmed', paymentStatus: 'paid', message: 'Đã kiểm tra tồn kho.' }) });
    assert.equal(confirmOrder.status, 200);
    assert.equal((await Product.findById(product._id)).stock, 3);
    const prepareOrder = await call(`/staff/orders/${order._id}`, staffToken, { method: 'PATCH', body: JSON.stringify({ status: 'preparing', message: 'Đang đóng gói.' }) });
    assert.equal(prepareOrder.status, 200);
    const cancelOrder = await call(`/staff/orders/${order._id}`, staffToken, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled', message: 'Dừng theo xác nhận nội bộ.' }) });
    assert.equal(cancelOrder.status, 200);
    assert.equal((await Product.findById(product._id)).stock, 5);
    assert.equal((await Order.findById(order._id)).paymentStatus, 'refund_pending');

    deliveryOrder = await Order.create({
      code: `DH-DELIVERY-${suffix}`, customer: customer._id, paymentMethod: 'bank_transfer',
      items: [{ product: product._id, name: product.name, sku: product.sku, unit: product.unit, price: product.price, quantity: 1, lineTotal: 250000 }],
      shippingAddress: { recipientName: customer.name, phone: customer.phone, addressLine: 'Cụm 3, Duyên Trường', district: 'Thường Tín', province: 'Hà Nội' },
      subtotal: 250000, total: 250000, timeline: [{ status: 'pending', message: 'Đơn giao thử nghiệm.' }]
    });
    const concurrentConfirmations = await Promise.all([
      call(`/staff/orders/${deliveryOrder._id}`, staffToken, { method: 'PATCH', body: JSON.stringify({ status: 'confirmed', shippingFee: 30000, message: 'Đã giữ hàng.' }) }),
      call(`/staff/orders/${deliveryOrder._id}`, staffToken, { method: 'PATCH', body: JSON.stringify({ status: 'confirmed', shippingFee: 30000, message: 'Đã giữ hàng.' }) })
    ]);
    assert.ok(concurrentConfirmations.some(response => response.status === 200));
    assert.ok(concurrentConfirmations.every(response => [200, 409].includes(response.status)));
    assert.equal((await Product.findById(product._id)).stock, 4);
    assert.equal((await call(`/staff/orders/${deliveryOrder._id}`, staffToken, { method: 'PATCH', body: JSON.stringify({ status: 'preparing', message: 'Đang đóng gói.' }) })).status, 200);
    const unpaidShipping = await call(`/staff/orders/${deliveryOrder._id}`, staffToken, { method: 'PATCH', body: JSON.stringify({ status: 'shipping', shippingProvider: 'Xe công ty', message: 'Bắt đầu giao.' }) });
    assert.equal(unpaidShipping.status, 400);
    const shipping = await call(`/staff/orders/${deliveryOrder._id}`, staffToken, { method: 'PATCH', body: JSON.stringify({ status: 'shipping', paymentStatus: 'paid', shippingProvider: 'Xe công ty', trackingCode: 'DK-TEST', message: 'Đã bàn giao vận chuyển.' }) });
    assert.equal(shipping.status, 200);
    assert.equal((await shipping.json()).data.total, 280000);
    const delivered = await call(`/staff/orders/${deliveryOrder._id}`, staffToken, { method: 'PATCH', body: JSON.stringify({ status: 'delivered', message: 'Khách đã nhận đủ hàng.' }) });
    assert.equal(delivered.status, 200);
    assert.ok((await Order.findById(deliveryOrder._id)).deliveredAt);
  } finally {
    if (serviceRequest) {
      await Promise.all([Quotation.deleteMany({ request: serviceRequest._id }), RequestMessage.deleteMany({ request: serviceRequest._id })]);
      await ServiceRequest.deleteOne({ _id: serviceRequest._id });
    }
    if (lead) await Lead.deleteOne({ _id: lead._id });
    if (order) await Order.deleteOne({ _id: order._id });
    if (deliveryOrder) await Order.deleteOne({ _id: deliveryOrder._id });
    if (product) await Product.deleteOne({ _id: product._id });
    await User.deleteMany({ _id: { $in: users } });
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await mongoose.disconnect();
  }
});

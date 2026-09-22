const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'local_customer_integration_secret_longer_than_32_characters';

const app = require('../src/app');
const Cart = require('../src/models/Cart');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const RefreshSession = require('../src/models/RefreshSession');
const ServiceRequest = require('../src/models/ServiceRequest');
const User = require('../src/models/User');

const runIntegration = process.env.RUN_CUSTOMER_INTEGRATION === '1';

test('Customer quản lý hồ sơ, giỏ hàng, đơn hàng và yêu cầu riêng', { skip: !runIntegration }, async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}/api`;
  const suffix = String(Date.now()).slice(-8);
  const users = [];
  let product;

  const request = async (url, token, options = {}) => fetch(`${baseUrl}${url}`, {
    ...options,
    headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  const register = async (prefix, phone) => {
    const response = await request('/auth/register', '', { method: 'POST', body: JSON.stringify({ name: `Khách ${prefix}`, email: `customer-${prefix}-${Date.now()}@example.com`, phone, password: 'StrongPass123' }) });
    const body = await response.json();
    assert.equal(response.status, 201);
    users.push(body.data.user.id);
    return body.data;
  };

  try {
    const customer = await register('owner', `09${suffix}`);
    const other = await register('other', `08${suffix}`);
    product = await Product.create({ name: 'Sản phẩm kiểm thử Customer', slug: `customer-test-${Date.now()}`, sku: `CT-${Date.now()}`, category: 'Kiểm thử', price: 125000, unit: 'chiếc', stock: 20, active: true, image: 'https://example.com/test.jpg' });

    const profile = await request('/customer/profile', customer.accessToken, { method: 'PATCH', body: JSON.stringify({ name: 'Khách hàng kiểm thử', phone: `09${suffix}`, company: 'Công ty Kiểm thử', taxCode: '0101234567' }) });
    assert.equal(profile.status, 200);

    const addressResponse = await request('/customer/addresses', customer.accessToken, { method: 'POST', body: JSON.stringify({ label: 'Nhà máy', recipientName: 'Nguyễn Kiểm Thử', phone: `09${suffix}`, addressLine: 'Cụm 3, thôn Duyên Trường', ward: 'Duyên Thái', district: 'Thường Tín', province: 'Hà Nội', isDefault: true }) });
    const addressBody = await addressResponse.json();
    assert.equal(addressResponse.status, 201);
    const addressId = addressBody.data[0]._id;

    const addCart = await request('/customer/cart/items', customer.accessToken, { method: 'POST', body: JSON.stringify({ productId: product._id, quantity: 2 }) });
    assert.equal(addCart.status, 201);
    assert.equal((await addCart.json()).data.subtotal, 250000);

    const orderResponse = await request('/customer/orders', customer.accessToken, { method: 'POST', body: JSON.stringify({ addressId, paymentMethod: 'bank_transfer', customerNote: 'Xuất hóa đơn VAT' }) });
    const orderBody = await orderResponse.json();
    assert.equal(orderResponse.status, 201);
    assert.equal(orderBody.data.items[0].price, 125000);
    assert.equal(orderBody.data.total, 250000);

    const otherCannotReadOrder = await request(`/customer/orders/${orderBody.data._id}`, other.accessToken);
    assert.equal(otherCannotReadOrder.status, 404);
    const cancelOrder = await request(`/customer/orders/${orderBody.data._id}/cancel`, customer.accessToken, { method: 'PATCH', body: JSON.stringify({ reason: 'Kiểm thử hủy đơn' }) });
    assert.equal(cancelOrder.status, 200);

    const form = new FormData();
    form.append('requestType', 'machining'); form.append('title', 'Gia công chi tiết kiểm thử'); form.append('description', 'Cần gia công chi tiết theo đúng bản vẽ PDF đính kèm.'); form.append('material', 'Inox 304'); form.append('quantity', '10');
    form.append('attachments', new Blob(['%PDF-1.4 customer integration test'], { type: 'application/pdf' }), 'ban-ve-test.pdf');
    const createRequest = await request('/customer/requests', customer.accessToken, { method: 'POST', body: form });
    const createRequestBody = await createRequest.json();
    assert.equal(createRequest.status, 201);

    const listRequest = await request('/customer/requests', customer.accessToken);
    const listBody = await listRequest.json();
    const serviceRequest = listBody.data.find(item => item._id === createRequestBody.data.id);
    assert.equal(serviceRequest.attachments.length, 1);
    assert.equal(Object.hasOwn(serviceRequest.attachments[0], 'storedName'), false);

    const otherCannotDownload = await request(`/customer/requests/${serviceRequest._id}/attachments/${serviceRequest.attachments[0]._id}`, other.accessToken);
    assert.equal(otherCannotDownload.status, 404);
    const download = await request(`/customer/requests/${serviceRequest._id}/attachments/${serviceRequest.attachments[0]._id}`, customer.accessToken);
    assert.equal(download.status, 200);
    assert.match(await download.text(), /customer integration test/);

    const cancelRequest = await request(`/customer/requests/${serviceRequest._id}/cancel`, customer.accessToken, { method: 'PATCH' });
    assert.equal(cancelRequest.status, 200);
    const summary = await request('/customer/summary', customer.accessToken);
    const summaryBody = await summary.json();
    assert.equal(summary.status, 200);
    assert.equal(summaryBody.data.orders, 1);
    assert.equal(summaryBody.data.requests, 1);
    assert.equal(summaryBody.data.cartItems, 0);
  } finally {
    const storedRequests = await ServiceRequest.find({ customer: { $in: users } });
    for (const item of storedRequests) for (const attachment of item.attachments) {
      await fs.promises.unlink(path.join(__dirname, '..', 'storage', 'customer-requests', attachment.storedName)).catch(() => {});
    }
    await Promise.all([
      Cart.deleteMany({ customer: { $in: users } }), Order.deleteMany({ customer: { $in: users } }),
      ServiceRequest.deleteMany({ customer: { $in: users } }), RefreshSession.deleteMany({ user: { $in: users } }),
      User.deleteMany({ _id: { $in: users } }), product ? Product.deleteOne({ _id: product._id }) : Promise.resolve()
    ]);
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await mongoose.disconnect();
  }
});

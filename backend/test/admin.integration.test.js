const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'local_admin_integration_secret_longer_than_32_characters';

const app = require('../src/app');
const AuditLog = require('../src/models/AuditLog');
const Product = require('../src/models/Product');
const Project = require('../src/models/Project');
const RefreshSession = require('../src/models/RefreshSession');
const Service = require('../src/models/Service');
const User = require('../src/models/User');
const { createAccessToken } = require('../src/services/authService');
const { uniqueToken, uniqueVietnamesePhone } = require('../test-utils/uniqueTestData');

const runIntegration = process.env.RUN_ADMIN_INTEGRATION === '1';

test('Admin quản lý nhân sự, nội dung và nhật ký đúng quyền', { skip: !runIntegration }, async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const token = uniqueToken('admin-suite');
  const createdIds = { users: [], products: [], services: [], projects: [] };

  const call = (url, accessToken, options = {}) => fetch(`${baseUrl}${url}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, ...options.headers } });

  try {
    const passwordHash = await User.hashPassword('StrongPass123');
    const [admin, staff] = await User.create([
      { name: 'Admin Integration', email: `${token}-admin@example.com`, phone: uniqueVietnamesePhone('094'), passwordHash, role: 'admin' },
      { name: 'Staff Integration', email: `${token}-staff@example.com`, phone: uniqueVietnamesePhone('093'), passwordHash, role: 'staff' }
    ]);
    createdIds.users.push(admin._id, staff._id);
    const adminToken = createAccessToken(admin, new mongoose.Types.ObjectId());
    const staffToken = createAccessToken(staff, new mongoose.Types.ObjectId());

    assert.equal((await call('/admin/dashboard', staffToken)).status, 403);
    assert.equal((await call('/admin/dashboard', adminToken)).status, 200);
    assert.equal((await call('/staff/dashboard', adminToken)).status, 403);

    const createUserResponse = await call('/admin/users', adminToken, { method: 'POST', body: JSON.stringify({ name: 'Nhân viên mới', email: `${token}-new@example.com`, phone: uniqueVietnamesePhone('092'), password: 'Temporary123', role: 'staff', permissions: ['orders.manage', 'invalid.permission'] }) });
    const createUserBody = await createUserResponse.json();
    assert.equal(createUserResponse.status, 201);
    assert.deepEqual(createUserBody.data.permissions, []);
    createdIds.users.push(createUserBody.data._id);

    const blockUser = await call(`/admin/users/${createUserBody.data._id}`, adminToken, { method: 'PATCH', body: JSON.stringify({ status: 'blocked' }) });
    assert.equal(blockUser.status, 200);
    assert.equal((await User.findById(createUserBody.data._id)).status, 'blocked');
    const selfBlock = await call(`/admin/users/${admin._id}`, adminToken, { method: 'PATCH', body: JSON.stringify({ status: 'blocked' }) });
    assert.equal(selfBlock.status, 409);

    const productResponse = await call('/admin/products', adminToken, { method: 'POST', body: JSON.stringify({ name: 'Dao phay Admin Test', category: 'Dao cụ', sku: `${token}-SKU`, price: 250000, stock: 4, unit: 'chiếc', active: true }) });
    const productBody = await productResponse.json(); assert.equal(productResponse.status, 201); createdIds.products.push(productBody.data._id);
    const hideProduct = await call(`/admin/products/${productBody.data._id}`, adminToken, { method: 'DELETE' }); assert.equal(hideProduct.status, 200); assert.equal((await Product.findById(productBody.data._id)).active, false);

    const serviceResponse = await call('/admin/services', adminToken, { method: 'POST', body: JSON.stringify({ name: 'Gia công Admin Test', summary: 'Dịch vụ được tạo trong kiểm thử tích hợp.', published: true }) });
    const serviceBody = await serviceResponse.json(); assert.equal(serviceResponse.status, 201); createdIds.services.push(serviceBody.data._id);
    const projectResponse = await call('/admin/projects', adminToken, { method: 'POST', body: JSON.stringify({ title: 'Dự án Admin Test', category: 'Cơ khí chính xác', published: true }) });
    const projectBody = await projectResponse.json(); assert.equal(projectResponse.status, 201); createdIds.projects.push(projectBody.data._id);

    const logsResponse = await call('/admin/audit-logs', adminToken); const logsBody = await logsResponse.json();
    assert.equal(logsResponse.status, 200);
    assert.ok(logsBody.data.items.some(item => item.action === 'product.hidden'));
    assert.ok(logsBody.data.items.some(item => item.action === 'user.created'));
  } finally {
    await Promise.all([
      AuditLog.deleteMany({ actor: { $in: createdIds.users } }), RefreshSession.deleteMany({ user: { $in: createdIds.users } }),
      Product.deleteMany({ _id: { $in: createdIds.products } }), Service.deleteMany({ _id: { $in: createdIds.services } }), Project.deleteMany({ _id: { $in: createdIds.projects } }), User.deleteMany({ _id: { $in: createdIds.users } })
    ]);
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await mongoose.disconnect();
  }
});

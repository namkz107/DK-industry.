const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'local_integration_secret_longer_than_32_characters';

const app = require('../src/app');
const User = require('../src/models/User');
const RefreshSession = require('../src/models/RefreshSession');
const { uniqueToken, uniqueVietnamesePhone } = require('../test-utils/uniqueTestData');

const runIntegration = process.env.RUN_AUTH_INTEGRATION === '1';

test('luồng register → me → refresh → RBAC → logout', { skip: !runIntegration }, async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}/api`;
  const email = `${uniqueToken('auth')}@example.com`;
  const phone = uniqueVietnamesePhone('097');
  let userId;

  try {
    const register = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Kiểm thử Authentication', email, phone, password: 'StrongPass123', role: 'admin' })
    });
    const registerBody = await register.json();
    assert.equal(register.status, 201);
    assert.equal(registerBody.data.user.role, 'customer');
    assert.ok(registerBody.data.accessToken);
    userId = registerBody.data.user.id;
    let cookie = register.headers.get('set-cookie').split(';')[0];

    const me = await fetch(`${baseUrl}/auth/me`, { headers: { Authorization: `Bearer ${registerBody.data.accessToken}` } });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).data.user.email, email);

    const refresh = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', headers: { Cookie: cookie } });
    const refreshBody = await refresh.json();
    assert.equal(refresh.status, 200);
    assert.ok(refreshBody.data.accessToken);
    cookie = refresh.headers.get('set-cookie').split(';')[0];

    const customerForbidden = await fetch(`${baseUrl}/admin/dashboard`, { headers: { Authorization: `Bearer ${refreshBody.data.accessToken}` } });
    assert.equal(customerForbidden.status, 403);

    await User.updateOne({ _id: userId }, { role: 'staff' });
    const staffRefresh = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', headers: { Cookie: cookie } });
    const staffBody = await staffRefresh.json();
    assert.equal(staffBody.data.user.role, 'staff');
    cookie = staffRefresh.headers.get('set-cookie').split(';')[0];

    const staffDashboard = await fetch(`${baseUrl}/admin/dashboard`, { headers: { Authorization: `Bearer ${staffBody.data.accessToken}` } });
    assert.equal(staffDashboard.status, 200);
    const staffCannotCreateContent = await fetch(`${baseUrl}/admin/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffBody.data.accessToken}` },
      body: JSON.stringify({})
    });
    assert.equal(staffCannotCreateContent.status, 403);

    await User.updateOne({ _id: userId }, { role: 'admin' });
    const adminRefresh = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', headers: { Cookie: cookie } });
    const adminBody = await adminRefresh.json();
    assert.equal(adminBody.data.user.role, 'admin');
    cookie = adminRefresh.headers.get('set-cookie').split(';')[0];

    const adminDashboard = await fetch(`${baseUrl}/admin/dashboard`, { headers: { Authorization: `Bearer ${adminBody.data.accessToken}` } });
    assert.equal(adminDashboard.status, 200);

    const logout = await fetch(`${baseUrl}/auth/logout`, { method: 'POST', headers: { Cookie: cookie } });
    assert.equal(logout.status, 200);

    const afterLogout = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', headers: { Cookie: cookie } });
    assert.equal(afterLogout.status, 401);
  } finally {
    const user = userId ? await User.findById(userId) : await User.findOne({ email });
    if (user) {
      await RefreshSession.deleteMany({ user: user._id });
      await User.deleteOne({ _id: user._id });
    }
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await mongoose.disconnect();
  }
});

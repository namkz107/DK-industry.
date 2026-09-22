const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'local_lead_integration_secret_longer_than_32_characters';

const app = require('../src/app');
const Lead = require('../src/models/Lead');

const runIntegration = process.env.RUN_LEAD_INTEGRATION === '1';

test('Lead công khai có consent, mã hồ sơ, nguồn và chống gửi trùng', { skip: !runIntegration }, async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const phone = `07${String(Date.now()).slice(-8)}`;
  const payload = { name: 'Khách Lead Kiểm Thử', phone, email: 'lead-test@example.com', serviceType: 'Gia công cơ khí', budget: '10 - 50 triệu', message: 'Cần tư vấn gia công chi tiết theo bản vẽ.', sourceDetails: { landingPage: 'http://localhost:3000/dich-vu?utm_source=test', utmSource: 'integration-test' } };

  try {
    const noConsent = await fetch(`${baseUrl}/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    assert.equal(noConsent.status, 400);

    const first = await fetch(`${baseUrl}/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, consent: true }) });
    const firstBody = await first.json();
    assert.equal(first.status, 201);
    assert.match(firstBody.data.code, /^LD-/);
    assert.equal(firstBody.data.duplicate, false);

    const duplicate = await fetch(`${baseUrl}/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, consent: true }) });
    const duplicateBody = await duplicate.json();
    assert.equal(duplicate.status, 200);
    assert.equal(duplicateBody.data.id, firstBody.data.id);
    assert.equal(duplicateBody.data.duplicate, true);

    const stored = await Lead.findById(firstBody.data.id).lean();
    assert.equal(stored.phone, phone);
    assert.equal(stored.consent, true);
    assert.equal(stored.sourceDetails.utmSource, 'integration-test');
    assert.equal(stored.timeline[0].toStatus, 'new');
  } finally {
    await Lead.deleteMany({ phone });
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await mongoose.disconnect();
  }
});

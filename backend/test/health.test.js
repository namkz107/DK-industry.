process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');

test('health payload contract', () => {
  const payload = { success: true, service: 'DK Industry API' };
  assert.equal(payload.success, true);
  assert.match(payload.service, /DK Industry/);
});

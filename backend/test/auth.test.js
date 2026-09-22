const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'unit_test_secret_that_is_longer_than_32_characters';

const User = require('../src/models/User');
const { createAccessToken, verifyAccessToken, newRefreshToken, hashToken } = require('../src/services/authService');

test('access token giữ đúng danh tính và quyền trong 15 phút', () => {
  const user = {
    _id: '507f1f77bcf86cd799439011',
    role: 'staff',
    permissions: ['lead:update'],
    tokenVersion: 2
  };
  const sessionId = '507f1f77bcf86cd799439012';
  const payload = verifyAccessToken(createAccessToken(user, sessionId));

  assert.equal(payload.sub, user._id);
  assert.equal(payload.sid, sessionId);
  assert.equal(payload.role, 'staff');
  assert.equal(payload.tv, 2);
  assert.deepEqual(payload.permissions, ['lead:update']);
  assert.ok(payload.exp - payload.iat <= 15 * 60);
});

test('refresh token đủ ngẫu nhiên và chỉ lưu dạng hash', () => {
  const first = newRefreshToken();
  const second = newRefreshToken();

  assert.notEqual(first, second);
  assert.ok(first.length >= 80);
  assert.match(hashToken(first), /^[a-f0-9]{64}$/);
  assert.notEqual(hashToken(first), first);
});

test('mật khẩu được bcrypt hash và có thể xác thực', async () => {
  const hash = await User.hashPassword('StrongPass123');
  const user = new User({ passwordHash: hash });

  assert.notEqual(hash, 'StrongPass123');
  assert.equal(await user.verifyPassword('StrongPass123'), true);
  assert.equal(await user.verifyPassword('WrongPass123'), false);
});

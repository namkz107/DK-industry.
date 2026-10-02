const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const RefreshSession = require('../models/RefreshSession');

const REFRESH_DAYS = 7;

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw Object.assign(new Error('JWT_SECRET chưa được cấu hình'), { status: 503 });
  if (process.env.NODE_ENV === 'production' && secret.startsWith('replace_with_')) {
    throw Object.assign(new Error('JWT_SECRET production không hợp lệ'), { status: 503 });
  }
  return secret;
}

function createAccessToken(user, sessionId) {
  return jwt.sign(
    { role: user.role, permissions: user.permissions || [], sid: String(sessionId), tv: user.tokenVersion || 0 },
    jwtSecret(),
    { subject: String(user._id), expiresIn: '15m', issuer: 'dk-industry-api', audience: 'dk-industry-web' }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, jwtSecret(), { issuer: 'dk-industry-api', audience: 'dk-industry-web' });
}

function createSupportSocketToken(conversationId) {
  return jwt.sign({ purpose: 'support_guest', conversationId: String(conversationId) }, jwtSecret(), { expiresIn: '15m', issuer: 'dk-industry-api', audience: 'dk-industry-support' });
}

function verifySupportSocketToken(token) {
  const payload = jwt.verify(token, jwtSecret(), { issuer: 'dk-industry-api', audience: 'dk-industry-support' });
  if (payload.purpose !== 'support_guest' || !payload.conversationId) throw new Error('Phiên hỗ trợ không hợp lệ');
  return payload;
}

function newRefreshToken() {
  return crypto.randomBytes(64).toString('base64url');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshExpiry() {
  return new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);
}

async function createSession(user, req, persistent = false) {
  const refreshToken = newRefreshToken();
  const session = await RefreshSession.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiry(),
    persistent,
    userAgent: req.get('user-agent') || '',
    ip: req.ip
  });
  return { accessToken: createAccessToken(user, session._id), refreshToken, session };
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    role: user.role,
    permissions: user.permissions || [],
    company: user.company || '',
    status: user.status,
    emailVerified: Boolean(user.emailVerifiedAt)
  };
}

const cookieBaseOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/auth'
};

const refreshCookieOptions = persistent => persistent
  ? { ...cookieBaseOptions, maxAge: REFRESH_DAYS * 24 * 60 * 60 * 1000 }
  : { ...cookieBaseOptions };

module.exports = { createAccessToken, verifyAccessToken, createSupportSocketToken, verifySupportSocketToken, createSession, hashToken, newRefreshToken, refreshExpiry, publicUser, refreshCookieOptions, cookieBaseOptions };

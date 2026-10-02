const { Server } = require('socket.io');
const RefreshSession = require('../models/RefreshSession');
const RequestMessage = require('../models/RequestMessage');
const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');
const { verifyAccessToken } = require('../services/authService');
const { customerRoom, staffRoom, setChatNamespace, emitRequestEvent } = require('../services/realtimeService');
const { initializeSupportGateway } = require('./supportGateway');

const validRequestId = value => /^[a-f\d]{24}$/i.test(String(value || ''));

async function authenticatedUser(token) {
  const payload = verifyAccessToken(token);
  const user = await User.findById(payload.sub).select('+tokenVersion');
  if (!user || user.status !== 'active' || user.tokenVersion !== payload.tv) throw new Error('Phiên đăng nhập không còn hiệu lực');
  if ((process.env.NODE_ENV === 'production' || process.env.ENFORCE_SESSION_CHECK === 'true') && payload.sid) {
    const active = await RefreshSession.exists({ _id: payload.sid, user: user._id, revokedAt: null, expiresAt: { $gt: new Date() } });
    if (!active) throw new Error('Phiên đăng nhập đã bị thu hồi');
  }
  return { user, expiresAt: payload.exp * 1000 };
}

async function authorizedRequest(requestId, user) {
  if (!validRequestId(requestId)) return null;
  const filter = user.role === 'customer' ? { _id: requestId, customer: user._id } : { _id: requestId };
  return ServiceRequest.findOne(filter).select('_id customer assignedTo').lean();
}

function initializeChatGateway(httpServer) {
  const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000').split(',').map(value => value.trim());
  const io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
    connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000, skipMiddlewares: false }
  });
  const chat = io.of('/chat');
  setChatNamespace(chat);
  initializeSupportGateway(io);

  chat.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Vui lòng đăng nhập'));
      const authenticated = await authenticatedUser(token);
      socket.data.user = authenticated.user;
      socket.data.expiresAt = authenticated.expiresAt;
      next();
    } catch (error) {
      next(new Error(error.name === 'TokenExpiredError' ? 'Phiên đăng nhập đã hết hạn' : error.message || 'Không thể xác thực'));
    }
  });

  chat.on('connection', socket => {
    const expiryTimer = setTimeout(() => {
      socket.emit('auth:expired');
      socket.disconnect(true);
    }, Math.max(0, socket.data.expiresAt - Date.now()));
    expiryTimer.unref?.();
    socket.on('disconnect', () => clearTimeout(expiryTimer));
    if (socket.data.user.role !== 'customer') socket.join('operations');

    socket.on('request:join', async (requestId, acknowledge = () => {}) => {
      try {
        const request = await authorizedRequest(requestId, socket.data.user);
        if (!request) return acknowledge({ ok: false, message: 'Bạn không có quyền truy cập hội thoại này' });
        const room = socket.data.user.role === 'customer' ? customerRoom(requestId) : staffRoom(requestId);
        await socket.join(room);
        acknowledge({ ok: true });
      } catch {
        acknowledge({ ok: false, message: 'Không thể mở hội thoại' });
      }
    });

    socket.on('request:leave', requestId => {
      if (!validRequestId(requestId)) return;
      socket.leave(customerRoom(requestId));
      socket.leave(staffRoom(requestId));
    });

    socket.on('message:read', async (requestId, acknowledge = () => {}) => {
      try {
        const user = socket.data.user;
        const request = await authorizedRequest(requestId, user);
        if (!request) return acknowledge({ ok: false });
        const now = new Date();
        const isCustomer = user.role === 'customer';
        const filter = isCustomer
          ? { request: requestId, visibility: 'customer', senderRole: { $in: ['staff', 'admin', 'system'] }, readByCustomerAt: null }
          : { request: requestId, senderRole: 'customer', readByStaffAt: null };
        const update = isCustomer ? { readByCustomerAt: now } : { readByStaffAt: now };
        const result = await RequestMessage.updateMany(filter, update);
        if (result.modifiedCount) {
          emitRequestEvent(requestId, 'message:read', { requestId: String(requestId), readerRole: isCustomer ? 'customer' : 'staff', readAt: now.toISOString() });
        }
        acknowledge({ ok: true, readAt: now.toISOString() });
      } catch {
        acknowledge({ ok: false });
      }
    });

    for (const event of ['typing:start', 'typing:stop']) {
      socket.on(event, requestId => {
        if (!validRequestId(requestId)) return;
        const user = socket.data.user;
        const ownRoom = user.role === 'customer' ? customerRoom(requestId) : staffRoom(requestId);
        if (!socket.rooms.has(ownRoom)) return;
        const targetRoom = user.role === 'customer' ? staffRoom(requestId) : customerRoom(requestId);
        socket.to(targetRoom).emit(event, { requestId: String(requestId), role: user.role, name: user.name });
      });
    }
  });

  return io;
}

module.exports = { initializeChatGateway, authenticatedUser };

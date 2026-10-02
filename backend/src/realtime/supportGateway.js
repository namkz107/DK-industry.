const mongoose = require('mongoose');
const SupportConversation = require('../models/SupportConversation');
const SupportMessage = require('../models/SupportMessage');
const { verifySupportSocketToken } = require('../services/authService');
const { conversationRoom, setSupportNamespace } = require('../services/supportRealtimeService');

function initializeSupportGateway(io) {
  const support = io.of('/support');
  setSupportNamespace(support);

  support.use(async (socket, next) => {
    try {
      const { token, supportToken } = socket.handshake.auth || {};
      if (token) {
        const { authenticatedUser } = require('./chatGateway');
        const authenticated = await authenticatedUser(token);
        socket.data.user = authenticated.user;
        socket.data.expiresAt = authenticated.expiresAt;
      } else if (supportToken) {
        const payload = verifySupportSocketToken(supportToken);
        socket.data.guestConversationId = payload.conversationId;
        socket.data.expiresAt = payload.exp * 1000;
      } else throw new Error('Không tìm thấy phiên hỗ trợ');
      next();
    } catch (error) { next(new Error(error.message || 'Phiên hỗ trợ không hợp lệ')); }
  });

  support.on('connection', socket => {
    const timer = setTimeout(() => { socket.emit('auth:expired'); socket.disconnect(true); }, Math.max(0, socket.data.expiresAt - Date.now()));
    timer.unref?.();
    socket.on('disconnect', () => clearTimeout(timer));
    if (['staff', 'admin'].includes(socket.data.user?.role)) socket.join('support:staff');

    socket.on('support:join', async (conversationId, acknowledge = () => {}) => {
      try {
        if (!conversationId || !mongoose.isValidObjectId(conversationId)) return acknowledge({ ok: false });
        let allowed = false;
        if (socket.data.guestConversationId) allowed = socket.data.guestConversationId === String(conversationId);
        else if (socket.data.user?.role === 'customer') allowed = Boolean(await SupportConversation.exists({ _id: conversationId, customer: socket.data.user._id }));
        else if (['staff', 'admin'].includes(socket.data.user?.role)) allowed = Boolean(await SupportConversation.exists({ _id: conversationId }));
        if (!allowed) return acknowledge({ ok: false });
        await socket.join(conversationRoom(conversationId));
        acknowledge({ ok: true });
      } catch { acknowledge({ ok: false }); }
    });

    socket.on('support:read', async conversationId => {
      try {
        if (!conversationId || !mongoose.isValidObjectId(conversationId)) return;
        const user = socket.data.user;
        const isStaff = ['staff', 'admin'].includes(user?.role);
        const allowed = isStaff
          ? Boolean(await SupportConversation.exists({ _id: conversationId }))
          : socket.data.guestConversationId === String(conversationId)
            || (user?.role === 'customer' && await SupportConversation.exists({ _id: conversationId, customer: user._id }));
        if (!allowed) return;
        const roles = isStaff ? ['guest', 'customer'] : ['staff', 'admin', 'system'];
        const now = new Date();
        await Promise.all([
          SupportMessage.updateMany({ conversation: conversationId, senderRole: { $in: roles }, readAt: null }, { readAt: now }),
          SupportConversation.updateOne({ _id: conversationId }, isStaff ? { unreadByStaff: 0 } : { unreadByCustomer: 0 })
        ]);
        support.to(conversationRoom(conversationId)).emit('support:read', { conversationId: String(conversationId), reader: isStaff ? 'staff' : 'customer', readAt: now.toISOString() });
        if (isStaff) support.to('support:staff').emit('support:inbox', { conversationId: String(conversationId) });
      } catch {
        // A read receipt is best effort and must never terminate the socket process.
      }
    });
  });
}

module.exports = { initializeSupportGateway };

let namespace;

const conversationRoom = id => `support:${id}`;

function setSupportNamespace(value) { namespace = value; }

function emitSupportMessage(conversationId, message) {
  if (!namespace) return;
  const payload = { conversationId: String(conversationId), message: typeof message.toObject === 'function' ? message.toObject() : message };
  namespace.to(conversationRoom(conversationId)).emit('support:message', payload);
  namespace.to('support:staff').emit('support:inbox', { conversationId: String(conversationId) });
}

function emitSupportUpdated(conversationId) {
  if (!namespace) return;
  namespace.to(conversationRoom(conversationId)).emit('support:updated', { conversationId: String(conversationId) });
  namespace.to('support:staff').emit('support:inbox', { conversationId: String(conversationId) });
}

function emitSupportAiStatus(conversationId, status) {
  if (!namespace) return;
  namespace.to(conversationRoom(conversationId)).emit('support:ai-status', { conversationId: String(conversationId), status });
}

module.exports = { conversationRoom, setSupportNamespace, emitSupportMessage, emitSupportUpdated, emitSupportAiStatus };

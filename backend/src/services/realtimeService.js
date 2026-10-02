let chatNamespace;
const { publicMessage } = require('./chatMessageService');

const customerRoom = requestId => `request:${requestId}:customer`;
const staffRoom = requestId => `request:${requestId}:staff`;

function setChatNamespace(namespace) {
  chatNamespace = namespace;
}

function emitRequestEvent(requestId, event, payload, { visibility = 'customer' } = {}) {
  if (!chatNamespace) return;
  const id = String(requestId);
  chatNamespace.to(staffRoom(id)).emit(event, payload);
  if (visibility === 'customer') chatNamespace.to(customerRoom(id)).emit(event, payload);
}

function emitMessage(message) {
  const value = publicMessage(message);
  emitRequestEvent(value.request, 'message:new', { requestId: String(value.request), message: value }, { visibility: value.visibility });
}

function emitRequestUpdated(requestId, reason = 'updated', { visibility = 'customer' } = {}) {
  emitRequestEvent(requestId, 'request:updated', { requestId: String(requestId), reason }, { visibility });
  if (chatNamespace) chatNamespace.to('operations').emit('inbox:updated', { requestId: String(requestId), reason });
}

module.exports = {
  customerRoom,
  staffRoom,
  setChatNamespace,
  emitRequestEvent,
  emitMessage,
  emitRequestUpdated
};

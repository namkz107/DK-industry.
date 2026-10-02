const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const mongoose = require('mongoose');
const { io: createClient } = require('socket.io-client');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'local_chat_integration_secret_longer_than_32_characters';

const app = require('../src/app');
const Notification = require('../src/models/Notification');
const RequestMessage = require('../src/models/RequestMessage');
const ServiceRequest = require('../src/models/ServiceRequest');
const User = require('../src/models/User');
const { initializeChatGateway } = require('../src/realtime/chatGateway');
const { createAccessToken } = require('../src/services/authService');
const { uniqueToken, uniqueVietnamesePhone } = require('../test-utils/uniqueTestData');

const runIntegration = process.env.RUN_CHAT_INTEGRATION === '1';
const waitFor = (socket, event, timeout = 2000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeout);
  socket.once(event, value => { clearTimeout(timer); resolve(value); });
});
const join = (socket, requestId) => new Promise(resolve => socket.emit('request:join', String(requestId), resolve));

test('Socket chat xác thực room, realtime, idempotency và bảo vệ ghi chú nội bộ', { skip: !runIntegration }, async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const server = http.createServer(app);
  const io = initializeChatGateway(server);
  server.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const suffix = uniqueToken('chat');
  const passwordHash = await User.hashPassword('StrongPass123');
  const users = await User.create([
    { name: 'Khách Chat Test', email: `${suffix}-customer@example.com`, phone: uniqueVietnamesePhone('096'), passwordHash, role: 'customer' },
    { name: 'Khách Khác Chat Test', email: `${suffix}-other@example.com`, phone: uniqueVietnamesePhone('095'), passwordHash, role: 'customer' },
    { name: 'Nhân viên Chat Test', email: `${suffix}-staff@example.com`, phone: uniqueVietnamesePhone('094'), passwordHash, role: 'staff' }
  ]);
  const [customer, other, staff] = users;
  const request = await ServiceRequest.create({ code: `YC-${suffix}`, customer: customer._id, requestType: 'machining', title: 'Kiểm thử chat realtime', description: 'Nội dung kiểm thử chat realtime và phân quyền.', contact: { name: customer.name, email: customer.email }, timeline: [{ status: 'submitted', actorType: 'customer', actor: customer._id }] });
  const token = user => createAccessToken(user, new mongoose.Types.ObjectId());
  const customerSocket = createClient(`${origin}/chat`, { transports: ['websocket'], auth: { token: token(customer) } });
  const otherSocket = createClient(`${origin}/chat`, { transports: ['websocket'], auth: { token: token(other) } });
  const staffSocket = createClient(`${origin}/chat`, { transports: ['websocket'], auth: { token: token(staff) } });

  try {
    await Promise.all([waitFor(customerSocket, 'connect'), waitFor(otherSocket, 'connect'), waitFor(staffSocket, 'connect')]);
    assert.deepEqual(await join(customerSocket, request._id), { ok: true });
    assert.equal((await join(otherSocket, request._id)).ok, false);
    assert.deepEqual(await join(staffSocket, request._id), { ok: true });

    const clientMessageId = `message_${suffix}`;
    const realtimeMessage = waitFor(staffSocket, 'message:new');
    const send = await fetch(`${origin}/api/customer/requests/${request._id}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${token(customer)}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Tin nhắn realtime kiểm thử.', clientMessageId })
    });
    assert.equal(send.status, 201);
    const firstBody = await send.json();
    assert.equal((await realtimeMessage).message.clientMessageId, clientMessageId);

    const duplicate = await fetch(`${origin}/api/customer/requests/${request._id}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${token(customer)}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Tin nhắn realtime kiểm thử.', clientMessageId })
    });
    assert.equal(duplicate.status, 200);
    assert.equal((await duplicate.json()).data._id, firstBody.data._id);
    assert.equal(await RequestMessage.countDocuments({ request: request._id, clientMessageId }), 1);

    let leaked = false;
    customerSocket.once('message:new', () => { leaked = true; });
    const internal = await fetch(`${origin}/api/staff/requests/${request._id}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${token(staff)}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Ghi chú chỉ dành cho nội bộ.', visibility: 'internal', clientMessageId: `internal_${suffix}` })
    });
    assert.equal(internal.status, 201);
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(leaked, false);
  } finally {
    customerSocket.disconnect(); otherSocket.disconnect(); staffSocket.disconnect();
    await Promise.all([
      Notification.deleteMany({ recipient: { $in: users.map(user => user._id) } }),
      RequestMessage.deleteMany({ request: request._id }),
      ServiceRequest.deleteOne({ _id: request._id }),
      User.deleteMany({ _id: { $in: users.map(user => user._id) } })
    ]);
    await new Promise(resolve => io.close(resolve));
    await mongoose.disconnect();
  }
});

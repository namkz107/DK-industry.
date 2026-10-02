const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeClientMessageId, publicMessage } = require('../src/services/chatMessageService');

test('clientMessageId chỉ nhận định dạng an toàn để chống gửi trùng', () => {
  assert.equal(normalizeClientMessageId('msg_12345678'), 'msg_12345678');
  assert.equal(normalizeClientMessageId('550e8400-e29b-41d4-a716-446655440000'), '550e8400-e29b-41d4-a716-446655440000');
  assert.equal(normalizeClientMessageId('ngắn'), undefined);
  assert.equal(normalizeClientMessageId('unsafe value with spaces'), undefined);
});

test('payload realtime không làm lộ khóa lưu trữ nội bộ của tệp', () => {
  const message = publicMessage({
    _id: 'message-id',
    content: 'Bản vẽ',
    attachments: [{ _id: 'attachment-id', originalName: 'ban-ve.pdf', storedName: 'private-random-name.pdf', size: 100 }]
  });
  assert.equal(message.attachments[0].originalName, 'ban-ve.pdf');
  assert.equal(Object.hasOwn(message.attachments[0], 'storedName'), false);
});

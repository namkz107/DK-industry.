const mongoose = require('mongoose');
const RequestMessage = require('../models/RequestMessage');

function normalizeClientMessageId(value) {
  const id = String(value || '').trim();
  return /^[A-Za-z0-9:_-]{8,100}$/.test(id) ? id : undefined;
}

function publicMessage(message) {
  const value = typeof message.toObject === 'function' ? message.toObject() : { ...message };
  value.attachments = (value.attachments || []).map(attachment => {
    const file = typeof attachment.toObject === 'function' ? attachment.toObject() : { ...attachment };
    delete file.storedName;
    return file;
  });
  return value;
}

async function createIdempotentMessage(values, options = {}) {
  const clientMessageId = normalizeClientMessageId(values.clientMessageId);
  const lookup = clientMessageId && values.sender
    ? { request: values.request, sender: values.sender, clientMessageId }
    : null;
  if (lookup) {
    const existing = await RequestMessage.findOne(lookup).populate('sender', 'name role');
    if (existing) return { message: existing, duplicate: true };
  }
  try {
    const payload = { ...values, clientMessageId };
    const created = options.session
      ? (await RequestMessage.create([payload], { session: options.session }))[0]
      : await RequestMessage.create(payload);
    return { message: created, duplicate: false };
  } catch (error) {
    if (error?.code !== 11000 || !lookup) throw error;
    const existing = await RequestMessage.findOne(lookup).populate('sender', 'name role');
    if (!existing) throw error;
    return { message: existing, duplicate: true };
  }
}

async function messagePage(filter, { before, limit = 50, populateSender = false } = {}) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const queryFilter = { ...filter };
  if (before && mongoose.isValidObjectId(before)) queryFilter._id = { $lt: before };
  let query = RequestMessage.find(queryFilter).sort({ _id: -1 }).limit(safeLimit + 1);
  if (populateSender) query = query.populate('sender', 'name role');
  const values = await query.lean();
  const hasMore = values.length > safeLimit;
  const items = values.slice(0, safeLimit).reverse().map(publicMessage);
  return { items, hasMore, nextCursor: hasMore ? String(items[0]._id) : null };
}

module.exports = { normalizeClientMessageId, publicMessage, createIdempotentMessage, messagePage };

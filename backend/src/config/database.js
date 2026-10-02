const mongoose = require('mongoose');

async function connectDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dk_industry';
  await mongoose.connect(uri);
  const Order = require('../models/Order');
  const indexes = await Order.collection.indexes();
  const legacy = indexes.find(index => index.name === 'customer_1_idempotencyKey_1');
  if (legacy) await Order.collection.dropIndex(legacy.name);
  await Order.createIndexes();
  const RequestMessage = require('../models/RequestMessage');
  await RequestMessage.createIndexes();
  const SupportMessage = require('../models/SupportMessage');
  await SupportMessage.createIndexes();
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
}

module.exports = connectDatabase;

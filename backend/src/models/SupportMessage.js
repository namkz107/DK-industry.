const mongoose = require('mongoose');

const supportMessageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportConversation', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  senderRole: { type: String, enum: ['guest', 'customer', 'staff', 'admin', 'system'], required: true },
  clientMessageId: { type: String, trim: true, maxlength: 100 },
  content: { type: String, required: true, trim: true, maxlength: 3000 },
  readAt: Date
}, { timestamps: true });

supportMessageSchema.index({ conversation: 1, createdAt: -1 });
supportMessageSchema.index(
  { conversation: 1, senderRole: 1, clientMessageId: 1 },
  { unique: true, partialFilterExpression: { clientMessageId: { $type: 'string' } } }
);

module.exports = mongoose.model('SupportMessage', supportMessageSchema);

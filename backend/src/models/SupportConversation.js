const mongoose = require('mongoose');

const supportConversationSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  guestTokenHash: { type: String, select: false, unique: true, sparse: true },
  guestTokenExpiresAt: Date,
  contact: {
    name: { type: String, trim: true, maxlength: 100 },
    phone: { type: String, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 200 }
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
  lastMessageAt: { type: Date, default: Date.now, index: true },
  lastMessagePreview: { type: String, trim: true, maxlength: 200 },
  unreadByCustomer: { type: Number, default: 0, min: 0 },
  unreadByStaff: { type: Number, default: 0, min: 0 },
  closedAt: Date
}, { timestamps: true });

supportConversationSchema.index({ status: 1, lastMessageAt: -1 });

module.exports = mongoose.model('SupportConversation', supportConversationSchema);

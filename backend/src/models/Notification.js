const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true, trim: true, maxlength: 100, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  message: { type: String, required: true, trim: true, maxlength: 1000 },
  link: { type: String, trim: true, maxlength: 500 },
  readAt: Date,
  email: {
    address: { type: String, trim: true, lowercase: true },
    status: { type: String, enum: ['not_requested', 'pending', 'sent', 'failed'], default: 'not_requested' },
    sentAt: Date,
    error: { type: String, maxlength: 500 }
  },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);

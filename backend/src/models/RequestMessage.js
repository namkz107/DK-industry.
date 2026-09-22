const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  storedName: { type: String, required: true, select: false },
  mimeType: String,
  size: Number
}, { _id: true });

const requestMessageSchema = new mongoose.Schema({
  request: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  senderRole: { type: String, enum: ['customer', 'staff', 'admin', 'system'], required: true },
  visibility: { type: String, enum: ['customer', 'internal'], default: 'customer', index: true },
  content: { type: String, required: true, trim: true, maxlength: 3000 },
  attachments: [attachmentSchema],
  readByCustomerAt: Date,
  readByStaffAt: Date
}, { timestamps: true });

requestMessageSchema.index({ request: 1, visibility: 1, createdAt: 1 });

module.exports = mongoose.model('RequestMessage', requestMessageSchema);

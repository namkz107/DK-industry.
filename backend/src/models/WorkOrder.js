const mongoose = require('mongoose');
const crypto = require('crypto');

const milestoneSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  dueAt: Date,
  completedAt: Date,
  note: { type: String, trim: true, maxlength: 1000 }
}, { _id: true });

const workOrderSchema = new mongoose.Schema({
  code: { type: String, unique: true, default: () => `CV-${new Date().toISOString().slice(2, 10).replaceAll('-', '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}` },
  request: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', required: true, unique: true },
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  status: { type: String, enum: ['awaiting_contract', 'awaiting_deposit', 'scheduled', 'in_progress', 'quality_check', 'ready_for_delivery', 'completed', 'cancelled'], default: 'awaiting_contract', index: true },
  contractReference: { type: String, trim: true, maxlength: 200 },
  purchaseOrderReference: { type: String, trim: true, maxlength: 200 },
  agreedTotal: { type: Number, required: true, min: 0 },
  depositRequired: { type: Number, default: 0, min: 0 },
  depositPaid: { type: Number, default: 0, min: 0 },
  plannedStartAt: Date,
  plannedDeliveryAt: Date,
  milestones: { type: [milestoneSchema], default: [] },
  timeline: [{ status: String, message: String, actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, actorType: { type: String, enum: ['customer', 'staff', 'system'], default: 'system' }, at: { type: Date, default: Date.now } }]
}, { timestamps: true });

workOrderSchema.index({ customer: 1, createdAt: -1 });
workOrderSchema.index({ status: 1, assignedTo: 1, createdAt: -1 });

module.exports = mongoose.model('WorkOrder', workOrderSchema);

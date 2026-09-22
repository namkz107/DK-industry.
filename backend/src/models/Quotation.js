const mongoose = require('mongoose');
const crypto = require('crypto');

const quotationSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, default: () => `BG-${new Date().toISOString().slice(2, 10).replaceAll('-', '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}` },
  request: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', required: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  version: { type: Number, required: true, min: 1 },
  items: [{
    description: { type: String, required: true, trim: true, maxlength: 500 },
    quantity: { type: Number, required: true, min: 0.01 },
    unit: { type: String, required: true, trim: true, maxlength: 50 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 }
  }],
  subtotal: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, min: 0, max: 100, default: 0 },
  taxAmount: { type: Number, min: 0, default: 0 },
  total: { type: Number, required: true, min: 0 },
  currency: { type: String, enum: ['VND'], default: 'VND' },
  leadTime: { type: String, trim: true, maxlength: 300 },
  paymentTerms: { type: String, trim: true, maxlength: 1000 },
  notes: { type: String, trim: true, maxlength: 2000 },
  validUntil: { type: Date, required: true },
  status: { type: String, enum: ['draft', 'sent', 'accepted', 'rejected', 'superseded', 'expired'], default: 'draft', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sentAt: Date,
  respondedAt: Date,
  responseNote: { type: String, trim: true, maxlength: 1000 }
}, { timestamps: true });

quotationSchema.index({ request: 1, version: 1 }, { unique: true });
quotationSchema.index({ customer: 1, createdAt: -1 });

quotationSchema.pre('validate', function calculateTotals() {
  this.items.forEach(item => { item.lineTotal = Math.round(item.quantity * item.unitPrice); });
  this.subtotal = this.items.reduce((sum, item) => sum + item.lineTotal, 0);
  this.taxAmount = Math.round(this.subtotal * (this.taxRate || 0) / 100);
  this.total = this.subtotal + this.taxAmount;
});

module.exports = mongoose.model('Quotation', quotationSchema);

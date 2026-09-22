const mongoose = require('mongoose');

const serviceRequestSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  requestType: { type: String, enum: ['machining', 'product_quote', 'consulting'], required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  material: { type: String, trim: true, maxlength: 200 },
  quantity: { type: Number, min: 1, max: 1000000 },
  dimensions: { type: String, trim: true, maxlength: 300 },
  desiredDate: Date,
  budget: { type: String, trim: true, maxlength: 100 },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productSnapshot: { name: String, sku: String, unit: String },
  contact: { name: String, phone: String, email: String, company: String },
  source: { type: String, enum: ['customer_portal', 'lead_conversion', 'staff_created'], default: 'customer_portal', index: true },
  sourceLead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal', index: true },
  internalSummary: { type: String, trim: true, maxlength: 3000, select: false },
  attachments: [{
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: String,
    size: Number
  }],
  status: { type: String, enum: ['submitted', 'reviewing', 'need_more_info', 'quoted', 'accepted', 'rejected', 'cancelled'], default: 'submitted', index: true },
  timeline: [{ status: String, message: String, actorType: { type: String, enum: ['customer', 'staff', 'system'], default: 'system' }, actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: { type: Date, default: Date.now } }],
  lastCustomerMessageAt: Date,
  lastStaffMessageAt: Date,
  closedAt: Date
}, { timestamps: true });

serviceRequestSchema.index({ customer: 1, createdAt: -1 });
serviceRequestSchema.index({ status: 1, priority: -1, createdAt: -1 });

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);

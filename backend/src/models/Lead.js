const mongoose = require('mongoose');
const crypto = require('crypto');

const leadSchema = new mongoose.Schema({
  code: { type: String, unique: true, default: () => `LD-${new Date().toISOString().slice(2, 10).replaceAll('-', '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}` },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true, index: true },
  email: { type: String, trim: true, lowercase: true },
  serviceType: { type: String, trim: true },
  budget: { type: String, trim: true },
  message: { type: String, trim: true, maxlength: 3000 },
  products: [{ product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, name: String, quantity: { type: Number, default: 1 } }],
  source: { type: String, default: 'website', index: true },
  sourceDetails: { landingPage: String, referrer: String, utmSource: String, utmMedium: String, utmCampaign: String },
  consent: { type: Boolean, default: false },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal', index: true },
  status: { type: String, enum: ['new', 'qualified', 'contacted', 'needs_analysis', 'quoted', 'won', 'lost', 'spam'], default: 'new', index: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  nextFollowUpAt: Date,
  lastContactAt: Date,
  lostReason: { type: String, trim: true, maxlength: 500 },
  tags: [{ type: String, trim: true, maxlength: 50 }],
  convertedCustomer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  convertedRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest' },
  notes: [{ content: { type: String, maxlength: 2000 }, author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, createdAt: { type: Date, default: Date.now } }],
  timeline: [{ action: String, fromStatus: String, toStatus: String, message: String, actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: { type: Date, default: Date.now } }]
}, { timestamps: true });

leadSchema.index({ status: 1, priority: -1, createdAt: -1 });
leadSchema.index({ phone: 1, createdAt: -1 });

module.exports = mongoose.model('Lead', leadSchema);

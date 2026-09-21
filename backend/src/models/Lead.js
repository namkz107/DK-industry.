const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true, index: true },
  email: { type: String, trim: true, lowercase: true },
  serviceType: { type: String, trim: true },
  budget: { type: String, trim: true },
  message: { type: String, trim: true, maxlength: 3000 },
  products: [{ product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, name: String, quantity: { type: Number, default: 1 } }],
  source: { type: String, default: 'website' },
  status: { type: String, enum: ['new', 'contacted', 'quoted', 'won', 'lost'], default: 'new', index: true },
  notes: [{ content: String, createdAt: { type: Date, default: Date.now } }]
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);

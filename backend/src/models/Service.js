const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  summary: { type: String, required: true, maxlength: 500 },
  description: { type: String, maxlength: 5000 },
  capabilities: [{ type: String, trim: true }],
  materials: [{ type: String, trim: true }],
  applications: [{ type: String, trim: true }],
  image: String,
  order: { type: Number, default: 0 },
  featured: { type: Boolean, default: false },
  published: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);

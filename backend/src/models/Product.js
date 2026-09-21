const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  sku: { type: String, unique: true, sparse: true },
  category: { type: String, required: true, index: true },
  description: String,
  specifications: { type: Map, of: String },
  price: { type: Number, min: 0, default: null },
  unit: { type: String, default: 'sản phẩm' },
  stock: { type: Number, min: 0, default: 0 },
  priceOnRequest: { type: Boolean, default: false },
  image: String,
  images: [String],
  featured: { type: Boolean, default: false },
  active: { type: Boolean, default: true }
}, { timestamps: true });

productSchema.index({ name: 'text', description: 'text', category: 'text' });

module.exports = mongoose.model('Product', productSchema);

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    sku: String,
    image: String,
    unit: String,
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 }
  }],
  shippingAddress: {
    recipientName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine: { type: String, required: true },
    ward: String,
    district: { type: String, required: true },
    province: { type: String, required: true }
  },
  subtotal: { type: Number, required: true, min: 0 },
  shippingFee: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, enum: ['cod', 'bank_transfer'], default: 'cod' },
  paymentStatus: { type: String, enum: ['unpaid', 'pending', 'paid', 'refunded'], default: 'unpaid', index: true },
  status: { type: String, enum: ['pending', 'confirmed', 'preparing', 'shipping', 'delivered', 'cancelled'], default: 'pending', index: true },
  customerNote: { type: String, trim: true, maxlength: 1000 },
  timeline: [{
    status: { type: String, required: true },
    message: String,
    at: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

orderSchema.index({ customer: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);

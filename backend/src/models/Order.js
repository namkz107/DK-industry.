const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  idempotencyKey: { type: String, trim: true, maxlength: 100 },
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
    province: { type: String, required: true },
    formattedAddress: String,
    placeId: String,
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    accuracyMeters: { type: Number, min: 0 },
    locationConfirmed: { type: Boolean, default: false }
  },
  subtotal: { type: Number, required: true, min: 0 },
  shippingFee: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  amountPaid: { type: Number, default: 0, min: 0 },
  paymentMethod: { type: String, enum: ['cod', 'bank_transfer'], default: 'cod' },
  // Legacy orders may not contain these fields; the checkout endpoint requires them for every new order.
  termsAcceptedAt: Date,
  termsVersion: { type: String, trim: true, maxlength: 30 },
  paymentStatus: { type: String, enum: ['unpaid', 'pending', 'paid', 'refund_pending', 'refunded'], default: 'unpaid', index: true },
  status: { type: String, enum: ['pending', 'confirmed', 'preparing', 'shipping', 'delivered', 'cancelled'], default: 'pending', index: true },
  customerNote: { type: String, trim: true, maxlength: 1000 },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  internalNote: { type: String, trim: true, maxlength: 3000, select: false },
  stockCommittedAt: Date,
  stockReleasedAt: Date,
  confirmedAt: Date,
  preparingAt: Date,
  shippedAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  paidAt: Date,
  paymentReference: { type: String, trim: true, maxlength: 200 },
  paymentLockedAt: Date,
  refundedAt: Date,
  cancellationReason: { type: String, trim: true, maxlength: 1000 },
  afterSalesRequests: [{
    type: { type: String, enum: ['return', 'warranty', 'complaint'], required: true },
    reason: { type: String, required: true, trim: true, maxlength: 3000 },
    status: { type: String, enum: ['submitted', 'reviewing', 'approved', 'rejected', 'received', 'resolved'], default: 'submitted' },
    resolution: { type: String, trim: true, maxlength: 3000 },
    submittedAt: { type: Date, default: Date.now },
    resolvedAt: Date,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  shippingProvider: { type: String, trim: true, maxlength: 150 },
  trackingCode: { type: String, trim: true, maxlength: 150 },
  estimatedDeliveryAt: Date,
  paymentTimeline: [{
    status: { type: String, enum: ['unpaid', 'pending', 'paid', 'refund_pending', 'refunded'], required: true },
    message: String,
    amount: { type: Number, min: 0 },
    reference: { type: String, trim: true, maxlength: 200 },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now }
  }],
  timeline: [{
    status: { type: String, required: true },
    message: String,
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorType: { type: String, enum: ['customer', 'staff', 'system'], default: 'system' },
    at: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index(
  { customer: 1, idempotencyKey: 1 },
  { unique: true, name: 'customer_idempotency_unique_v2', partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);
orderSchema.index({ status: 1, assignedTo: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);

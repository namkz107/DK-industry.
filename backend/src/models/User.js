const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  label: { type: String, trim: true, maxlength: 50, default: 'Địa chỉ giao hàng' },
  recipientName: { type: String, required: true, trim: true, maxlength: 100 },
  phone: { type: String, required: true, trim: true, maxlength: 20 },
  addressLine: { type: String, required: true, trim: true, maxlength: 250 },
  ward: { type: String, trim: true, maxlength: 100 },
  district: { type: String, required: true, trim: true, maxlength: 100 },
  province: { type: String, required: true, trim: true, maxlength: 100 },
  isDefault: { type: Boolean, default: false }
}, { _id: true, timestamps: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, unique: true, sparse: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['customer', 'staff', 'admin'], default: 'customer', index: true },
  permissions: [{ type: String, trim: true }],
  status: { type: String, enum: ['active', 'blocked'], default: 'active', index: true },
  company: { type: String, trim: true, maxlength: 200 },
  taxCode: { type: String, trim: true, maxlength: 30 },
  addresses: { type: [addressSchema], default: [] },
  tokenVersion: { type: Number, default: 0, select: false },
  lastLoginAt: Date
}, { timestamps: true });

userSchema.methods.verifyPassword = function verifyPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.statics.hashPassword = function hashPassword(password) {
  return bcrypt.hash(password, 12);
};

module.exports = mongoose.model('User', userSchema);

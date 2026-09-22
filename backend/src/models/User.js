const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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

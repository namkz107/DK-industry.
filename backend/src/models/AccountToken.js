const mongoose = require('mongoose');

const accountTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['password_reset', 'email_verification'], required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  usedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('AccountToken', accountTokenSchema);

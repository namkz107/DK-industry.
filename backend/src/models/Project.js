const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  category: { type: String, required: true, index: true },
  client: String,
  location: String,
  year: String,
  description: String,
  challenge: String,
  solution: String,
  image: String,
  gallery: [String],
  featured: { type: Boolean, default: false },
  published: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);

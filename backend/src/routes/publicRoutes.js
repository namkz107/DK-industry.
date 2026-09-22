const express = require('express');
const Lead = require('../models/Lead');
const Product = require('../models/Product');
const Project = require('../models/Project');
const Service = require('../models/Service');

const router = express.Router();
const parseBoolean = value => value === undefined ? undefined : value === 'true';

router.get('/health', (req, res) => res.json({ success: true, service: 'DK Industry API', timestamp: new Date() }));

router.get('/projects', async (req, res, next) => {
  try {
    const query = { published: true };
    if (req.query.featured !== undefined) query.featured = parseBoolean(req.query.featured);
    if (req.query.category) query.category = req.query.category;
    const data = await Project.find(query).sort({ year: -1, createdAt: -1 }).limit(Math.min(Number(req.query.limit) || 20, 100));
    res.json({ success: true, count: data.length, data });
  } catch (error) { next(error); }
});

router.get('/products', async (req, res, next) => {
  try {
    const query = { active: true };
    if (req.query.featured !== undefined) query.featured = parseBoolean(req.query.featured);
    if (req.query.category) query.category = req.query.category;
    if (req.query.search) query.$text = { $search: req.query.search };
    const data = await Product.find(query).sort({ featured: -1, createdAt: -1 }).limit(Math.min(Number(req.query.limit) || 20, 100));
    res.json({ success: true, count: data.length, data });
  } catch (error) { next(error); }
});

router.get('/services', async (req, res, next) => {
  try {
    const query = { published: true };
    if (req.query.featured !== undefined) query.featured = parseBoolean(req.query.featured);
    const data = await Service.find(query).sort({ order: 1, createdAt: -1 });
    res.json({ success: true, count: data.length, data });
  } catch (error) { next(error); }
});

router.post('/leads', async (req, res, next) => {
  try {
    const { name, phone, email, serviceType, budget, message, products } = req.body;
    if (!name?.trim() || !phone?.trim()) return res.status(400).json({ success: false, message: 'Họ tên và số điện thoại là bắt buộc' });
    const lead = await Lead.create({ name, phone, email, serviceType, budget, message, products });
    res.status(201).json({ success: true, message: 'Yêu cầu đã được tiếp nhận', data: { id: lead._id, status: lead.status } });
  } catch (error) { next(error); }
});

module.exports = router;

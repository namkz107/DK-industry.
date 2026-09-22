const express = require('express');
const Product = require('../models/Product');
const Project = require('../models/Project');
const Service = require('../models/Service');
const { createPublicLead } = require('../services/leadService');

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
    const { lead, duplicate } = await createPublicLead(req.body, req.body.sourceDetails || {});
    res.status(duplicate ? 200 : 201).json({ success: true, message: duplicate ? 'Yêu cầu này đã được tiếp nhận trước đó' : 'Yêu cầu đã được tiếp nhận', data: { id: lead._id, code: lead.code, status: lead.status, duplicate } });
  } catch (error) { next(error); }
});

module.exports = router;

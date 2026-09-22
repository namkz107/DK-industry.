const express = require('express');
const Lead = require('../models/Lead');
const Product = require('../models/Product');
const Project = require('../models/Project');
const Service = require('../models/Service');

const router = express.Router();

router.get('/dashboard', async (req, res, next) => {
  try {
    const [leads, newLeads, products, projects, pipeline] = await Promise.all([
      Lead.countDocuments(), Lead.countDocuments({ status: 'new' }), Product.countDocuments({ active: true }), Project.countDocuments({ published: true }),
      Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
    ]);
    res.json({ success: true, data: { leads, newLeads, products, projects, pipeline } });
  } catch (error) { next(error); }
});

router.get('/leads', async (req, res, next) => {
  try { res.json({ success: true, data: await Lead.find().sort({ createdAt: -1 }).limit(100) }); } catch (error) { next(error); }
});

router.patch('/leads/:id', async (req, res, next) => {
  try {
    const allowed = ['status', 'notes'];
    const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const data = await Lead.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!data) return res.status(404).json({ success: false, message: 'Không tìm thấy khách hàng' });
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

for (const [path, Model] of [['products', Product], ['projects', Project], ['services', Service]]) {
  router.post(`/${path}`, async (req, res, next) => { try { res.status(201).json({ success: true, data: await Model.create(req.body) }); } catch (error) { next(error); } });
  router.patch(`/${path}/:id`, async (req, res, next) => { try { res.json({ success: true, data: await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }) }); } catch (error) { next(error); } });
  router.delete(`/${path}/:id`, async (req, res, next) => { try { await Model.findByIdAndDelete(req.params.id); res.status(204).end(); } catch (error) { next(error); } });
}

module.exports = router;

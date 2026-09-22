const Lead = require('../models/Lead');
const Product = require('../models/Product');
const mongoose = require('mongoose');

const phonePattern = /^(?:\+84|0)[0-9]{9,10}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (value, max = 1000) => String(value || '').trim().slice(0, max);
const normalizePhone = value => clean(value, 30).replace(/[\s.-]/g, '');

async function createPublicLead(payload = {}, source = {}) {
  const name = clean(payload.name, 100);
  const phone = normalizePhone(payload.phone);
  const email = clean(payload.email, 200).toLowerCase();
  const serviceType = clean(payload.serviceType, 150);
  const budget = clean(payload.budget, 100);
  const message = clean(payload.message, 3000);
  if (name.length < 2) throw Object.assign(new Error('Vui lòng nhập họ tên hợp lệ'), { status: 400 });
  if (!phonePattern.test(phone)) throw Object.assign(new Error('Số điện thoại Việt Nam không hợp lệ'), { status: 400 });
  if (email && !emailPattern.test(email)) throw Object.assign(new Error('Email không hợp lệ'), { status: 400 });
  if (!serviceType) throw Object.assign(new Error('Vui lòng chọn nhu cầu cần hỗ trợ'), { status: 400 });
  if (payload.consent !== true) throw Object.assign(new Error('Bạn cần đồng ý để chúng tôi liên hệ xử lý yêu cầu'), { status: 400 });

  const duplicateSince = new Date(Date.now() - 10 * 60 * 1000);
  const duplicate = await Lead.findOne({ phone, serviceType, message, createdAt: { $gte: duplicateSince }, status: { $ne: 'spam' } });
  if (duplicate) return { lead: duplicate, duplicate: true };

  const productIds = Array.isArray(payload.products) ? payload.products.map(item => item?.product).filter(mongoose.isValidObjectId).slice(0, 20) : [];
  const products = productIds.length ? await Product.find({ _id: { $in: productIds }, active: true }).select('name').lean() : [];
  const productMap = new Map(products.map(product => [String(product._id), product]));
  const productSnapshots = (payload.products || []).slice(0, 20).flatMap(item => {
    const product = productMap.get(String(item?.product));
    if (!product) return [];
    return [{ product: product._id, name: product.name, quantity: Math.max(1, Math.min(Number(item.quantity) || 1, 100000)) }];
  });
  const sourceDetails = {
    landingPage: clean(source.landingPage, 500), referrer: clean(source.referrer, 500),
    utmSource: clean(source.utmSource, 100), utmMedium: clean(source.utmMedium, 100), utmCampaign: clean(source.utmCampaign, 150)
  };
  const lead = await Lead.create({
    name, phone, email: email || undefined, serviceType, budget, message, products: productSnapshots,
    source: 'website', sourceDetails, consent: true,
    timeline: [{ action: 'created', toStatus: 'new', message: 'Khách gửi yêu cầu từ website.' }]
  });
  return { lead, duplicate: false };
}

module.exports = { createPublicLead };

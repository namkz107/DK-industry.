const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Quotation = require('../models/Quotation');
const RequestMessage = require('../models/RequestMessage');
const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');
const { transitionLead, transitionOrder, transitionServiceRequest } = require('../services/workflowService');

const router = express.Router();
const uploadDirectory = path.join(__dirname, '..', '..', 'storage', 'customer-requests');
const leadStatuses = new Set(['new', 'qualified', 'contacted', 'needs_analysis', 'quoted', 'won', 'lost', 'spam']);
const requestStatuses = new Set(['submitted', 'reviewing', 'need_more_info', 'quoted', 'accepted', 'rejected', 'cancelled']);
const orderStatuses = new Set(['pending', 'confirmed', 'preparing', 'shipping', 'delivered', 'cancelled']);
const paymentStatuses = new Set(['unpaid', 'pending', 'paid', 'refunded']);
const priorities = new Set(['low', 'normal', 'high', 'urgent']);
const validId = value => mongoose.isValidObjectId(value);
const clean = (value, max = 3000) => String(value || '').trim().slice(0, max);
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const pageValues = query => ({ page: Math.max(1, Number(query.page) || 1), limit: Math.min(50, Math.max(1, Number(query.limit) || 20)) });

function assignmentFilter(query, user) {
  if (query.assigned === 'mine') return user._id;
  if (query.assigned === 'unassigned') return null;
  return undefined;
}

async function assignUser(value, actor) {
  if (!value || value === 'me') return actor._id;
  if (value === 'unassigned') return null;
  if (actor.role !== 'admin') fail('Nhân viên chỉ có thể nhận hoặc bỏ nhận hồ sơ của chính mình', 403);
  if (!validId(value)) fail('Nhân viên phụ trách không hợp lệ');
  const user = await User.findOne({ _id: value, role: { $in: ['staff', 'admin'] }, status: 'active' });
  if (!user) fail('Không tìm thấy nhân viên đang hoạt động', 404);
  return user._id;
}

router.get('/dashboard', async (req, res, next) => {
  try {
    const [newLeads, myLeads, openRequests, myRequests, unreadCustomers, urgent, pendingOrders, myOrders] = await Promise.all([
      Lead.countDocuments({ status: 'new' }),
      Lead.countDocuments({ assignedTo: req.user._id, status: { $nin: ['won', 'lost', 'spam'] } }),
      ServiceRequest.countDocuments({ status: { $nin: ['accepted', 'rejected', 'cancelled'] } }),
      ServiceRequest.countDocuments({ assignedTo: req.user._id, status: { $nin: ['accepted', 'rejected', 'cancelled'] } }),
      RequestMessage.countDocuments({ senderRole: 'customer', readByStaffAt: null }),
      ServiceRequest.countDocuments({ priority: 'urgent', status: { $nin: ['accepted', 'rejected', 'cancelled'] } }),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ assignedTo: req.user._id, status: { $nin: ['delivered', 'cancelled'] } })
    ]);
    res.json({ success: true, data: { newLeads, myLeads, openRequests, myRequests, unreadCustomers, urgent, pendingOrders, myOrders } });
  } catch (error) { next(error); }
});

router.get('/members', async (req, res, next) => {
  try {
    const data = await User.find({ role: { $in: ['staff', 'admin'] }, status: 'active' }).select('name email role').sort({ name: 1 }).lean();
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

router.get('/leads', async (req, res, next) => {
  try {
    const { page, limit } = pageValues(req.query);
    const filter = {};
    if (leadStatuses.has(req.query.status)) filter.status = req.query.status;
    if (priorities.has(req.query.priority)) filter.priority = req.query.priority;
    const assignedTo = assignmentFilter(req.query, req.user);
    if (assignedTo !== undefined) filter.assignedTo = assignedTo;
    const q = clean(req.query.q, 100);
    if (q) filter.$or = [{ code: { $regex: q, $options: 'i' } }, { name: { $regex: q, $options: 'i' } }, { phone: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }];
    const [items, total] = await Promise.all([
      Lead.find(filter).populate('assignedTo', 'name email').sort({ priority: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Lead.countDocuments(filter)
    ]);
    res.json({ success: true, data: { items, total, page, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

router.get('/leads/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) fail('Lead không hợp lệ', 404);
    const data = await Lead.findById(req.params.id).populate('assignedTo', 'name email').populate('notes.author', 'name role').populate('timeline.actor', 'name role').lean();
    if (!data) fail('Không tìm thấy Lead', 404);
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

router.patch('/leads/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) fail('Lead không hợp lệ', 404);
    const lead = await Lead.findById(req.params.id);
    if (!lead) fail('Không tìm thấy Lead', 404);
    if (req.body.assignedTo !== undefined) {
      const nextAssignee = await assignUser(req.body.assignedTo, req.user);
      if (req.user.role !== 'admin' && lead.assignedTo && String(lead.assignedTo) !== String(req.user._id)) fail('Lead đang do nhân viên khác phụ trách', 409);
      lead.assignedTo = nextAssignee;
      lead.timeline.push({ action: 'assignment_changed', message: nextAssignee ? 'Đã cập nhật người phụ trách.' : 'Đã bỏ người phụ trách.', actor: req.user._id });
    }
    if (req.body.priority !== undefined) {
      if (!priorities.has(req.body.priority)) fail('Mức ưu tiên không hợp lệ');
      lead.priority = req.body.priority;
    }
    if (req.body.nextFollowUpAt !== undefined) {
      const value = req.body.nextFollowUpAt ? new Date(req.body.nextFollowUpAt) : null;
      if (value && Number.isNaN(value.getTime())) fail('Lịch chăm sóc không hợp lệ');
      lead.nextFollowUpAt = value;
    }
    if (req.body.status !== undefined) {
      if (!leadStatuses.has(req.body.status)) fail('Trạng thái Lead không hợp lệ');
      transitionLead(lead, req.body.status, { actor: req.user._id, message: clean(req.body.message, 500) });
    }
    if (req.body.status === 'lost') {
      const reason = clean(req.body.lostReason, 500);
      if (!reason) fail('Cần nhập lý do Lead thất bại');
      lead.lostReason = reason;
    }
    await lead.save();
    res.json({ success: true, message: 'Đã cập nhật Lead', data: lead });
  } catch (error) { next(error); }
});

router.post('/leads/:id/notes', async (req, res, next) => {
  try {
    const content = clean(req.body.content, 2000);
    if (!content) fail('Vui lòng nhập nội dung ghi chú');
    const lead = validId(req.params.id) ? await Lead.findById(req.params.id) : null;
    if (!lead) fail('Không tìm thấy Lead', 404);
    lead.notes.push({ content, author: req.user._id });
    lead.timeline.push({ action: 'note_added', message: 'Đã thêm ghi chú nội bộ.', actor: req.user._id });
    await lead.save();
    res.status(201).json({ success: true, message: 'Đã thêm ghi chú', data: lead.notes.at(-1) });
  } catch (error) { next(error); }
});

router.get('/requests', async (req, res, next) => {
  try {
    const { page, limit } = pageValues(req.query);
    const filter = {};
    if (requestStatuses.has(req.query.status)) filter.status = req.query.status;
    if (priorities.has(req.query.priority)) filter.priority = req.query.priority;
    const assignedTo = assignmentFilter(req.query, req.user);
    if (assignedTo !== undefined) filter.assignedTo = assignedTo;
    const q = clean(req.query.q, 100);
    if (q) filter.$or = [{ code: { $regex: q, $options: 'i' } }, { title: { $regex: q, $options: 'i' } }, { 'contact.name': { $regex: q, $options: 'i' } }, { 'contact.phone': { $regex: q, $options: 'i' } }];
    const [items, total] = await Promise.all([
      ServiceRequest.find(filter).select('-attachments.storedName -internalSummary').populate('customer', 'name email phone company').populate('assignedTo', 'name email').sort({ priority: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      ServiceRequest.countDocuments(filter)
    ]);
    res.json({ success: true, data: { items, total, page, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

router.get('/requests/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) fail('Yêu cầu không hợp lệ', 404);
    const request = await ServiceRequest.findById(req.params.id).select('+internalSummary -attachments.storedName').populate('customer', 'name email phone company').populate('assignedTo', 'name email').lean();
    if (!request) fail('Không tìm thấy yêu cầu', 404);
    const [messages, quotations] = await Promise.all([
      RequestMessage.find({ request: request._id }).populate('sender', 'name role').sort({ createdAt: 1 }).limit(300).lean(),
      Quotation.find({ request: request._id }).populate('createdBy', 'name role').sort({ version: -1 }).lean()
    ]);
    await RequestMessage.updateMany({ request: request._id, senderRole: 'customer', readByStaffAt: null }, { readByStaffAt: new Date() });
    res.json({ success: true, data: { request, messages, quotations } });
  } catch (error) { next(error); }
});

router.patch('/requests/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) fail('Yêu cầu không hợp lệ', 404);
    const request = await ServiceRequest.findById(req.params.id).select('+internalSummary');
    if (!request) fail('Không tìm thấy yêu cầu', 404);
    if (req.body.assignedTo !== undefined) {
      const nextAssignee = await assignUser(req.body.assignedTo, req.user);
      if (req.user.role !== 'admin' && request.assignedTo && String(request.assignedTo) !== String(req.user._id)) fail('Hồ sơ đang do nhân viên khác phụ trách', 409);
      request.assignedTo = nextAssignee;
    }
    if (req.body.priority !== undefined) {
      if (!priorities.has(req.body.priority)) fail('Mức ưu tiên không hợp lệ');
      request.priority = req.body.priority;
    }
    if (req.body.internalSummary !== undefined) request.internalSummary = clean(req.body.internalSummary, 3000);
    if (req.body.status !== undefined) {
      if (!requestStatuses.has(req.body.status)) fail('Trạng thái yêu cầu không hợp lệ');
      const message = clean(req.body.message, 1000);
      if (req.body.status === 'need_more_info' && !message) fail('Cần nêu rõ thông tin khách hàng phải bổ sung');
      transitionServiceRequest(request, req.body.status, { actor: req.user._id, actorType: 'staff', message });
      if (message) await RequestMessage.create({ request: request._id, sender: req.user._id, senderRole: req.user.role, visibility: req.body.visibility === 'internal' ? 'internal' : 'customer', content: message, readByStaffAt: new Date() });
    }
    await request.save();
    res.json({ success: true, message: 'Đã cập nhật yêu cầu', data: request });
  } catch (error) { next(error); }
});

router.post('/requests/:id/messages', async (req, res, next) => {
  try {
    const request = validId(req.params.id) ? await ServiceRequest.findById(req.params.id) : null;
    if (!request) fail('Không tìm thấy yêu cầu', 404);
    if (['accepted', 'rejected', 'cancelled'].includes(request.status)) fail('Hồ sơ đã đóng, không thể gửi thêm trao đổi', 409);
    const content = clean(req.body.content);
    if (!content) fail('Vui lòng nhập nội dung');
    const visibility = req.body.visibility === 'internal' ? 'internal' : 'customer';
    const message = await RequestMessage.create({ request: request._id, sender: req.user._id, senderRole: req.user.role, visibility, content, readByStaffAt: new Date() });
    request.lastStaffMessageAt = new Date();
    await request.save();
    res.status(201).json({ success: true, message: visibility === 'internal' ? 'Đã lưu ghi chú nội bộ' : 'Đã gửi khách hàng', data: message });
  } catch (error) { next(error); }
});

router.post('/requests/:id/quotations', async (req, res, next) => {
  try {
    const request = validId(req.params.id) ? await ServiceRequest.findById(req.params.id) : null;
    if (!request) fail('Không tìm thấy yêu cầu', 404);
    if (!['reviewing', 'quoted'].includes(request.status)) fail('Yêu cầu phải đang đánh giá hoặc chờ phản hồi báo giá', 409);
    if (!Array.isArray(req.body.items) || !req.body.items.length || req.body.items.length > 50) fail('Báo giá cần từ 1 đến 50 hạng mục');
    const items = req.body.items.map(item => ({ description: clean(item.description, 500), quantity: Number(item.quantity), unit: clean(item.unit, 50), unitPrice: Number(item.unitPrice), lineTotal: 0 }));
    if (items.some(item => !item.description || !item.unit || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) fail('Hạng mục báo giá không hợp lệ');
    const validUntil = new Date(req.body.validUntil);
    if (Number.isNaN(validUntil.getTime()) || validUntil <= new Date()) fail('Ngày hiệu lực báo giá phải ở tương lai');
    const latest = await Quotation.findOne({ request: request._id }).sort({ version: -1 }).select('version');
    const status = req.body.status === 'sent' ? 'sent' : 'draft';
    const quotation = await Quotation.create({
      request: request._id, customer: request.customer, version: (latest?.version || 0) + 1, items,
      subtotal: 0, total: 0, taxRate: Math.min(100, Math.max(0, Number(req.body.taxRate) || 0)),
      leadTime: clean(req.body.leadTime, 300), paymentTerms: clean(req.body.paymentTerms, 1000), notes: clean(req.body.notes, 2000), validUntil,
      status, sentAt: status === 'sent' ? new Date() : undefined, createdBy: req.user._id
    });
    if (status === 'sent') {
      await Quotation.updateMany({ request: request._id, _id: { $ne: quotation._id }, status: { $in: ['sent', 'draft'] } }, { status: 'superseded' });
      transitionServiceRequest(request, 'quoted', { actor: req.user._id, actorType: 'staff', message: `Đã gửi báo giá ${quotation.code}.` });
      request.lastStaffMessageAt = new Date();
      await Promise.all([request.save(), RequestMessage.create({ request: request._id, sender: req.user._id, senderRole: req.user.role, visibility: 'customer', content: `Cơ khí Đăng Khoa đã gửi báo giá ${quotation.code} (phiên bản ${quotation.version}).`, readByStaffAt: new Date() })]);
    }
    res.status(201).json({ success: true, message: status === 'sent' ? 'Đã gửi báo giá cho khách hàng' : 'Đã lưu bản nháp báo giá', data: quotation });
  } catch (error) { next(error); }
});

router.patch('/requests/:requestId/quotations/:quotationId/send', async (req, res, next) => {
  try {
    if (!validId(req.params.requestId) || !validId(req.params.quotationId)) fail('Báo giá không hợp lệ', 404);
    const [request, quotation] = await Promise.all([ServiceRequest.findById(req.params.requestId), Quotation.findOne({ _id: req.params.quotationId, request: req.params.requestId })]);
    if (!request || !quotation) fail('Không tìm thấy báo giá', 404);
    if (quotation.status !== 'draft') fail('Chỉ có thể gửi báo giá đang ở bản nháp', 409);
    if (quotation.validUntil <= new Date()) fail('Báo giá đã hết hiệu lực', 409);
    await Quotation.updateMany({ request: request._id, _id: { $ne: quotation._id }, status: { $in: ['sent', 'draft'] } }, { status: 'superseded' });
    quotation.status = 'sent'; quotation.sentAt = new Date();
    transitionServiceRequest(request, 'quoted', { actor: req.user._id, actorType: 'staff', message: `Đã gửi báo giá ${quotation.code}.` });
    request.lastStaffMessageAt = new Date();
    await Promise.all([quotation.save(), request.save(), RequestMessage.create({ request: request._id, sender: req.user._id, senderRole: req.user.role, visibility: 'customer', content: `Cơ khí Đăng Khoa đã gửi báo giá ${quotation.code} (phiên bản ${quotation.version}).`, readByStaffAt: new Date() })]);
    res.json({ success: true, message: 'Đã gửi báo giá cho khách hàng', data: quotation });
  } catch (error) { next(error); }
});

router.get('/requests/:requestId/attachments/:attachmentId', async (req, res, next) => {
  try {
    if (!validId(req.params.requestId) || !validId(req.params.attachmentId)) fail('Tệp không hợp lệ', 404);
    const request = await ServiceRequest.findById(req.params.requestId);
    const attachment = request?.attachments.id(req.params.attachmentId);
    if (!attachment) fail('Không tìm thấy tệp', 404);
    res.download(path.join(uploadDirectory, attachment.storedName), attachment.originalName);
  } catch (error) { next(error); }
});

router.get('/requests/:requestId/messages/:messageId/attachments/:attachmentId', async (req, res, next) => {
  try {
    if (![req.params.requestId, req.params.messageId, req.params.attachmentId].every(validId)) fail('Tệp không hợp lệ', 404);
    const message = await RequestMessage.findOne({ _id: req.params.messageId, request: req.params.requestId }).select('+attachments.storedName');
    const attachment = message?.attachments.id(req.params.attachmentId);
    if (!attachment) fail('Không tìm thấy tệp', 404);
    res.download(path.join(uploadDirectory, attachment.storedName), attachment.originalName);
  } catch (error) { next(error); }
});

router.get('/orders', async (req, res, next) => {
  try {
    const { page, limit } = pageValues(req.query);
    const filter = {};
    if (orderStatuses.has(req.query.status)) filter.status = req.query.status;
    if (paymentStatuses.has(req.query.paymentStatus)) filter.paymentStatus = req.query.paymentStatus;
    const assignedTo = assignmentFilter(req.query, req.user);
    if (assignedTo !== undefined) filter.assignedTo = assignedTo;
    const q = clean(req.query.q, 100);
    if (q) filter.$or = [{ code: { $regex: q, $options: 'i' } }, { 'shippingAddress.recipientName': { $regex: q, $options: 'i' } }, { 'shippingAddress.phone': { $regex: q, $options: 'i' } }];
    const [items, total] = await Promise.all([
      Order.find(filter).populate('customer', 'name email phone company').populate('assignedTo', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Order.countDocuments(filter)
    ]);
    res.json({ success: true, data: { items, total, page, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

router.get('/orders/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) fail('Đơn hàng không hợp lệ', 404);
    const data = await Order.findById(req.params.id).select('+internalNote').populate('customer', 'name email phone company').populate('assignedTo', 'name email').populate('timeline.actor', 'name role').lean();
    if (!data) fail('Không tìm thấy đơn hàng', 404);
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

router.patch('/orders/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) fail('Đơn hàng không hợp lệ', 404);
    const order = await Order.findById(req.params.id).select('+internalNote');
    if (!order) fail('Không tìm thấy đơn hàng', 404);
    if (req.body.assignedTo !== undefined) {
      const nextAssignee = await assignUser(req.body.assignedTo, req.user);
      if (req.user.role !== 'admin' && order.assignedTo && String(order.assignedTo) !== String(req.user._id)) fail('Đơn hàng đang do nhân viên khác phụ trách', 409);
      order.assignedTo = nextAssignee;
    }
    if (req.body.internalNote !== undefined) order.internalNote = clean(req.body.internalNote, 3000);
    if (req.body.paymentStatus !== undefined) {
      if (!paymentStatuses.has(req.body.paymentStatus)) fail('Trạng thái thanh toán không hợp lệ');
      order.paymentStatus = req.body.paymentStatus;
    }
    if (req.body.status !== undefined && req.body.status !== order.status) {
      if (!orderStatuses.has(req.body.status)) fail('Trạng thái đơn hàng không hợp lệ');
      const previousStatus = order.status;
      if (req.body.status === 'confirmed' && !order.stockCommittedAt) {
        const committed = [];
        for (const item of order.items) {
          const result = await Product.updateOne({ _id: item.product, active: true, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } });
          if (!result.modifiedCount) {
            await Promise.all(committed.map(value => Product.updateOne({ _id: value.product }, { $inc: { stock: value.quantity } })));
            fail(`${item.name} không đủ tồn kho để xác nhận`, 409);
          }
          committed.push({ product: item.product, quantity: item.quantity });
        }
        order.stockCommittedAt = new Date();
      }
      if (req.body.status === 'cancelled' && order.stockCommittedAt && ['confirmed', 'preparing'].includes(previousStatus)) {
        await Promise.all(order.items.map(item => Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } })));
        order.stockCommittedAt = undefined;
      }
      transitionOrder(order, req.body.status, { actor: req.user._id, message: clean(req.body.message, 1000) });
    }
    await order.save();
    res.json({ success: true, message: 'Đã cập nhật đơn hàng', data: order });
  } catch (error) { next(error); }
});

module.exports = router;

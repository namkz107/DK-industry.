const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const Order = require('../models/Order');
const Quotation = require('../models/Quotation');
const RequestMessage = require('../models/RequestMessage');
const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');
const WorkOrder = require('../models/WorkOrder');
const { transitionLead, transitionOrder, transitionPayment, transitionServiceRequest } = require('../services/workflowService');
const { commitOrderStock, releaseOrderStock } = require('../services/orderService');
const { withTransaction } = require('../services/transactionService');
const { writeAudit } = require('../services/auditService');
const { createNotification, dispatchSoon } = require('../services/notificationService');

const router = express.Router();
const uploadDirectory = path.join(__dirname, '..', '..', 'storage', 'customer-requests');
const leadStatuses = new Set(['new', 'qualified', 'contacted', 'needs_analysis', 'quoted', 'won', 'lost', 'spam']);
const requestStatuses = new Set(['submitted', 'reviewing', 'need_more_info', 'quoted', 'accepted', 'rejected', 'cancelled']);
const orderStatuses = new Set(['pending', 'confirmed', 'preparing', 'shipping', 'delivered', 'cancelled']);
const paymentStatuses = new Set(['unpaid', 'pending', 'paid', 'refund_pending', 'refunded']);
const priorities = new Set(['low', 'normal', 'high', 'urgent']);
const workOrderStatuses = new Set(['awaiting_contract', 'awaiting_deposit', 'scheduled', 'in_progress', 'quality_check', 'ready_for_delivery', 'completed', 'cancelled']);
const workOrderTransitions = {
  awaiting_contract: ['awaiting_deposit', 'scheduled', 'cancelled'],
  awaiting_deposit: ['scheduled', 'cancelled'],
  scheduled: ['in_progress', 'cancelled'],
  in_progress: ['quality_check', 'cancelled'],
  quality_check: ['in_progress', 'ready_for_delivery'],
  ready_for_delivery: ['completed'],
  completed: [], cancelled: []
};
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
  if (!validId(value)) fail('Người phụ trách không hợp lệ');
  const assignee = await User.findOne({ _id: value, role: 'staff', status: 'active' }).select('_id');
  if (!assignee) fail('Chỉ có thể giao cho một nhân viên đang hoạt động', 404);
  return assignee._id;
}

function ensureOwnership(document, actor, label) {
  if (actor.role === 'admin') return;
  if (document.assignedTo && String(document.assignedTo) !== String(actor._id)) {
    fail(`${label} đang do nhân viên khác phụ trách`, 409);
  }
}

function claimIfUnassigned(document, actor) {
  if (!document.assignedTo && actor.role === 'staff') document.assignedTo = actor._id;
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
    const data = await User.find({ role: 'staff', status: 'active' }).select('name email role').sort({ name: 1 }).lean();
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
    ensureOwnership(lead, req.user, 'Lead');
    claimIfUnassigned(lead, req.user);
    if (req.body.assignedTo !== undefined) {
      const nextAssignee = await assignUser(req.body.assignedTo, req.user);
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
    ensureOwnership(lead, req.user, 'Lead');
    claimIfUnassigned(lead, req.user);
    lead.notes.push({ content, author: req.user._id });
    lead.timeline.push({ action: 'note_added', message: 'Đã thêm ghi chú nội bộ.', actor: req.user._id });
    await lead.save();
    res.status(201).json({ success: true, message: 'Đã thêm ghi chú', data: lead.notes.at(-1) });
  } catch (error) { next(error); }
});

router.post('/leads/:id/convert', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) fail('Lead không hợp lệ', 404);
    const result = await withTransaction(async session => {
      const leadQuery = Lead.findById(req.params.id);
      if (session) leadQuery.session(session);
      const lead = await leadQuery;
      if (!lead) fail('Không tìm thấy Lead', 404);
      ensureOwnership(lead, req.user, 'Lead');
      if (lead.convertedRequest) fail('Lead đã được chuyển thành hồ sơ trước đó', 409);
      if (lead.status === 'spam') fail('Không thể chuyển đổi Lead bị đánh dấu spam', 409);
      const customerFilter = req.body.customerId && validId(req.body.customerId)
        ? { _id: req.body.customerId, role: 'customer', status: 'active' }
        : { role: 'customer', status: 'active', $or: [...(lead.email ? [{ email: lead.email }] : []), { phone: lead.phone }] };
      const customerQuery = User.findOne(customerFilter);
      if (session) customerQuery.session(session);
      const customer = await customerQuery;
      if (!customer) fail('Chưa tìm thấy tài khoản khách hàng trùng email hoặc số điện thoại. Hãy tạo/liên kết tài khoản khách trước khi chuyển đổi.', 409);
      const type = lead.products?.length ? 'product_quote' : 'consulting';
      const created = await ServiceRequest.create([{
        code: `YC-${new Date().toISOString().slice(2, 10).replaceAll('-', '')}-${require('crypto').randomBytes(3).toString('hex').toUpperCase()}`,
        customer: customer._id, requestType: type, title: clean(lead.serviceType || `Tư vấn từ ${lead.code}`, 200),
        description: clean(lead.message || `Yêu cầu được chuyển đổi từ Lead ${lead.code}.`, 5000), budget: lead.budget,
        product: lead.products?.[0]?.product, productSnapshot: lead.products?.[0] ? { name: lead.products[0].name } : undefined,
        contact: { name: customer.name, phone: customer.phone, email: customer.email, company: customer.company },
        source: 'lead_conversion', sourceLead: lead._id, assignedTo: lead.assignedTo || (req.user.role === 'staff' ? req.user._id : undefined),
        status: 'submitted', timeline: [{ status: 'submitted', message: `Hồ sơ được chuyển từ Lead ${lead.code}.`, actorType: 'staff', actor: req.user._id }]
      }], session ? { session } : undefined);
      const request = created[0];
      lead.convertedCustomer = customer._id;
      lead.convertedRequest = request._id;
      lead.timeline.push({ action: 'converted', message: `Đã chuyển thành hồ sơ ${request.code}.`, actor: req.user._id });
      await lead.save(session ? { session } : undefined);
      await writeAudit({ actor: req.user._id, action: 'lead.converted', entity: 'lead', entityId: lead._id, summary: `Chuyển Lead ${lead.code} thành ${request.code}`, metadata: { customerId: customer._id, requestId: request._id }, session });
      return { lead, request, customer };
    });
    await createNotification({ recipient: result.customer._id, type: 'request.created_from_lead', title: `Hồ sơ tư vấn ${result.request.code} đã được tạo`, message: 'Yêu cầu trao đổi trước đó của bạn đã được đưa vào cổng khách hàng để theo dõi.', link: '/tai-khoan/yeu-cau' });
    dispatchSoon();
    res.status(201).json({ success: true, message: 'Đã chuyển Lead thành hồ sơ khách hàng', data: { leadId: result.lead._id, requestId: result.request._id, requestCode: result.request.code, customerId: result.customer._id } });
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
    const [messages, quotations, workOrder] = await Promise.all([
      RequestMessage.find({ request: request._id }).populate('sender', 'name role').sort({ createdAt: 1 }).limit(300).lean(),
      Quotation.find({ request: request._id }).populate('createdBy', 'name role').sort({ version: -1 }).lean(),
      WorkOrder.findOne({ request: request._id }).populate('assignedTo', 'name email').lean()
    ]);
    await RequestMessage.updateMany({ request: request._id, senderRole: 'customer', readByStaffAt: null }, { readByStaffAt: new Date() });
    res.json({ success: true, data: { request, messages, quotations, workOrder } });
  } catch (error) { next(error); }
});

router.patch('/requests/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) fail('Yêu cầu không hợp lệ', 404);
    const request = await ServiceRequest.findById(req.params.id).select('+internalSummary');
    if (!request) fail('Không tìm thấy yêu cầu', 404);
    ensureOwnership(request, req.user, 'Hồ sơ');
    claimIfUnassigned(request, req.user);
    if (req.body.assignedTo !== undefined) {
      const nextAssignee = await assignUser(req.body.assignedTo, req.user);
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
    ensureOwnership(request, req.user, 'Hồ sơ');
    claimIfUnassigned(request, req.user);
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
    ensureOwnership(request, req.user, 'Hồ sơ');
    claimIfUnassigned(request, req.user);
    if (!['reviewing', 'quoted'].includes(request.status)) fail('Yêu cầu phải đang đánh giá hoặc chờ phản hồi báo giá', 409);
    if (!Array.isArray(req.body.items) || !req.body.items.length || req.body.items.length > 50) fail('Báo giá cần từ 1 đến 50 hạng mục');
    const items = req.body.items.map(item => ({ description: clean(item.description, 500), quantity: Number(item.quantity), unit: clean(item.unit, 50), unitPrice: Number(item.unitPrice), lineTotal: 0 }));
    if (items.some(item => !item.description || !item.unit || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) fail('Hạng mục báo giá không hợp lệ');
    const validUntil = new Date(req.body.validUntil);
    if (Number.isNaN(validUntil.getTime()) || validUntil <= new Date()) fail('Ngày hiệu lực báo giá phải ở tương lai');
    const sequenced = await ServiceRequest.findByIdAndUpdate(request._id, { $inc: { quotationSequence: 1 } }, { new: true }).select('quotationSequence');
    const status = req.body.status === 'sent' ? 'sent' : 'draft';
    const quotation = await Quotation.create({
      request: request._id, customer: request.customer, version: sequenced.quotationSequence, items,
      subtotal: 0, total: 0, taxRate: Math.min(100, Math.max(0, Number(req.body.taxRate) || 0)),
      leadTime: clean(req.body.leadTime, 300), paymentTerms: clean(req.body.paymentTerms, 1000), notes: clean(req.body.notes, 2000), validUntil,
      status, sentAt: status === 'sent' ? new Date() : undefined, createdBy: req.user._id
    });
    if (status === 'sent') {
      await Quotation.updateMany({ request: request._id, _id: { $ne: quotation._id }, status: { $in: ['sent', 'draft'] } }, { status: 'superseded' });
      transitionServiceRequest(request, 'quoted', { actor: req.user._id, actorType: 'staff', message: `Đã gửi báo giá ${quotation.code}.` });
      request.lastStaffMessageAt = new Date();
      await Promise.all([request.save(), RequestMessage.create({ request: request._id, sender: req.user._id, senderRole: req.user.role, visibility: 'customer', content: `Cơ khí Đăng Khoa đã gửi báo giá ${quotation.code} (phiên bản ${quotation.version}).`, readByStaffAt: new Date() })]);
      await createNotification({ recipient: request.customer, type: 'quotation.sent', title: `Bạn có báo giá mới ${quotation.code}`, message: `Báo giá có tổng giá trị ${quotation.total.toLocaleString('vi-VN')}đ và hiệu lực đến ${quotation.validUntil.toLocaleDateString('vi-VN')}.`, link: '/tai-khoan/yeu-cau', metadata: { requestId: request._id, quotationId: quotation._id } });
      await writeAudit({ actor: req.user._id, action: 'quotation.sent', entity: 'quotation', entityId: quotation._id, summary: `Gửi báo giá ${quotation.code}`, metadata: { requestId: request._id, total: quotation.total } });
      dispatchSoon();
    } else {
      await request.save();
      await writeAudit({ actor: req.user._id, action: 'quotation.draft_created', entity: 'quotation', entityId: quotation._id, summary: `Tạo nháp báo giá ${quotation.code}`, metadata: { requestId: request._id, total: quotation.total } });
    }
    res.status(201).json({ success: true, message: status === 'sent' ? 'Đã gửi báo giá cho khách hàng' : 'Đã lưu bản nháp báo giá', data: quotation });
  } catch (error) { next(error); }
});

router.patch('/requests/:requestId/quotations/:quotationId/send', async (req, res, next) => {
  try {
    if (!validId(req.params.requestId) || !validId(req.params.quotationId)) fail('Báo giá không hợp lệ', 404);
    const [request, quotation] = await Promise.all([ServiceRequest.findById(req.params.requestId), Quotation.findOne({ _id: req.params.quotationId, request: req.params.requestId })]);
    if (!request || !quotation) fail('Không tìm thấy báo giá', 404);
    ensureOwnership(request, req.user, 'Hồ sơ');
    claimIfUnassigned(request, req.user);
    if (quotation.status !== 'draft') fail('Chỉ có thể gửi báo giá đang ở bản nháp', 409);
    if (quotation.validUntil <= new Date()) fail('Báo giá đã hết hiệu lực', 409);
    await Quotation.updateMany({ request: request._id, _id: { $ne: quotation._id }, status: { $in: ['sent', 'draft'] } }, { status: 'superseded' });
    quotation.status = 'sent'; quotation.sentAt = new Date();
    transitionServiceRequest(request, 'quoted', { actor: req.user._id, actorType: 'staff', message: `Đã gửi báo giá ${quotation.code}.` });
    request.lastStaffMessageAt = new Date();
    await Promise.all([quotation.save(), request.save(), RequestMessage.create({ request: request._id, sender: req.user._id, senderRole: req.user.role, visibility: 'customer', content: `Cơ khí Đăng Khoa đã gửi báo giá ${quotation.code} (phiên bản ${quotation.version}).`, readByStaffAt: new Date() })]);
    await createNotification({ recipient: request.customer, type: 'quotation.sent', title: `Bạn có báo giá mới ${quotation.code}`, message: `Báo giá có tổng giá trị ${quotation.total.toLocaleString('vi-VN')}đ và hiệu lực đến ${quotation.validUntil.toLocaleDateString('vi-VN')}.`, link: '/tai-khoan/yeu-cau', metadata: { requestId: request._id, quotationId: quotation._id } });
    await writeAudit({ actor: req.user._id, action: 'quotation.sent', entity: 'quotation', entityId: quotation._id, summary: `Gửi báo giá ${quotation.code}`, metadata: { requestId: request._id, total: quotation.total } });
    dispatchSoon();
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

router.get('/work-orders', async (req, res, next) => {
  try {
    const { page, limit } = pageValues(req.query);
    const filter = {};
    if (workOrderStatuses.has(req.query.status)) filter.status = req.query.status;
    const assignedTo = assignmentFilter(req.query, req.user);
    if (assignedTo !== undefined) filter.assignedTo = assignedTo;
    const q = clean(req.query.q, 100);
    if (q) filter.$or = [{ code: { $regex: q, $options: 'i' } }, { contractReference: { $regex: q, $options: 'i' } }, { purchaseOrderReference: { $regex: q, $options: 'i' } }];
    const [items, total] = await Promise.all([
      WorkOrder.find(filter).populate('customer', 'name email phone company').populate('assignedTo', 'name email').populate('request', 'code title').populate('quotation', 'code total').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      WorkOrder.countDocuments(filter)
    ]);
    res.json({ success: true, data: { items, total, page, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

router.get('/work-orders/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) fail('Công việc không hợp lệ', 404);
    const data = await WorkOrder.findById(req.params.id).populate('customer', 'name email phone company').populate('assignedTo', 'name email').populate('request', 'code title description').populate('quotation').populate('timeline.actor', 'name role').lean();
    if (!data) fail('Không tìm thấy công việc', 404);
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

router.patch('/work-orders/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) fail('Công việc không hợp lệ', 404);
    const workOrder = await withTransaction(async session => {
      const query = WorkOrder.findById(req.params.id);
      if (session) query.session(session);
      const current = await query;
      if (!current) fail('Không tìm thấy công việc', 404);
      ensureOwnership(current, req.user, 'Công việc');
      const before = { status: current.status, assignedTo: current.assignedTo, depositRequired: current.depositRequired, depositPaid: current.depositPaid };
      if (req.body.assignedTo !== undefined) current.assignedTo = await assignUser(req.body.assignedTo, req.user);
      claimIfUnassigned(current, req.user);
      if (req.body.contractReference !== undefined) current.contractReference = clean(req.body.contractReference, 200);
      if (req.body.purchaseOrderReference !== undefined) current.purchaseOrderReference = clean(req.body.purchaseOrderReference, 200);
      if (req.body.depositRequired !== undefined) {
        const value = Math.round(Number(req.body.depositRequired));
        if (!Number.isFinite(value) || value < 0 || value > current.agreedTotal) fail('Số tiền đặt cọc yêu cầu không hợp lệ');
        current.depositRequired = value;
      }
      if (req.body.depositPaid !== undefined) {
        const value = Math.round(Number(req.body.depositPaid));
        if (!Number.isFinite(value) || value < 0 || value > current.agreedTotal) fail('Số tiền đặt cọc đã nhận không hợp lệ');
        current.depositPaid = value;
      }
      for (const field of ['plannedStartAt', 'plannedDeliveryAt']) if (req.body[field] !== undefined) {
        const value = req.body[field] ? new Date(req.body[field]) : null;
        if (value && Number.isNaN(value.getTime())) fail('Mốc thời gian kế hoạch không hợp lệ');
        current[field] = value;
      }
      if (req.body.status !== undefined && req.body.status !== current.status) {
        if (!workOrderStatuses.has(req.body.status) || !workOrderTransitions[current.status]?.includes(req.body.status)) fail(`Không thể chuyển công việc từ ${current.status} sang ${req.body.status}`, 409);
        if (req.body.status === 'scheduled' && current.depositRequired > current.depositPaid) fail('Chưa thu đủ tiền đặt cọc để lên lịch thực hiện', 409);
        if (req.body.status === 'awaiting_deposit' && current.depositRequired <= 0) fail('Cần nhập số tiền đặt cọc trước khi chờ thanh toán');
        current.status = req.body.status;
        current.timeline.push({ status: current.status, message: clean(req.body.message, 1000), actor: req.user._id, actorType: 'staff' });
      }
      await current.save(session ? { session } : undefined);
      await writeAudit({ actor: req.user._id, action: 'work_order.updated', entity: 'work_order', entityId: current._id, summary: `Cập nhật công việc ${current.code}`, metadata: { before, after: { status: current.status, assignedTo: current.assignedTo, depositRequired: current.depositRequired, depositPaid: current.depositPaid } }, session });
      return current;
    });
    await createNotification({ recipient: workOrder.customer, type: 'work_order.updated', title: `Công việc ${workOrder.code} đã được cập nhật`, message: `Trạng thái hiện tại: ${workOrder.status}.`, link: '/tai-khoan/yeu-cau' });
    dispatchSoon();
    res.json({ success: true, message: 'Đã cập nhật công việc', data: workOrder });
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
    const data = await Order.findById(req.params.id).select('+internalNote').populate('customer', 'name email phone company').populate('assignedTo', 'name email').populate('timeline.actor', 'name role').populate('paymentTimeline.actor', 'name role').lean();
    if (!data) fail('Không tìm thấy đơn hàng', 404);
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

router.patch('/orders/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) fail('Đơn hàng không hợp lệ', 404);
    const order = await withTransaction(async session => {
      const query = Order.findById(req.params.id).select('+internalNote');
      if (session) query.session(session);
      const current = await query;
      if (!current) fail('Không tìm thấy đơn hàng', 404);
      ensureOwnership(current, req.user, 'Đơn hàng');
      const before = { status: current.status, paymentStatus: current.paymentStatus, shippingFee: current.shippingFee, total: current.total, assignedTo: current.assignedTo };

      if (req.body.assignedTo !== undefined) current.assignedTo = await assignUser(req.body.assignedTo, req.user);
      if (req.body.internalNote !== undefined) current.internalNote = clean(req.body.internalNote, 3000);
      if (req.body.shippingFee !== undefined) {
        if (!['pending', 'confirmed', 'preparing'].includes(current.status)) fail('Chỉ cập nhật phí vận chuyển trước khi xuất giao');
        const shippingFee = Number(req.body.shippingFee);
        if (!Number.isFinite(shippingFee) || shippingFee < 0 || shippingFee > 100000000) fail('Phí vận chuyển không hợp lệ');
        if (Math.round(shippingFee) !== current.shippingFee && (current.paymentLockedAt || ['paid', 'refund_pending', 'refunded'].includes(current.paymentStatus))) {
          fail('Không thể thay đổi phí vận chuyển sau khi đã ghi nhận thanh toán', 409);
        }
        current.shippingFee = Math.round(shippingFee);
        current.total = current.subtotal + current.shippingFee;
      }
      if (req.body.shippingProvider !== undefined) current.shippingProvider = clean(req.body.shippingProvider, 150);
      if (req.body.trackingCode !== undefined) current.trackingCode = clean(req.body.trackingCode, 150);
      if (req.body.estimatedDeliveryAt !== undefined) {
        const estimate = req.body.estimatedDeliveryAt ? new Date(req.body.estimatedDeliveryAt) : null;
        if (estimate && Number.isNaN(estimate.getTime())) fail('Ngày giao dự kiến không hợp lệ');
        current.estimatedDeliveryAt = estimate;
      }
      if (req.body.paymentStatus !== undefined) {
        const nextPayment = req.body.paymentStatus;
        if (!paymentStatuses.has(nextPayment)) fail('Trạng thái thanh toán không hợp lệ');
        if (nextPayment === 'refund_pending' && (req.body.status || current.status) !== 'cancelled') fail('Chỉ yêu cầu hoàn tiền cho đơn đã hủy');
        if (nextPayment === 'refunded' && (req.body.status || current.status) !== 'cancelled') fail('Chỉ xác nhận hoàn tiền cho đơn đã hủy');
        if (nextPayment === 'paid' && current.paymentMethod === 'cod' && (req.body.status || current.status) !== 'delivered') fail('Đơn COD chỉ được ghi nhận đã thanh toán khi giao thành công');
        if (nextPayment !== current.paymentStatus) {
          let amount;
          let reference = clean(req.body.paymentReference, 200);
          if (nextPayment === 'paid') {
            amount = req.body.amountPaid === undefined ? current.total : Number(req.body.amountPaid);
            if (!Number.isFinite(amount) || Math.round(amount) !== current.total) fail('Số tiền nhận phải khớp chính xác tổng đơn hàng');
            if (current.paymentMethod === 'bank_transfer' && reference.length < 3) fail('Cần nhập mã hoặc nội dung tham chiếu giao dịch chuyển khoản');
            current.amountPaid = Math.round(amount);
            current.paymentReference = reference;
            current.paymentLockedAt = new Date();
          }
          transitionPayment(current, nextPayment, { actor: req.user._id, message: clean(req.body.paymentMessage || req.body.message, 1000), amount, reference });
        }
      }
      if (req.body.status !== undefined && req.body.status !== current.status) {
        if (!orderStatuses.has(req.body.status)) fail('Trạng thái đơn hàng không hợp lệ');
        const previousStatus = current.status;
        const message = clean(req.body.message, 1000);
        if (req.body.status === 'cancelled' && !message) fail('Cần nhập lý do hủy đơn');
        if (req.body.status === 'shipping' && !current.shippingProvider) fail('Cần nhập đơn vị hoặc hình thức vận chuyển trước khi giao hàng');
        if (req.body.status === 'shipping' && current.paymentMethod === 'bank_transfer' && current.paymentStatus !== 'paid') fail('Đơn chuyển khoản phải được xác nhận thanh toán trước khi giao');
        transitionOrder(current, req.body.status, { actor: req.user._id, message });
        if (req.body.status === 'confirmed') await commitOrderStock(current, session);
        if (req.body.status === 'cancelled' && ['confirmed', 'preparing'].includes(previousStatus)) await releaseOrderStock(current, session);
        if (req.body.status === 'cancelled') {
          current.cancellationReason = message;
          if (current.paymentStatus === 'paid') transitionPayment(current, 'refund_pending', { actor: req.user._id, message: 'Đơn đã hủy và đang chờ hoàn tiền cho khách.', amount: current.amountPaid, reference: current.paymentReference });
        }
        if (req.body.status === 'delivered' && current.paymentMethod === 'cod' && ['unpaid', 'pending'].includes(current.paymentStatus)) {
          current.amountPaid = current.total;
          current.paymentLockedAt = new Date();
          transitionPayment(current, 'paid', { actor: req.user._id, message: 'Đã thu đủ tiền khi giao hàng.', amount: current.total });
        }
      }
      if (!current.assignedTo && req.body.status && req.body.status !== 'pending' && req.user.role === 'staff') current.assignedTo = req.user._id;
      await current.save(session ? { session } : undefined);
      await writeAudit({ actor: req.user._id, action: 'order.updated', entity: 'order', entityId: current._id, summary: `Cập nhật đơn ${current.code}`, metadata: { before, after: { status: current.status, paymentStatus: current.paymentStatus, shippingFee: current.shippingFee, total: current.total, assignedTo: current.assignedTo } }, session });
      return current;
    });
    await createNotification({ recipient: order.customer, type: 'order.updated', title: `Đơn hàng ${order.code} đã được cập nhật`, message: `Trạng thái hiện tại: ${order.status}. Thanh toán: ${order.paymentStatus}.`, link: '/tai-khoan/don-hang' });
    dispatchSoon();
    res.json({ success: true, message: 'Đã cập nhật đơn hàng', data: order });
  } catch (error) { next(error); }
});

router.patch('/orders/:orderId/after-sales/:requestId', async (req, res, next) => {
  try {
    if (!validId(req.params.orderId) || !validId(req.params.requestId)) fail('Yêu cầu hậu mãi không hợp lệ', 404);
    const order = await Order.findById(req.params.orderId);
    if (!order) fail('Không tìm thấy đơn hàng', 404);
    ensureOwnership(order, req.user, 'Đơn hàng');
    const item = order.afterSalesRequests.id(req.params.requestId);
    if (!item) fail('Không tìm thấy yêu cầu hậu mãi', 404);
    const transitions = { submitted: ['reviewing', 'rejected'], reviewing: ['approved', 'rejected'], approved: ['received', 'resolved'], received: ['resolved'], rejected: [], resolved: [] };
    const nextStatus = clean(req.body.status);
    if (!transitions[item.status]?.includes(nextStatus)) fail(`Không thể chuyển hậu mãi từ ${item.status} sang ${nextStatus}`, 409);
    const resolution = clean(req.body.resolution, 3000);
    if (['rejected', 'resolved'].includes(nextStatus) && resolution.length < 5) fail('Cần nhập kết quả xử lý rõ ràng');
    item.status = nextStatus;
    item.resolution = resolution || item.resolution;
    item.updatedBy = req.user._id;
    if (nextStatus === 'resolved') item.resolvedAt = new Date();
    await order.save();
    await writeAudit({ actor: req.user._id, action: 'order.after_sales_updated', entity: 'order', entityId: order._id, summary: `Cập nhật hậu mãi ${order.code}: ${nextStatus}`, metadata: { afterSalesId: item._id, resolution } });
    await createNotification({ recipient: order.customer, type: 'order.after_sales_updated', title: `Yêu cầu hậu mãi ${order.code} đã được cập nhật`, message: resolution || `Trạng thái hiện tại: ${nextStatus}.`, link: '/tai-khoan/don-hang' });
    dispatchSoon();
    res.json({ success: true, message: 'Đã cập nhật yêu cầu hậu mãi', data: order });
  } catch (error) { next(error); }
});

module.exports = router;

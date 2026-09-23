const leadTransitions = {
  new: ['qualified', 'contacted', 'lost', 'spam'],
  qualified: ['contacted', 'needs_analysis', 'lost', 'spam'],
  contacted: ['qualified', 'needs_analysis', 'quoted', 'lost', 'spam'],
  needs_analysis: ['contacted', 'quoted', 'lost'],
  quoted: ['needs_analysis', 'won', 'lost'],
  won: [], lost: ['contacted'], spam: []
};

const requestTransitions = {
  submitted: ['reviewing', 'cancelled', 'rejected'],
  reviewing: ['need_more_info', 'quoted', 'rejected', 'cancelled'],
  need_more_info: ['reviewing', 'rejected', 'cancelled'],
  quoted: ['accepted', 'reviewing', 'cancelled'],
  accepted: [], rejected: ['reviewing'], cancelled: []
};

const orderTransitions = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['shipping', 'cancelled'],
  shipping: ['delivered'],
  delivered: [], cancelled: []
};

const paymentTransitions = {
  unpaid: ['pending', 'paid'],
  pending: ['unpaid', 'paid'],
  paid: ['refund_pending'],
  refund_pending: ['refunded'],
  refunded: []
};

function assertTransition(map, current, next, label) {
  if (current === next) return;
  if (!map[current]?.includes(next)) throw Object.assign(new Error(`Không thể chuyển ${label} từ ${current} sang ${next}`), { status: 409, code: 'INVALID_STATUS_TRANSITION' });
}

function transitionLead(lead, nextStatus, { actor, message = '', action = 'status_changed' } = {}) {
  if (lead.status === nextStatus) return lead;
  assertTransition(leadTransitions, lead.status, nextStatus, 'Lead');
  const fromStatus = lead.status;
  lead.status = nextStatus;
  lead.timeline.push({ action, fromStatus, toStatus: nextStatus, message, actor });
  if (nextStatus === 'contacted') lead.lastContactAt = new Date();
  return lead;
}

function transitionServiceRequest(request, nextStatus, { actor, actorType = 'system', message = '' } = {}) {
  if (request.status === nextStatus) return request;
  assertTransition(requestTransitions, request.status, nextStatus, 'Service Request');
  request.status = nextStatus;
  request.timeline.push({ status: nextStatus, message, actorType, actor });
  if (['accepted', 'rejected', 'cancelled'].includes(nextStatus)) request.closedAt = new Date();
  else request.closedAt = undefined;
  return request;
}

function transitionOrder(order, nextStatus, { actor, actorType = 'staff', message = '' } = {}) {
  if (order.status === nextStatus) return order;
  assertTransition(orderTransitions, order.status, nextStatus, 'Order');
  order.status = nextStatus;
  order.timeline.push({ status: nextStatus, message, actorType, actor });
  const timestampFields = { confirmed: 'confirmedAt', preparing: 'preparingAt', shipping: 'shippedAt', delivered: 'deliveredAt', cancelled: 'cancelledAt' };
  if (timestampFields[nextStatus]) order[timestampFields[nextStatus]] = new Date();
  return order;
}

function transitionPayment(order, nextStatus, { actor, message = '' } = {}) {
  if (order.paymentStatus === nextStatus) return order;
  assertTransition(paymentTransitions, order.paymentStatus, nextStatus, 'Payment');
  order.paymentStatus = nextStatus;
  order.paymentTimeline.push({ status: nextStatus, message, actor });
  if (nextStatus === 'paid') order.paidAt = new Date();
  if (nextStatus === 'refunded') order.refundedAt = new Date();
  return order;
}

module.exports = { leadTransitions, requestTransitions, orderTransitions, paymentTransitions, transitionLead, transitionServiceRequest, transitionOrder, transitionPayment };

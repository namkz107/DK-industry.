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

function assertTransition(map, current, next, label) {
  if (current === next) return;
  if (!map[current]?.includes(next)) throw Object.assign(new Error(`Không thể chuyển ${label} từ ${current} sang ${next}`), { status: 409, code: 'INVALID_STATUS_TRANSITION' });
}

function transitionLead(lead, nextStatus, { actor, message = '', action = 'status_changed' } = {}) {
  assertTransition(leadTransitions, lead.status, nextStatus, 'Lead');
  const fromStatus = lead.status;
  lead.status = nextStatus;
  lead.timeline.push({ action, fromStatus, toStatus: nextStatus, message, actor });
  if (nextStatus === 'contacted') lead.lastContactAt = new Date();
  return lead;
}

function transitionServiceRequest(request, nextStatus, { actor, actorType = 'system', message = '' } = {}) {
  assertTransition(requestTransitions, request.status, nextStatus, 'Service Request');
  request.status = nextStatus;
  request.timeline.push({ status: nextStatus, message, actorType, actor });
  if (['accepted', 'rejected', 'cancelled'].includes(nextStatus)) request.closedAt = new Date();
  else request.closedAt = undefined;
  return request;
}

module.exports = { leadTransitions, requestTransitions, transitionLead, transitionServiceRequest };

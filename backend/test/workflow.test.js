const test = require('node:test');
const assert = require('node:assert/strict');
const { transitionLead, transitionOrder, transitionServiceRequest } = require('../src/services/workflowService');

test('Lead chỉ đi theo các bước nghiệp vụ hợp lệ', () => {
  const lead = { status: 'new', timeline: [] };
  transitionLead(lead, 'qualified', { message: 'Đủ thông tin sơ bộ' });
  transitionLead(lead, 'needs_analysis');
  transitionLead(lead, 'quoted');
  transitionLead(lead, 'won');
  assert.equal(lead.status, 'won');
  assert.throws(() => transitionLead(lead, 'new'), error => error.code === 'INVALID_STATUS_TRANSITION');
});

test('Service Request không thể bỏ qua bước phân tích để chấp thuận', () => {
  const request = { status: 'submitted', timeline: [] };
  assert.throws(() => transitionServiceRequest(request, 'accepted'), error => error.code === 'INVALID_STATUS_TRANSITION');
  transitionServiceRequest(request, 'reviewing');
  transitionServiceRequest(request, 'quoted');
  transitionServiceRequest(request, 'accepted');
  assert.equal(request.status, 'accepted');
  assert.ok(request.closedAt instanceof Date);
});

test('Order phải xác nhận trước khi chuẩn bị và giao hàng', () => {
  const order = { status: 'pending', timeline: [] };
  assert.throws(() => transitionOrder(order, 'shipping'), /Không thể chuyển Order/);
  transitionOrder(order, 'confirmed');
  transitionOrder(order, 'preparing');
  transitionOrder(order, 'shipping');
  transitionOrder(order, 'delivered');
  assert.equal(order.status, 'delivered');
});

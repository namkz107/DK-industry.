const Product = require('../models/Product');

const fail = (message, status = 409) => { throw Object.assign(new Error(message), { status }); };

async function commitOrderStock(order) {
  if (order.stockCommittedAt && !order.stockReleasedAt) return false;
  const committedAt = new Date();
  const claim = await order.constructor.updateOne(
    { _id: order._id, status: 'pending', stockCommittedAt: null },
    { $set: { stockCommittedAt: committedAt }, $unset: { stockReleasedAt: 1 } }
  );
  if (!claim.modifiedCount) fail('Đơn hàng đang được nhân viên khác xử lý, vui lòng tải lại dữ liệu');
  const committed = [];
  for (const item of order.items) {
    const result = await Product.updateOne(
      { _id: item.product, active: true, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } }
    );
    if (!result.modifiedCount) {
      await Promise.all(committed.map(value => Product.updateOne({ _id: value.product }, { $inc: { stock: value.quantity } })));
      await order.constructor.updateOne({ _id: order._id, stockCommittedAt: committedAt }, { $unset: { stockCommittedAt: 1 } });
      fail(`${item.name} không đủ tồn kho để xác nhận`);
    }
    committed.push({ product: item.product, quantity: item.quantity });
  }
  order.stockCommittedAt = committedAt;
  order.stockReleasedAt = undefined;
  return true;
}

async function releaseOrderStock(order) {
  if (!order.stockCommittedAt || order.stockReleasedAt) return false;
  const releasedAt = new Date();
  const claim = await order.constructor.updateOne(
    { _id: order._id, status: { $in: ['confirmed', 'preparing'] }, stockCommittedAt: { $ne: null }, stockReleasedAt: null },
    { $set: { stockReleasedAt: releasedAt } }
  );
  if (!claim.modifiedCount) fail('Đơn hàng đang được nhân viên khác xử lý, vui lòng tải lại dữ liệu');
  await Promise.all(order.items.map(item => Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } })));
  order.stockReleasedAt = releasedAt;
  return true;
}

module.exports = { commitOrderStock, releaseOrderStock };

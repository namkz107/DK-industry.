require('dotenv').config();

const crypto = require('crypto');
const mongoose = require('mongoose');
const connectDatabase = require('./config/database');
const Lead = require('./models/Lead');
const ServiceRequest = require('./models/ServiceRequest');
const RequestMessage = require('./models/RequestMessage');

function createLeadCode(createdAt = new Date()) {
  const date = new Date(createdAt).toISOString().slice(2, 10).replaceAll('-', '');
  return `LD-${date}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

async function migrate() {
  await connectDatabase();
  const leads = await Lead.find({ $or: [{ code: { $exists: false } }, { code: null }, { code: '' }] });
  for (const lead of leads) {
    lead.code = createLeadCode(lead.createdAt);
    lead.consent = Boolean(lead.consent);
    lead.priority ||= 'normal';
    await lead.save();
  }

  const sourceDefaults = await ServiceRequest.updateMany({ source: { $exists: false } }, { $set: { source: 'customer_portal' } });
  const priorityDefaults = await ServiceRequest.updateMany({ priority: { $exists: false } }, { $set: { priority: 'normal' } });
  const requests = await ServiceRequest.find({});
  let createdMessages = 0;
  for (const request of requests) {
    if (await RequestMessage.exists({ request: request._id })) continue;
    await RequestMessage.create({
      request: request._id,
      sender: request.customer,
      senderRole: 'customer',
      visibility: 'customer',
      content: request.description,
      attachments: request.attachments,
      createdAt: request.createdAt
    });
    request.lastCustomerMessageAt ||= request.createdAt;
    await request.save();
    createdMessages += 1;
  }

  console.log(JSON.stringify({
    migratedLeadCodes: leads.length,
    normalizedRequestSources: sourceDefaults.modifiedCount,
    normalizedRequestPriorities: priorityDefaults.modifiedCount,
    createdInitialMessages: createdMessages
  }, null, 2));
}

migrate()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => mongoose.disconnect());

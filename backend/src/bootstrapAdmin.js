require('dotenv').config();
const mongoose = require('mongoose');
const connectDatabase = require('./config/database');
const bootstrapAdmin = require('./services/bootstrapAdmin');

async function run() {
  await connectDatabase();
  const status = await bootstrapAdmin({ required: true });
  console.log(`Admin account: ${status}`);
  await mongoose.disconnect();
}

run().catch(async error => {
  console.error(`Cannot bootstrap Admin: ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

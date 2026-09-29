const mongoose = require('mongoose');

function transactionsRequired() {
  return process.env.NODE_ENV === 'production' && process.env.ALLOW_NON_TRANSACTIONAL_WRITES !== 'true';
}

function isTransactionUnsupported(error) {
  return error?.code === 20
    || error?.codeName === 'IllegalOperation'
    || /Transaction numbers are only allowed|does not support transactions/i.test(error?.message || '');
}

async function withTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    }, {
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
      readPreference: 'primary'
    });
    return result;
  } catch (error) {
    if (!isTransactionUnsupported(error) || transactionsRequired()) throw error;
    return work(null);
  } finally {
    await session.endSession();
  }
}

const sessionOption = session => session ? { session } : {};

module.exports = { withTransaction, sessionOption, transactionsRequired };

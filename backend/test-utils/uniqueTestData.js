const { randomInt, randomUUID } = require('node:crypto');

const uniqueToken = (prefix = 'test') => `${prefix}-${process.pid}-${randomUUID()}`;

const uniqueVietnamesePhone = (prefix = '09') => {
  const remainingLength = 10 - prefix.length;
  const maximum = 10 ** remainingLength;
  return `${prefix}${String(randomInt(0, maximum)).padStart(remainingLength, '0')}`;
};

module.exports = { uniqueToken, uniqueVietnamesePhone };

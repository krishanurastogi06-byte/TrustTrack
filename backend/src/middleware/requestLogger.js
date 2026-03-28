const morgan = require('morgan');
const logger = require('../lib/logger');

// Use morgan to send logs to winston
const stream = {
  write: (message) => logger.info(message.trim()),
};

const skip = () => process.env.NODE_ENV === 'test';

module.exports = morgan('combined', { stream, skip });

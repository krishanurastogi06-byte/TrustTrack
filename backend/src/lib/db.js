const mongoose = require('mongoose');
const logger = require('./logger');
const config = require('../config/env');

async function connect() {
  if (!config.mongoUri) {
    logger.warn('MONGO_URI not set; skipping DB connection');
    return;
  }

  try {
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('Connected to MongoDB');
  } catch (err) {
    logger.error('MongoDB connection error', err);
    // Re-throw so server start can fail if necessary
    throw err;
  }
}

module.exports = { connect, mongoose };

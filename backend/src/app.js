const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config/env');
const logger = require('./lib/logger');
const requestLogger = require('./middleware/requestLogger');
const auditContext = require('./middleware/auditContext');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');
const { fail } = require('./lib/apiResponse');

const app = express();

// Security + parsing
app.use(helmet());
if (config.trustProxy) {
  app.set('trust proxy', 1);
}

app.use(
  cors({
    origin: config.corsOrigin
      ? config.corsOrigin.split(',').map((s) => s.trim()).filter(Boolean)
      : true,
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Attach req.audit helper for controller-level audit events
app.use(auditContext);

// Routes
app.use('/', routes);

// 404
app.use((req, res, next) => {
  return fail(res, { status: 404, error: 'Not Found', code: 'NOT_FOUND' });
});

// Error handler (last)
app.use(errorHandler);

module.exports = app;

const http = require('http');
const app = require('./app');
const config = require('./config/env');
const logger = require('./lib/logger');
const db = require('./lib/db');
const { startReconciliationJob } = require('./jobs/reconciliationJob');

const port = config.port || 4000;

async function start() {
  try {
    await db.connect();
    const server = http.createServer(app);
    server.listen(port, () => {
      logger.info(`Server listening on http://localhost:${port}`);
    });

    startReconciliationJob();
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

start();

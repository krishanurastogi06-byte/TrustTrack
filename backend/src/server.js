const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const app = require('./app');
const config = require('./config/env');
const logger = require('./lib/logger');
const db = require('./lib/db');
const { startReconciliationJob } = require('./jobs/reconciliationJob');
const blockchainService = require('./services/blockchainService');

const execAsync = promisify(exec);
const basePort = Number(config.port) || 4000;
const candidatePorts = [basePort, basePort + 1, basePort + 2];
const runtimeDir = path.resolve(process.cwd(), '.runtime');
const devLockFile = path.join(runtimeDir, 'backend-dev.pid');

let server = null;
let reconciliationTimer = null;
let shuttingDown = false;

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function writeDevLock() {
  if (config.nodeEnv !== 'development') return true;

  fs.mkdirSync(runtimeDir, { recursive: true });

  if (fs.existsSync(devLockFile)) {
    const existingPid = Number(fs.readFileSync(devLockFile, 'utf8').trim());
    if (existingPid && existingPid !== process.pid && isProcessAlive(existingPid)) {
      logger.warn(`Backend already running on port ${basePort}`);
      logger.warn(`Another backend instance is active (PID ${existingPid}).`);
      logger.info(`Suggestion: taskkill /PID ${existingPid} /F`);
      return false;
    }
  }

  fs.writeFileSync(devLockFile, String(process.pid), 'utf8');
  return true;
}

function releaseDevLock() {
  if (config.nodeEnv !== 'development') return;
  if (!fs.existsSync(devLockFile)) return;

  const existingPid = Number(fs.readFileSync(devLockFile, 'utf8').trim());
  if (!existingPid || existingPid === process.pid) {
    fs.unlinkSync(devLockFile);
  }
}

async function findPidsUsingPort(port) {
  try {
    let stdout = '';
    if (process.platform === 'win32') {
      ({ stdout } = await execAsync(`netstat -ano -p tcp | findstr :${port}`));
    } else {
      ({ stdout } = await execAsync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`));
    }

    const lines = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (process.platform === 'win32') {
      const pids = lines
        .map((line) => line.split(/\s+/).pop())
        .filter((value) => /^\d+$/.test(value));
      return [...new Set(pids)];
    }

    return [...new Set(lines.filter((value) => /^\d+$/.test(value)))];
  } catch {
    return [];
  }
}

async function logPortConflict(port) {
  logger.error(`Port ${port} is already in use (EADDRINUSE).`);
  if (port === basePort) {
    logger.warn(`Backend already running on port ${basePort}`);
  }

  const pids = await findPidsUsingPort(port);
  if (pids.length) {
    logger.info(`Possible owning PID(s): ${pids.join(', ')}`);
    if (process.platform === 'win32') {
      logger.info(`Kill command: taskkill /PID ${pids[0]} /F`);
    } else {
      logger.info(`Kill command: kill -9 ${pids[0]}`);
    }
  } else if (process.platform === 'win32') {
    logger.info(`Check PID with: netstat -ano | findstr :${port}`);
  } else {
    logger.info(`Check PID with: lsof -nP -iTCP:${port} -sTCP:LISTEN`);
  }
}

function listenOnPort(port) {
  return new Promise((resolve, reject) => {
    const nextServer = http.createServer(app);
    nextServer.once('error', reject);
    nextServer.listen(port, () => {
      nextServer.removeListener('error', reject);
      resolve(nextServer);
    });
  });
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`Received ${signal}. Shutting down gracefully...`);

  try {
    if (reconciliationTimer) {
      clearInterval(reconciliationTimer);
      reconciliationTimer = null;
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
      server = null;
    }

    if (db.mongoose.connection.readyState !== 0) {
      await db.mongoose.disconnect();
    }
  } catch (err) {
    logger.error(`Shutdown cleanup failed: ${err.message}`);
  } finally {
    releaseDevLock();
  }

  if (signal === 'SIGUSR2') {
    process.kill(process.pid, 'SIGUSR2');
    return;
  }

  process.exit(0);
}

function registerSignalHandlers() {
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGUSR2', () => shutdown('SIGUSR2'));
}

async function start() {
  if (!writeDevLock()) {
    process.exit(0);
  }

  registerSignalHandlers();

  try {
    await db.connect();
    blockchainService.assertContractAbiCompatibility();

    for (const port of candidatePorts) {
      try {
        server = await listenOnPort(port);
        logger.info(`Server listening on http://localhost:${port}`);
        if (port !== basePort) {
          logger.warn(`Configured port ${basePort} was busy. Started on fallback port ${port}.`);
        }
        break;
      } catch (err) {
        if (err && err.code === 'EADDRINUSE') {
          await logPortConflict(port);
          continue;
        }
        throw err;
      }
    }

    if (!server) {
      await db.mongoose.disconnect();
      logger.error(`Could not start backend. Tried ports: ${candidatePorts.join(', ')}.`);
      process.exit(1);
    }

    reconciliationTimer = startReconciliationJob();
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    if (db.mongoose.connection.readyState !== 0) {
      await db.mongoose.disconnect();
    }
    releaseDevLock();
    process.exit(1);
  }
}

start();

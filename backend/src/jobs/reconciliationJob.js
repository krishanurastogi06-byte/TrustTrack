const config = require('../config/env');
const logger = require('../lib/logger');
const { reconcilePendingTransactions } = require('../services/reconciliationService');

function startReconciliationJob() {
  if (!config.enableReconciliation) {
    logger.info('Reconciliation job disabled (ENABLE_RECONCILIATION=false)');
    return null;
  }

  const intervalMs = Math.max(5000, Number(config.reconcileIntervalMs || 60000));
  const batchSize = Math.max(1, Number(config.reconcileBatchSize || 25));

  const timer = setInterval(async () => {
    try {
      const summary = await reconcilePendingTransactions({ limit: batchSize });
      logger.info('Reconciliation tick complete', summary);
    } catch (err) {
      logger.error('Reconciliation tick failed', { error: err.message });
    }
  }, intervalMs);

  logger.info(`Reconciliation job started (interval=${intervalMs}ms, batch=${batchSize})`);
  return timer;
}

module.exports = { startReconciliationJob };

const path = require('path');
const dotenv = require('dotenv');

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const required = ['NODE_ENV', 'PORT', 'MONGO_URI', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length && process.env.NODE_ENV !== 'test') {
  console.warn(`Missing required env vars: ${missing.join(', ')}`);
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  ipfsApiKey: process.env.IPFS_API_KEY,
  ethRpcUrl: process.env.ETHEREUM_RPC_URL,
  deployerPrivateKey: process.env.DEPLOYER_PRIVATE_KEY,
  donationContractAddress: process.env.DONATION_CONTRACT_ADDRESS,
  donationNetwork: process.env.DONATION_NETWORK || 'hardhat',
  webhookSecret: process.env.WEBHOOK_SECRET,
  enableReconciliation: process.env.ENABLE_RECONCILIATION === 'true',
  reconcileIntervalMs: Number(process.env.RECONCILE_INTERVAL_MS || 60000),
  reconcileBatchSize: Number(process.env.RECONCILE_BATCH_SIZE || 25),
  adminEmail: process.env.ADMIN_EMAIL,
  corsOrigin: process.env.CORS_ORIGIN,
  trustProxy: process.env.TRUST_PROXY === 'true',
};

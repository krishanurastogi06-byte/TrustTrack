const path = require('path');
const dotenv = require('dotenv');

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isTest = nodeEnv === 'test';

function requireEnv(name) {
  const value = process.env[name];
  if (value == null || String(value).trim() === '') {
    throw new Error(`[config] Missing required environment variable: ${name}`);
  }
  return String(value).trim();
}

if (!isTest) {
  const required = ['NODE_ENV', 'PORT', 'MONGO_URI', 'JWT_SECRET', 'DONATION_NETWORK', 'ETHEREUM_RPC_URL', 'CHAIN_ID', 'DONATION_CONTRACT_ADDRESS'];
  const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim() === '');
  if (missing.length) {
    throw new Error(`[config] Missing required environment variables: ${missing.join(', ')}`);
  }

  const donationNetwork = String(process.env.DONATION_NETWORK || '').trim();
  if (donationNetwork !== 'polygonAmoy') {
    throw new Error(`[config] Invalid DONATION_NETWORK="${donationNetwork}". Only "polygonAmoy" is allowed at runtime.`);
  }

  const chainId = Number(process.env.CHAIN_ID);
  if (!Number.isInteger(chainId) || chainId !== 80002) {
    throw new Error(`[config] Invalid CHAIN_ID="${process.env.CHAIN_ID}". Only 80002 (Polygon Amoy) is allowed at runtime.`);
  }

  const ethRpcUrl = String(process.env.ETHEREUM_RPC_URL || '').trim().toLowerCase();
  if (!ethRpcUrl || ethRpcUrl.includes('127.0.0.1') || ethRpcUrl.includes('localhost')) {
    throw new Error('[config] ETHEREUM_RPC_URL must be a Polygon Amoy RPC endpoint and cannot point to localhost.');
  }
}

module.exports = {
  nodeEnv,
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  ipfsApiKey: process.env.IPFS_API_KEY,
  ethRpcUrl: process.env.ETHEREUM_RPC_URL,
  deployerPrivateKey: process.env.DEPLOYER_PRIVATE_KEY,
  donationContractAddress: process.env.DONATION_CONTRACT_ADDRESS,
  donationNetwork: isTest ? (process.env.DONATION_NETWORK || 'polygonAmoy') : requireEnv('DONATION_NETWORK'),
  chainId: Number(process.env.CHAIN_ID || 0),
  webhookSecret: process.env.WEBHOOK_SECRET,
  enableReconciliation: process.env.ENABLE_RECONCILIATION === 'true',
  reconcileIntervalMs: Number(process.env.RECONCILE_INTERVAL_MS || 60000),
  reconcileBatchSize: Number(process.env.RECONCILE_BATCH_SIZE || 25),
  adminEmail: process.env.ADMIN_EMAIL,
  corsOrigin: process.env.CORS_ORIGIN,
  trustProxy: process.env.TRUST_PROXY === 'true',
};

const config = require('../config/env');

// Uses IPFS HTTP client. Configure via env (e.g., INFURA or local IPFS node).
let clientPromise;
async function getClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { create } = await import('ipfs-http-client');
      const url = process.env.IPFS_API_URL || 'https://ipfs.infura.io:5001';
      return create({ url });
    })();
  }
  return clientPromise;
}

async function addBuffer(buffer, filename) {
  const ipfs = await getClient();
  const timeoutMs = Number(process.env.IPFS_UPLOAD_TIMEOUT_MS || 8000);
  const addPromise = ipfs.add({ content: buffer, path: filename });
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`IPFS upload timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  const result = await Promise.race([addPromise, timeoutPromise]);
  // result: { cid, path, size }
  return { cid: result.cid.toString(), path: result.path, size: result.size };
}

function gatewayUrl(cid) {
  return `https://ipfs.io/ipfs/${cid}`;
}

module.exports = { addBuffer, gatewayUrl };

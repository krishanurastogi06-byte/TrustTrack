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
  const result = await ipfs.add({ content: buffer, path: filename });
  // result: { cid, path, size }
  return { cid: result.cid.toString(), path: result.path, size: result.size };
}

function gatewayUrl(cid) {
  return `https://ipfs.io/ipfs/${cid}`;
}

module.exports = { addBuffer, gatewayUrl };

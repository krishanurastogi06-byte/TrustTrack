const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const config = require('../config/env');

let provider;
let signer;
let donationContract;

function getProvider() {
  if (!config.ethRpcUrl) {
    const err = new Error('ETHEREUM_RPC_URL is not configured');
    err.status = 500;
    throw err;
  }
  if (!provider) {
    provider = new ethers.JsonRpcProvider(config.ethRpcUrl);
  }
  return provider;
}

function normalizeCampaignId(campaignId) {
  if (typeof campaignId === 'number' || typeof campaignId === 'bigint') {
    return BigInt(campaignId);
  }

  const raw = String(campaignId || '').trim();
  if (!raw) {
    const err = new Error('campaignId is required for blockchain release');
    err.status = 400;
    err.code = 'INVALID_CAMPAIGN_ID';
    throw err;
  }

  if (/^\d+$/.test(raw)) {
    return BigInt(raw);
  }

  // Use Mongo ObjectId value deterministically as uint256.
  if (/^[a-fA-F0-9]{24}$/.test(raw)) {
    return BigInt(`0x${raw}`);
  }

  if (/^0x[a-fA-F0-9]+$/.test(raw)) {
    return BigInt(raw);
  }

  const err = new Error('Unsupported campaignId format for blockchain release');
  err.status = 400;
  err.code = 'INVALID_CAMPAIGN_ID';
  throw err;
}

function normalizeMilestoneId(milestoneId) {
  if (typeof milestoneId === 'number' || typeof milestoneId === 'bigint') {
    return BigInt(milestoneId);
  }

  const raw = String(milestoneId || '').trim();
  if (!raw) {
    const err = new Error('milestoneId is required for blockchain release');
    err.status = 400;
    err.code = 'INVALID_MILESTONE_ID';
    throw err;
  }

  if (/^\d+$/.test(raw)) return BigInt(raw);
  if (/^[a-fA-F0-9]{24}$/.test(raw)) return BigInt(`0x${raw}`);
  if (/^0x[a-fA-F0-9]+$/.test(raw)) return BigInt(raw);

  const err = new Error('Unsupported milestoneId format for blockchain release');
  err.status = 400;
  err.code = 'INVALID_MILESTONE_ID';
  throw err;
}

function hasContractFunction(contract, signature) {
  try {
    contract.interface.getFunction(signature);
    return true;
  } catch (_e) {
    return false;
  }
}

function parseAmountToWei(amountEth) {
  if (typeof amountEth === 'bigint') return amountEth;
  if (typeof amountEth === 'number' && !Number.isFinite(amountEth)) {
    const err = new Error('Invalid milestone amount');
    err.status = 400;
    err.code = 'INVALID_MILESTONE_AMOUNT';
    throw err;
  }

  const raw = String(amountEth || '').trim();
  if (!raw || raw === '0') {
    const err = new Error('Milestone amount must be greater than zero');
    err.status = 400;
    err.code = 'INVALID_MILESTONE_AMOUNT';
    throw err;
  }

  return ethers.parseEther(raw);
}

function readDeploymentArtifact() {
  const deploymentPath = path.resolve(process.cwd(), 'deployments', `${config.donationNetwork}.donation.json`);
  if (!fs.existsSync(deploymentPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  } catch (_err) {
    return null;
  }
}

function getDonationContractConfig() {
  const deployment = readDeploymentArtifact();
  const address = config.donationContractAddress || deployment?.address;
  const abi = deployment?.abi;

  if (!address || !ethers.isAddress(address)) {
    const err = new Error('Donation contract address is not configured or invalid');
    err.status = 500;
    err.code = 'DONATION_CONTRACT_NOT_CONFIGURED';
    throw err;
  }

  if (!Array.isArray(abi) || !abi.length) {
    const err = new Error('Donation contract ABI is unavailable');
    err.status = 500;
    err.code = 'DONATION_CONTRACT_ABI_MISSING';
    throw err;
  }

  return { address, abi };
}

function getSigner() {
  if (!config.deployerPrivateKey) {
    const err = new Error('DEPLOYER_PRIVATE_KEY is not configured');
    err.status = 500;
    err.code = 'BLOCKCHAIN_SIGNER_NOT_CONFIGURED';
    throw err;
  }

  if (!signer) {
    signer = new ethers.Wallet(config.deployerPrivateKey, getProvider());
  }
  return signer;
}

function getDonationContract() {
  if (!donationContract) {
    const { address, abi } = getDonationContractConfig();
    donationContract = new ethers.Contract(address, abi, getSigner());
  }

  return donationContract;
}

async function getTransactionStatus(txHash) {
  const p = getProvider();
  const receipt = await p.getTransactionReceipt(txHash);

  if (!receipt) {
    return { status: 'pending', confirmations: 0, receipt: null, blockNumber: null };
  }

  const latest = await p.getBlockNumber();
  const confirmations = Math.max(0, latest - receipt.blockNumber + 1);
  const status = receipt.status === 1 ? 'confirmed' : 'failed';

  return {
    status,
    confirmations,
    blockNumber: receipt.blockNumber,
    receipt,
  };
}

async function releaseCampaignFunds({ campaignId, ngoAddress }) {
  if (!ngoAddress || !ethers.isAddress(ngoAddress)) {
    const err = new Error('Valid NGO wallet address is required to release funds');
    err.status = 400;
    err.code = 'INVALID_NGO_WALLET_ADDRESS';
    throw err;
  }

  const campaignChainId = normalizeCampaignId(campaignId);

  try {
    const contract = getDonationContract();
    const tx = await contract.releaseFunds(campaignChainId, ngoAddress);
    const receipt = await tx.wait(1);

    return {
      txHash: tx.hash,
      campaignChainId: campaignChainId.toString(),
      receipt,
    };
  } catch (error) {
    const err = new Error(error?.shortMessage || error?.reason || error?.message || 'Blockchain release failed');
    err.status = 502;
    err.code = 'BLOCKCHAIN_RELEASE_FAILED';
    throw err;
  }
}

async function releaseMilestoneFunds({ milestoneId, campaignId, ngoAddress, milestoneAmountEth }) {
  if (!ngoAddress || !ethers.isAddress(ngoAddress)) {
    const err = new Error('Valid NGO wallet address is required to release funds');
    err.status = 400;
    err.code = 'INVALID_NGO_WALLET_ADDRESS';
    throw err;
  }

  const campaignChainId = normalizeCampaignId(campaignId);
  const milestoneChainId = normalizeMilestoneId(milestoneId);
  const milestoneAmountWei = parseAmountToWei(milestoneAmountEth);
  const normalizedNgoAddress = ethers.getAddress(ngoAddress);

  try {
    const contract = getDonationContract();

    // New contract flow: registerCampaign -> registerMilestone -> releaseFunds
    if (
      hasContractFunction(contract, 'registerCampaign(uint256,address)') &&
      hasContractFunction(contract, 'registerMilestone(uint256,uint256,uint256)') &&
      hasContractFunction(contract, 'releaseFunds(uint256)')
    ) {
      try {
        // Register campaign if not already registered
        const campaignTx = await contract.registerCampaign(campaignChainId, normalizedNgoAddress);
        await campaignTx.wait(1);
      } catch (error) {
        // Campaign may already be registered, continue if so
        if (!error?.reason?.includes('already')) {
          throw error;
        }
      }

      try {
        // Register milestone if not already registered
        const milestoneTx = await contract.registerMilestone(milestoneChainId, campaignChainId, milestoneAmountWei);
        await milestoneTx.wait(1);
      } catch (error) {
        // Milestone may already be registered, continue if so
        if (!error?.reason?.includes('already')) {
          throw error;
        }
      }

      // Release funds for milestone
      const releaseTx = await contract.releaseFunds(milestoneChainId);
      const receipt = await releaseTx.wait(1);

      return {
        txHash: releaseTx.hash,
        campaignChainId: campaignChainId.toString(),
        milestoneChainId: milestoneChainId.toString(),
        receipt,
      };
    }

    // Backward-compatible legacy flow
    if (hasContractFunction(contract, 'releaseFunds(uint256,address)')) {
      const tx = await contract.releaseFunds(campaignChainId, normalizedNgoAddress);
      const receipt = await tx.wait(1);
      return {
        txHash: tx.hash,
        campaignChainId: campaignChainId.toString(),
        milestoneChainId: milestoneChainId.toString(),
        receipt,
      };
    }

    const err = new Error('Donation contract does not expose supported release function signatures');
    err.status = 500;
    err.code = 'DONATION_CONTRACT_UNSUPPORTED';
    throw err;
  } catch (error) {
    const err = new Error(error?.shortMessage || error?.reason || error?.message || 'Blockchain release failed');
    err.status = 502;
    err.code = 'BLOCKCHAIN_RELEASE_FAILED';
    throw err;
  }
}

module.exports = {
  getProvider,
  getTransactionStatus,
  releaseCampaignFunds,
  releaseMilestoneFunds,
  normalizeCampaignId,
  normalizeMilestoneId,
  getContractBalance,
  getCampaignFunds,
};

async function getContractBalance() {
  try {
    const contract = getDonationContract();
    const address = contract.getAddress();
    const provider = getProvider();
    const balanceWei = await provider.getBalance(address);
    const balanceEth = ethers.formatEther(balanceWei);

    return {
      balanceWei: balanceWei.toString(),
      balanceEth: balanceEth,
      address: await address,
    };
  } catch (error) {
    const err = new Error(error?.message || 'Failed to fetch contract balance');
    err.status = 502;
    err.code = 'BLOCKCHAIN_BALANCE_FETCH_FAILED';
    throw err;
  }
}

async function getCampaignFunds(campaignId) {
  if (!campaignId) {
    const err = new Error('campaignId is required');
    err.status = 400;
    err.code = 'INVALID_CAMPAIGN_ID';
    throw err;
  }

  const campaignChainId = normalizeCampaignId(campaignId);

  try {
    const contract = getDonationContract();
    const fundsWei = await contract.getCampaignFunds(campaignChainId);
    const fundsEth = ethers.formatEther(fundsWei);

    return {
      campaignId: campaignId,
      campaignChainId: campaignChainId.toString(),
      fundsWei: fundsWei.toString(),
      fundsEth: fundsEth,
    };
  } catch (error) {
    const err = new Error(error?.message || 'Failed to fetch campaign funds');
    err.status = 502;
  }
}

module.exports = {
  getProvider,
  getTransactionStatus,
  releaseCampaignFunds,
  releaseMilestoneFunds,
  normalizeCampaignId,
  normalizeMilestoneId,
  getContractBalance,
  getCampaignFunds,
};

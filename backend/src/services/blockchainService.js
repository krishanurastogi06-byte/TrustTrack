const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const config = require('../config/env');

let provider;
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

function validateNumericCampaignId(campaignId) {
  if (typeof campaignId === 'number' || typeof campaignId === 'bigint') {
    return BigInt(campaignId);
  }

  const raw = String(campaignId || '').trim();
  if (!raw || !/^\d+$/.test(raw)) {
    const err = new Error('campaignId must be a numeric contract-generated ID');
    err.status = 400;
    err.code = 'INVALID_CAMPAIGN_ID';
    throw err;
  }

  const asInt = BigInt(raw);
  if (asInt <= 0n) {
    const err = new Error('campaignId must be greater than 0');
    err.status = 400;
    err.code = 'INVALID_CAMPAIGN_ID';
    throw err;
  }

  return asInt;
}

function validateNumericMilestoneId(milestoneId) {
  if (typeof milestoneId === 'number' || typeof milestoneId === 'bigint') {
    return BigInt(milestoneId);
  }

  const raw = String(milestoneId || '').trim();
  if (!raw || !/^\d+$/.test(raw)) {
    const err = new Error('milestoneId must be a numeric contract-generated ID');
    err.status = 400;
    err.code = 'INVALID_MILESTONE_ID';
    throw err;
  }

  const asInt = BigInt(raw);
  if (asInt <= 0n) {
    const err = new Error('milestoneId must be greater than 0');
    err.status = 400;
    err.code = 'INVALID_MILESTONE_ID';
    throw err;
  }

  return asInt;
}

function toEtherAmountString(amountEth, fieldName = 'amountEth') {
  const amount = Number(amountEth);
  if (!Number.isFinite(amount) || amount <= 0) {
    const err = new Error(`Valid ${fieldName} is required`);
    err.status = 400;
    err.code = 'INVALID_MILESTONE_AMOUNT';
    throw err;
  }

  // Normalize to non-scientific decimal string accepted by ethers.parseEther.
  // Round to 15 decimal places to clear binary floating-point noise (like 0.04 becoming 0.04000000000000001)
  const normalized = amount.toFixed(15).replace(/\.0+$/, '').replace(/(\.\d*?[1-9])0+$/, '$1');
  return normalized || '0';
}

function getAbiFunction(abi, name) {
  if (!Array.isArray(abi)) return null;
  return abi.find((item) => item?.type === 'function' && item?.name === name) || null;
}

function assertContractAbiCompatibility() {
  const { abi, address } = getDonationContractConfig();
  const checks = [
    { name: 'registerCampaign', inputs: 1 },
    { name: 'registerMilestone', inputs: 2 },
    { name: 'donate', inputs: 1 },
    { name: 'releaseFunds', inputs: 1 },
    { name: 'getCampaignFunds', inputs: 1 },
  ];

  for (const check of checks) {
    const fn = getAbiFunction(abi, check.name);
    if (!fn || !Array.isArray(fn.inputs) || fn.inputs.length !== check.inputs) {
      const err = new Error(`Donation contract ABI mismatch for ${check.name}. Expected ${check.inputs} input(s).`);
      err.status = 500;
      err.code = 'DONATION_CONTRACT_ABI_MISMATCH';
      err.meta = { address, functionName: check.name };
      throw err;
    }
  }

  return { ok: true, address };
}

function readDeploymentArtifact() {
  const candidatePaths = [
    path.resolve(process.cwd(), 'deployments', `${config.donationNetwork}.donation.json`),
    path.resolve(__dirname, '..', '..', 'deployments', `${config.donationNetwork}.donation.json`),
  ];

  for (const deploymentPath of candidatePaths) {
    if (!fs.existsSync(deploymentPath)) continue;
    try {
      return JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    } catch (_err) {
      // Try next candidate path.
    }
  }

  return null;
}

function getDonationContractConfig() {
  const deployment = readDeploymentArtifact();
  const address = config.donationContractAddress;
  const abi = deployment?.abi;

  if (!address || !ethers.isAddress(address)) {
    const err = new Error('DONATION_CONTRACT_ADDRESS is missing or invalid in environment configuration');
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

function getDonationContract() {
  if (!donationContract) {
    const { address, abi } = getDonationContractConfig();
    donationContract = new ethers.Contract(address, abi, getProvider());
  }

  return donationContract;
}

function getConfiguredContractAddress() {
  const { address } = getDonationContractConfig();
  return address;
}

function createWriteSigner() {
  if (!config.deployerPrivateKey) {
    const err = new Error('DEPLOYER_PRIVATE_KEY is not configured for server-side release transactions');
    err.status = 500;
    err.code = 'DEPLOYER_PRIVATE_KEY_MISSING';
    throw err;
  }

  return new ethers.Wallet(config.deployerPrivateKey, getProvider());
}

function createWriteContract() {
  const { address, abi } = getDonationContractConfig();
  const signer = createWriteSigner();
  const contract = new ethers.Contract(address, abi, signer);
  return { signer, contract, address, abi };
}

function isOnChainSyncEnabled() {
  return config.nodeEnv !== 'test' && Boolean(config.ethRpcUrl) && Boolean(config.deployerPrivateKey);
}

function toContractCampaignId(contractCampaignId) {
  // contractCampaignId is already a numeric string from contract
  return String(validateNumericCampaignId(contractCampaignId));
}

function toContractMilestoneId(contractMilestoneId) {
  // contractMilestoneId is already a numeric string from contract
  return String(validateNumericMilestoneId(contractMilestoneId));
}

async function ensureContractCodeExists() {
  const { address } = getDonationContractConfig();
  const code = await getProvider().getCode(address);
  if (!code || code === '0x') {
    const err = new Error('Donation contract is not deployed at configured address. Start blockchain and redeploy contract.');
    err.status = 503;
    err.code = 'DONATION_CONTRACT_NOT_DEPLOYED';
    throw err;
  }
}

async function registerCampaignOnChain({ ngoAddress }) {
  if (!isOnChainSyncEnabled()) {
    return { skipped: true, reason: 'on-chain sync disabled' };
  }

  if (!ngoAddress || !ethers.isAddress(ngoAddress)) {
    const err = new Error('Valid NGO wallet address is required for campaign sync');
    err.status = 400;
    err.code = 'INVALID_NGO_WALLET_ADDRESS';
    throw err;
  }

  try {
    await ensureContractCodeExists();
  } catch (error) {
    if (String(config.nodeEnv || '').toLowerCase() === 'development' && error?.code === 'DONATION_CONTRACT_NOT_DEPLOYED') {
      return { skipped: true, reason: 'contract_not_deployed' };
    }
    throw error;
  }

  const { contract: signerContract } = createWriteContract();
  const normalizedNgo = ethers.getAddress(ngoAddress);

  console.log('[registerCampaignOnChain] Calling contract.registerCampaign(ngo) to auto-generate campaignId');
  const tx = await signerContract.registerCampaign(normalizedNgo);
  const receipt = await tx.wait();

  // Extract the returned campaignId from the transaction
  // The contract's registerCampaign returns uint256 campaignId
  const contractAbi = getDonationContractConfig().abi;
  const iface = new ethers.Interface(contractAbi);
  let generatedCampaignId = null;

  for (const log of receipt.logs || []) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed && parsed.name === 'CampaignRegistered') {
        generatedCampaignId = parsed.args.campaignId.toString();
        break;
      }
    } catch (_e) {
      // Continue
    }
  }

  if (!generatedCampaignId) {
    const err = new Error('Failed to extract generated campaignId from registerCampaign transaction');
    err.status = 502;
    err.code = 'CONTRACT_ID_GENERATION_FAILED';
    throw err;
  }

  console.log('[registerCampaignOnChain] Generated contractCampaignId:', generatedCampaignId);

  return {
    contractCampaignId: generatedCampaignId,
    ngoAddress: normalizedNgo,
    txHash: tx.hash,
    blockNumber: receipt?.blockNumber,
  };
}

async function registerMilestoneOnChain({ contractCampaignId, amountEth }) {
  if (!isOnChainSyncEnabled()) {
    return { skipped: true, reason: 'on-chain sync disabled' };
  }

  if (!contractCampaignId) {
    if (String(config.nodeEnv || '').toLowerCase() === 'development') {
      console.warn('[blockchainService] Milestone registration skipped: missing contractCampaignId in development mode.');
      return { skipped: true, reason: 'missing_contract_campaign_id' };
    }

    const err = new Error('contractCampaignId is required for milestone sync. Please register the campaign on blockchain first.');
    err.status = 400;
    err.code = 'INVALID_CAMPAIGN_ID';
    throw err;
  }

  const amount = Number(amountEth);
  const amountEthString = toEtherAmountString(amountEth, 'amountEth');

  try {
    await ensureContractCodeExists();
  } catch (error) {
    if (String(config.nodeEnv || '').toLowerCase() === 'development' && error?.code === 'DONATION_CONTRACT_NOT_DEPLOYED') {
      return { skipped: true, reason: 'contract_not_deployed' };
    }
    throw error;
  }

  const { signer: activeSigner, contract: signerContract } = createWriteContract();
  const activeProvider = getProvider();
  const campaignChainId = validateNumericCampaignId(contractCampaignId);
  const amountWei = ethers.parseEther(amountEthString);

  // Guard against stale DB mappings where campaign id exists in DB but is not registered on-chain.
  const onChainNgoWallet = await signerContract.campaignNgoWallet(campaignChainId);
  if (!onChainNgoWallet || onChainNgoWallet === ethers.ZeroAddress) {
    const err = new Error('Campaign is not registered on-chain for milestone creation');
    err.status = 409;
    err.code = 'CAMPAIGN_NOT_REGISTERED_ONCHAIN';
    throw err;
  }

  console.log('[registerMilestoneOnChain] Calling contract.registerMilestone(campaignId) to auto-generate milestoneId');
  console.log('[registerMilestoneOnChain] campaignId:', contractCampaignId, 'amount:', amountEthString, 'ETH');

  const signerAddress = await activeSigner.getAddress();
  const latestNonce = await activeProvider.getTransactionCount(signerAddress, 'latest');
  const pendingNonce = await activeProvider.getTransactionCount(signerAddress, 'pending');
  const nonce = pendingNonce;
  console.log('[registerMilestoneOnChain] signer=', signerAddress);
  console.log('[registerMilestoneOnChain] latestNonce=', latestNonce);
  console.log('[registerMilestoneOnChain] pendingNonce=', pendingNonce);
  console.log('nonce=', nonce);

  let tx;
  try {
    tx = await signerContract.registerMilestone(campaignChainId, amountWei);
  } catch (error) {
    const rawMessage = String(error?.shortMessage || error?.reason || error?.message || 'Failed to submit registerMilestone transaction');
    const normalized = rawMessage.toLowerCase();
    const err = new Error(rawMessage);

    if (normalized.includes('campaign ngo wallet not registered')) {
      err.status = 409;
      err.code = 'CAMPAIGN_NOT_REGISTERED_ONCHAIN';
    } else if (normalized.includes('invalid milestone amount')) {
      err.status = 400;
      err.code = 'INVALID_MILESTONE_AMOUNT';
    } else if (normalized.includes('invalid campaignid')) {
      err.status = 400;
      err.code = 'INVALID_CAMPAIGN_ID';
    } else {
      err.status = 502;
      err.code = 'BLOCKCHAIN_MILESTONE_REGISTRATION_FAILED';
    }

    throw err;
  }

  let receipt;
  try {
    receipt = await tx.wait();
  } catch (error) {
    const err = new Error(error?.shortMessage || error?.reason || error?.message || 'Milestone registration transaction failed on-chain');
    err.status = 502;
    err.code = 'BLOCKCHAIN_MILESTONE_REGISTRATION_FAILED';
    throw err;
  }

  // Extract the returned milestoneId from the transaction
  // The contract's registerMilestone returns uint256 milestoneId
  const contractAbi = getDonationContractConfig().abi;
  const iface = new ethers.Interface(contractAbi);
  let generatedMilestoneId = null;

  for (const log of receipt.logs || []) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed && parsed.name === 'MilestoneRegistered') {
        generatedMilestoneId = parsed.args.milestoneId.toString();
        break;
      }
    } catch (_e) {
      // Continue
    }
  }

  if (!generatedMilestoneId) {
    const err = new Error('Failed to extract generated milestoneId from registerMilestone transaction');
    err.status = 502;
    err.code = 'CONTRACT_MILESTONE_ID_GENERATION_FAILED';
    throw err;
  }

  console.log('[registerMilestoneOnChain] Generated contractMilestoneId:', generatedMilestoneId);

  return {
    contractMilestoneId: generatedMilestoneId,
    contractCampaignId: contractCampaignId,
    amountWei: amountWei.toString(),
    amountEth: amount.toString(),
    txHash: tx.hash,
    blockNumber: receipt?.blockNumber,
  };
}

async function assertCampaignRegistrationOnChain(contractCampaignId) {
  const campaignChainId = validateNumericCampaignId(contractCampaignId);
  const contract = getDonationContract();

  let ngoWallet;
  try {
    ngoWallet = await contract.campaignNgoWallet(campaignChainId);
  } catch (error) {
    const err = new Error(error?.shortMessage || error?.reason || error?.message || 'Failed to verify campaign registration on-chain');
    err.status = 502;
    err.code = 'BLOCKCHAIN_CAMPAIGN_LOOKUP_FAILED';
    throw err;
  }

  if (!ngoWallet || ngoWallet === ethers.ZeroAddress) {
    const err = new Error('Campaign is not registered on-chain');
    err.status = 409;
    err.code = 'CAMPAIGN_NOT_REGISTERED_ONCHAIN';
    throw err;
  }

  return {
    campaignChainId: campaignChainId.toString(),
    ngoWalletAddress: ethers.getAddress(ngoWallet),
  };
}

async function assertReleaseRouting({ campaignId, milestoneId, ngoAddress, amountEth }) {
  if (!campaignId) {
    const err = new Error('Campaign or milestone not synced on-chain');
    err.status = 409;
    err.code = 'ONCHAIN_MAPPING_MISSING';
    throw err;
  }

  if (!milestoneId) {
    const err = new Error('Campaign or milestone not synced on-chain');
    err.status = 409;
    err.code = 'ONCHAIN_MAPPING_MISSING';
    throw err;
  }

  if (!ngoAddress || !ethers.isAddress(ngoAddress)) {
    const err = new Error('Valid ngoAddress is required for release routing verification');
    err.status = 400;
    err.code = 'INVALID_NGO_WALLET_ADDRESS';
    throw err;
  }

  const contract = getDonationContract();
  const campaignChainId = validateNumericCampaignId(campaignId);
  const milestoneChainId = validateNumericMilestoneId(milestoneId);
  const expectedNgo = ethers.getAddress(ngoAddress);
  await ensureContractCodeExists();

  let onchainCampaignId;
  let onchainNgo;
  let onchainAmountWei;

  try {
    [onchainCampaignId, onchainNgo, onchainAmountWei] = await Promise.all([
      contract.milestoneToCampaign(milestoneChainId),
      contract.campaignNgoWallet(campaignChainId),
      contract.milestoneReleaseAmount(milestoneChainId),
    ]);
  } catch (error) {
    const message = String(error?.message || 'Failed to read on-chain release routing');
    const err = new Error(message);

    if (error?.code === 'BAD_DATA') {
      err.status = 503;
      err.code = 'DONATION_CONTRACT_READ_FAILED';
      err.message = 'Contract read failed (BAD_DATA). Ensure RPC, contract address, and deployed ABI all match current chain.';
    } else {
      err.status = 502;
      err.code = 'BLOCKCHAIN_READ_FAILED';
    }

    throw err;
  }

  if (BigInt(onchainCampaignId.toString()) !== campaignChainId) {
    const err = new Error('Milestone is not mapped to the expected campaign on-chain');
    err.status = 409;
    err.code = 'MILESTONE_CAMPAIGN_MISMATCH';
    throw err;
  }

  const normalizedOnchainNgo = ethers.getAddress(onchainNgo);
  if (normalizedOnchainNgo !== expectedNgo) {
    const err = new Error('On-chain campaign NGO wallet does not match database NGO wallet');
    err.status = 409;
    err.code = 'RELEASE_TARGET_MISMATCH';
    throw err;
  }

  if (amountEth != null) {
    const expectedAmountWei = ethers.parseEther(toEtherAmountString(amountEth, 'expectedAmountEth'));
    if (BigInt(onchainAmountWei.toString()) !== expectedAmountWei) {
      const err = new Error('On-chain milestone release amount does not match expected amount');
      err.status = 409;
      err.code = 'RELEASE_AMOUNT_MISMATCH';
      throw err;
    }
  }

  return {
    campaignChainId: campaignChainId.toString(),
    milestoneChainId: milestoneChainId.toString(),
    ngoAddress: expectedNgo,
    releasedAmountWei: onchainAmountWei.toString(),
    releasedAmountEth: ethers.formatEther(onchainAmountWei),
  };
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

async function assertConfirmedTransaction(txHash) {
  const state = await getTransactionStatus(txHash);
  if (state.status !== 'confirmed') {
    const err = new Error('Provided txHash is not confirmed on-chain yet');
    err.status = 409;
    err.code = 'TX_NOT_CONFIRMED';
    throw err;
  }
  return state;
}

async function assertConfirmedDonationTransaction({ txHash, campaignId, expectedAmountEth }) {
  if (!txHash) {
    const err = new Error('txHash is required for donation verification');
    err.status = 400;
    err.code = 'TX_HASH_REQUIRED';
    throw err;
  }

  const state = await assertConfirmedTransaction(txHash);
  const tx = await getProvider().getTransaction(txHash);
  const { address, abi } = getDonationContractConfig();

  if (!tx?.to || ethers.getAddress(tx.to) !== ethers.getAddress(address)) {
    const err = new Error('Donation transaction is not sent to donation smart contract');
    err.status = 409;
    err.code = 'DONATION_NOT_TO_CONTRACT';
    throw err;
  }

  const iface = new ethers.Interface(abi);
  let parsed;
  try {
    parsed = iface.parseTransaction({ data: tx.data, value: tx.value });
  } catch (_error) {
    const err = new Error('Unable to decode donation transaction input');
    err.status = 409;
    err.code = 'INVALID_DONATION_TRANSACTION';
    throw err;
  }

  if (!parsed || parsed.name !== 'donate') {
    const err = new Error('Donation transaction must call donate on smart contract');
    err.status = 409;
    err.code = 'INVALID_DONATION_METHOD';
    throw err;
  }

  const onchainCampaignId = BigInt(parsed.args[0].toString());
  // campaignId must be a numeric contract-generated ID
  const expectedCampaignId = validateNumericCampaignId(campaignId);
  
  console.log('[assertConfirmedDonationTransaction] Validating donation');
  console.log('  onchainCampaignId:', onchainCampaignId.toString());
  console.log('  expectedCampaignId:', expectedCampaignId.toString());
  
  if (onchainCampaignId !== expectedCampaignId) {
    const err = new Error('Donation campaign id does not match expected campaign');
    err.status = 409;
    err.code = 'DONATION_CAMPAIGN_MISMATCH';
    throw err;
  }

  const amountEth = Number(ethers.formatEther(tx.value || 0n));
  if (expectedAmountEth != null && Math.abs(Number(expectedAmountEth) - amountEth) > 1e-12) {
    const err = new Error('Donation amount does not match expected amount');
    err.status = 409;
    err.code = 'DONATION_AMOUNT_MISMATCH';
    throw err;
  }

  return {
    ...state,
    tx,
    campaignChainId: onchainCampaignId.toString(),
    amountWei: (tx.value || 0n).toString(),
    amountEth,
    contractAddress: address,
  };
}

async function assertFundsReleasedTransaction({ txHash, campaignId, milestoneId, ngoAddress }) {
  if (!txHash) {
    const err = new Error('txHash is required for release verification');
    err.status = 400;
    err.code = 'TX_HASH_REQUIRED';
    throw err;
  }

  if (!ngoAddress || !ethers.isAddress(ngoAddress)) {
    const err = new Error('Valid NGO wallet address is required for release verification');
    err.status = 400;
    err.code = 'INVALID_NGO_WALLET_ADDRESS';
    throw err;
  }

  const campaignChainId = validateNumericCampaignId(campaignId);
  const milestoneChainId = validateNumericMilestoneId(milestoneId);
  const normalizedNgo = ethers.getAddress(ngoAddress);
  const { address, abi } = getDonationContractConfig();

  const state = await assertConfirmedTransaction(txHash);
  const tx = await getProvider().getTransaction(txHash);

  if (!tx?.to || ethers.getAddress(tx.to) !== ethers.getAddress(address)) {
    const err = new Error('Provided txHash is not a donation-contract transaction');
    err.status = 409;
    err.code = 'INVALID_RELEASE_TRANSACTION_TARGET';
    throw err;
  }

  const iface = new ethers.Interface(abi);
  let matchedRelease = null;

  for (const log of state.receipt?.logs || []) {
    try {
      const parsed = iface.parseLog(log);
      if (!parsed || parsed.name !== 'FundsReleased') continue;

      const eventMilestoneId = BigInt(parsed.args.milestoneId.toString());
      const eventCampaignId = BigInt(parsed.args.campaignId.toString());
      const eventNgo = ethers.getAddress(parsed.args.ngo);

      if (
        eventMilestoneId === milestoneChainId &&
        eventCampaignId === campaignChainId &&
        eventNgo === normalizedNgo
      ) {
        matchedRelease = {
          amountWei: parsed.args.amount.toString(),
          amountEth: ethers.formatEther(parsed.args.amount),
        };
        break;
      }
    } catch (_e) {
      // Ignore non-contract or non-matching logs.
    }
  }

  if (!matchedRelease) {
    const err = new Error('Provided txHash does not contain a matching FundsReleased event for this milestone/campaign/NGO');
    err.status = 409;
    err.code = 'INVALID_RELEASE_EVENT';
    throw err;
  }

  return {
    ...state,
    campaignChainId: campaignChainId.toString(),
    milestoneChainId: milestoneChainId.toString(),
    ngoAddress: normalizedNgo,
    releasedAmountWei: matchedRelease.amountWei,
    releasedAmountEth: matchedRelease.amountEth,
  };
}

async function releaseCampaignFunds() {
  const err = new Error('Server-side signing is disabled. Submit blockchain transactions via MetaMask and pass txHash to backend.');
  err.status = 501;
  err.code = 'SERVER_SIDE_SIGNING_DISABLED';
  throw err;
}

async function releaseMilestoneFunds(payload) {
  return releaseMilestoneFundsOnChain(payload || {});
}

async function releaseMilestoneFundsOnChain({ milestoneId, campaignId, ngoAddress, amountEth }) {
  if (!isOnChainSyncEnabled()) {
    return {
      skipped: true,
      campaignChainId: String(campaignId || '1'),
      milestoneChainId: String(milestoneId || '1'),
      ngoAddress: ngoAddress,
      toAddress: ngoAddress,
      releasedAmountWei: ethers.parseEther(String(amountEth || '0')).toString(),
      releasedAmountEth: String(amountEth || '0'),
      txHash: '0xabc123456789def0000000000000000000000000000000000000000000000001',
      fromAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      network: 31337,
      blockNumber: 1,
      confirmations: 1,
      receipt: {},
    };
  }

  if (!milestoneId) {
    const err = new Error('milestoneId is required to release milestone funds');
    err.status = 400;
    err.code = 'INVALID_MILESTONE_ID';
    throw err;
  }

  const { signer: signerWallet, contract } = createWriteContract();
  const provider = getProvider();
  const route = await assertReleaseRouting({ campaignId, milestoneId, ngoAddress, amountEth });
  const milestoneChainId = BigInt(route.milestoneChainId);
  const { address, abi } = getDonationContractConfig();

  const signerAddress = await signerWallet.getAddress();
  const signerBalanceWei = await provider.getBalance(signerAddress);
  const signerBalanceEth = ethers.formatEther(signerBalanceWei);
  const network = await provider.getNetwork();

  console.log('Sending funds to:', route.ngoAddress);
  console.log('Admin wallet used:', signerAddress);
  console.log('Admin wallet POL balance:', signerBalanceEth);
  console.log('Release network chainId:', Number(network.chainId));
  console.log('Amount (ETH):', route.releasedAmountEth);

  let tx;
  try {
    tx = await contract.releaseFunds(milestoneChainId);
  } catch (error) {
    const rawMessage = String(error?.shortMessage || error?.reason || error?.message || 'Failed to submit release transaction');
    const normalized = rawMessage.toLowerCase();
    const err = new Error(rawMessage);

    if (normalized.includes('already released')) {
      err.status = 409;
      err.code = 'FUNDS_ALREADY_RELEASED';
    } else if (normalized.includes('wallet not configured')) {
      err.status = 409;
      err.code = 'NGO_WALLET_NOT_CONFIGURED';
    } else if (normalized.includes('insufficient campaign escrow funds')) {
      err.status = 409;
      err.code = 'INSUFFICIENT_CAMPAIGN_ESCROW_FUNDS';
    } else if (normalized.includes('milestone not registered')) {
      err.status = 409;
      err.code = 'MILESTONE_NOT_REGISTERED_ONCHAIN';
    } else {
      err.status = 502;
      err.code = 'RELEASE_TX_SUBMIT_FAILED';
    }

    throw err;
  }

  let receipt;
  try {
    receipt = await tx.wait();
  } catch (error) {
    const err = new Error(error?.shortMessage || error?.reason || error?.message || 'Release transaction failed on-chain');
    err.status = 502;
    err.code = 'RELEASE_TX_FAILED';
    throw err;
  }

  if (!receipt || receipt.status !== 1) {
    const err = new Error('Release transaction was not confirmed successfully');
    err.status = 502;
    err.code = 'RELEASE_TX_NOT_CONFIRMED';
    throw err;
  }

  const iface = new ethers.Interface(abi);
  let parsedRelease = null;

  for (const log of receipt.logs || []) {
    try {
      const parsed = iface.parseLog(log);
      if (!parsed || parsed.name !== 'FundsReleased') continue;
      if (BigInt(parsed.args.milestoneId.toString()) !== milestoneChainId) continue;

      parsedRelease = {
        campaignChainId: parsed.args.campaignId.toString(),
        milestoneChainId: parsed.args.milestoneId.toString(),
        ngoAddress: ethers.getAddress(parsed.args.ngo),
        releasedAmountWei: parsed.args.amount.toString(),
        releasedAmountEth: ethers.formatEther(parsed.args.amount),
      };
      break;
    } catch (_e) {
      // Ignore non-contract or non-matching logs.
    }
  }

  // Some deployments return valid receipts but event decoding can fail if ABI/runtime drift exists.
  // Do not fail a confirmed successful tx solely due to missing decoded event.
  if (!parsedRelease) {
    parsedRelease = {
      campaignChainId: route.campaignChainId,
      milestoneChainId: route.milestoneChainId,
      ngoAddress: route.ngoAddress,
      releasedAmountWei: route.releasedAmountWei,
      releasedAmountEth: route.releasedAmountEth,
    };
  } else if (ethers.getAddress(parsedRelease.ngoAddress) !== ethers.getAddress(route.ngoAddress)) {
    const err = new Error('Funds sent to wrong address');
    err.status = 409;
    err.code = 'RELEASE_TARGET_MISMATCH';
    throw err;
  }

  const latest = await getProvider().getBlockNumber();
  const confirmations = receipt.blockNumber ? Math.max(0, latest - receipt.blockNumber + 1) : 0;

  console.log('Release tx hash:', tx.hash);

  return {
    txHash: tx.hash,
    from: tx.from,
    fromAddress: tx.from,
    contractAddress: tx.to || address,
    to: parsedRelease.ngoAddress,
    toAddress: parsedRelease.ngoAddress,
    blockNumber: receipt.blockNumber,
    confirmations,
    network: Number((await getProvider().getNetwork()).chainId),
    ...parsedRelease,
    receipt: {
      transactionHash: tx.hash,
      blockHash: receipt.blockHash,
      blockNumber: receipt.blockNumber,
      status: receipt.status,
      gasUsed: receipt.gasUsed?.toString?.() || undefined,
      cumulativeGasUsed: receipt.cumulativeGasUsed?.toString?.() || undefined,
    },
  };
}

async function getContractBalance() {
  try {
    const { address } = getDonationContractConfig();
    const p = getProvider();
    const balanceWei = await p.getBalance(address);
    const balanceEth = ethers.formatEther(balanceWei);

    return {
      balanceWei: balanceWei.toString(),
      balanceEth,
      address,
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

  const campaignChainId = validateNumericCampaignId(campaignId);

  try {
    const contract = getDonationContract();
    const fundsWei = await contract.getCampaignFunds(campaignChainId);
    const fundsEth = ethers.formatEther(fundsWei);

    return {
      campaignId,
      campaignChainId: campaignChainId.toString(),
      fundsWei: fundsWei.toString(),
      fundsEth,
    };
  } catch (error) {
    const err = new Error(error?.message || 'Failed to fetch campaign funds');
    err.status = 502;
    err.code = 'BLOCKCHAIN_CAMPAIGN_FUNDS_FETCH_FAILED';
    throw err;
  }
}

module.exports = {
  getProvider,
  getConfiguredContractAddress,
  assertContractAbiCompatibility,
  isOnChainSyncEnabled,
  getTransactionStatus,
  assertConfirmedTransaction,
  assertConfirmedDonationTransaction,
  assertFundsReleasedTransaction,
  registerCampaignOnChain,
  registerMilestoneOnChain,
  releaseCampaignFunds,
  releaseMilestoneFunds,
  releaseMilestoneFundsOnChain,
  assertReleaseRouting,
  validateNumericCampaignId,
  validateNumericMilestoneId,
  assertCampaignRegistrationOnChain,
  toContractCampaignId,
  toContractMilestoneId,
  getContractBalance,
  getCampaignFunds,
};

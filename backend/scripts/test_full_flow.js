const { ethers } = require('ethers');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const db = require('../src/lib/db');
const User = require('../src/models/User');
const Campaign = require('../src/models/Campaign');
const Milestone = require('../src/models/Milestone');
const campaignService = require('../src/services/campaignService');
const blockchainService = require('../src/services/blockchainService');
const fundRequestService = require('../src/services/fundRequestService');

async function runTest() {
  console.log('--- STARTING FULL FLOW TEST ---');
  
  // 1. Connect to DB
  await db.connect();
  
  // 2. Setup Accounts
  const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
  const adminSigner = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  
  // Hardhat Account #1 for Donor
  const donorPrivateKey = '59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
  const donorSigner = new ethers.Wallet(donorPrivateKey, provider);
  
  // Hardhat Account #2 for NGO
  const ngoPrivateKey = '5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';
  const ngoWalletAddress = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';

  console.log('Admin:', adminSigner.address);
  console.log('Donor:', donorSigner.address);
  console.log('NGO Wallet:', ngoWalletAddress);

  // 3. Create/Setup NGO User in DB
  console.log('\n1. Setting up NGO user...');
  let ngoUser = await User.findOne({ email: 'test-ngo@example.com' });
  if (ngoUser) await User.deleteOne({ _id: ngoUser._id });
  
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  ngoUser = await User.create({
    email: 'test-ngo@example.com',
    passwordHash: passwordHash,
    role: 'ngo',
    isVerified: true,
    verificationStatus: 'approved',
    walletAddress: ngoWalletAddress,
    profile: { organizationName: 'Test NGO' }
  });
  console.log('NGO User created/reset in DB.');

  // 4. Create Campaign (NGO)
  console.log('\n2. Creating Campaign (NGO)...');
  const campaignData = {
    title: 'Testing Local Flow',
    slug: 'testing-local-flow-' + Date.now(),
    description: 'This is a test campaign for local blockchain verification.',
    category: 'Education',
    fundingGoalINR: 100000,
    ngo: ngoUser._id,
    ngoWalletAddress: ngoWalletAddress,
    status: 'published'
  };
  
  const campaign = await campaignService.createCampaign(campaignData);
  console.log('Campaign created in DB and Syncing to Blockchain...');
  console.log('Contract Campaign ID:', campaign.contractCampaignId);
  
  if (!campaign.contractCampaignId) {
    throw new Error('Campaign failed to register on-chain!');
  }

  // 5. Add Milestones
  console.log('\n3. Adding Milestones...');
  const milestonesData = [
    { title: 'Milestone 1', description: 'First step', milestoneAmountINR: 50000, order: 1 }
  ];
  const syncedMilestones = await campaignService.syncCampaignMilestones(campaign._id, milestonesData);
  const milestone = syncedMilestones[0];
  console.log('Milestone created and Syncing to Blockchain...');
  console.log('Contract Milestone ID:', milestone.contractMilestoneId);

  // Set milestone status to approved so funds can be released
  await Milestone.findByIdAndUpdate(milestone._id, { status: 'approved' });
  console.log('Milestone status set to "approved" in DB.');

  // 6. Donor (Account #1) Donates
  console.log('\n4. Donor (Account #1) Donating...');
  const donationAmount = ethers.parseEther('0.3'); // 0.3 ETH to cover 0.2 ETH milestone
  
  const contractAddress = process.env.DONATION_CONTRACT_ADDRESS;
  const artifact = JSON.parse(require('fs').readFileSync('./deployments/localhost.donation.json', 'utf8'));
  const contract = new ethers.Contract(contractAddress, artifact.abi, donorSigner);
  
  console.log('Sending 0.1 ETH to campaign:', campaign.contractCampaignId);
  const donateTx = await contract.donate(campaign.contractCampaignId, { value: donationAmount });
  await donateTx.wait();
  console.log('Donation successful! TxHash:', donateTx.hash);

  // 7. Check Contract Balance
  const contractBalance = await provider.getBalance(contractAddress);
  console.log('Contract Balance:', ethers.formatEther(contractBalance), 'ETH');

  // 8. NGO Releases Funds (via Admin service)
  console.log('\n5. Releasing Funds (Admin)...');
  console.log('NGO Balance before release:', ethers.formatEther(await provider.getBalance(ngoWalletAddress)), 'ETH');
  
  const releaseResult = await fundRequestService.releaseApprovedMilestoneFunds({
    milestoneId: milestone._id,
    adminId: new mongoose.Types.ObjectId(), // Mock admin ID
    remarks: 'Milestone 1 proof verified',
    expectedNgoWalletAddress: ngoWalletAddress
  });
  
  console.log('Funds released! TxHash:', releaseResult.blockchain.txHash);
  console.log('NGO Balance after release:', ethers.formatEther(await provider.getBalance(ngoWalletAddress)), 'ETH');

  console.log('\n--- ALL TESTS PASSED SUCCESSFULLY! ---');
  process.exit(0);
}

runTest().catch(err => {
  console.error('\n!!! TEST FAILED !!!');
  console.error(err);
  if (err.errors) {
    console.error('Validation Errors:', JSON.stringify(err.errors, null, 2));
  }
  process.exit(1);
});

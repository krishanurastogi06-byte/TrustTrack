const { ethers } = require('ethers');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function run() {
  const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
  const contractAddress = process.env.DONATION_CONTRACT_ADDRESS;
  const deploymentPath = path.resolve(__dirname, 'deployments', 'localhost.donation.json');
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const abi = deployment.abi;

  const contract = new ethers.Contract(contractAddress, abi, provider);

  const campaignId = 4;
  console.log(`Checking campaign: ${campaignId}`);

  const ngoWallet = await contract.campaignNgoWallet(campaignId);
  const funds = await contract.campaignFunds(campaignId);
  console.log('NGO Wallet:', ngoWallet);
  console.log('Campaign Funds:', ethers.formatEther(funds), 'ETH');
  console.log('Campaign Funds (Wei):', funds.toString());

  // Check milestones 1 to 10
  for (let i = 1; i <= 10; i++) {
    const mCampaignId = await contract.milestoneToCampaign(i);
    if (mCampaignId.toString() === '0') continue;
    const amount = await contract.milestoneReleaseAmount(i);
    const released = await contract.milestoneReleased(i);
    console.log(`Milestone ${i}: Campaign=${mCampaignId}, Amount=${ethers.formatEther(amount)} ETH, Released=${released}`);
    console.log(`  Amount (Wei): ${amount.toString()}`);
  }
}

run().catch(console.error);

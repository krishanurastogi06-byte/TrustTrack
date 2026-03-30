const mongoose = require('mongoose');
const { ethers } = require('ethers');
const config = require('../src/config/env');
const Campaign = require('../src/models/Campaign');
const Milestone = require('../src/models/Milestone');
const blockchainService = require('../src/services/blockchainService');

async function connectDb() {
  if (!config.mongoUri) {
    throw new Error('MONGO_URI is not set');
  }
  await mongoose.connect(config.mongoUri);
}

async function syncCampaign(campaign) {
  if (campaign.contractCampaignId) {
    blockchainService.validateNumericCampaignId(campaign.contractCampaignId);
    return campaign.contractCampaignId;
  }

  const registration = await blockchainService.registerCampaignOnChain({
    ngoAddress: campaign.ngoWalletAddress,
  });

  if (registration.skipped) {
    return null;
  }

  campaign.contractCampaignId = registration.contractCampaignId;
  await campaign.save();

  return campaign.contractCampaignId;
}

async function syncMilestone(campaign, milestone) {
  const contractCampaignId = campaign.contractCampaignId;
  if (!contractCampaignId) return null;

  if (milestone.contractMilestoneId) {
    blockchainService.validateNumericMilestoneId(milestone.contractMilestoneId);
    return milestone.contractMilestoneId;
  }

  const registration = await blockchainService.registerMilestoneOnChain({
    contractCampaignId,
    amountEth: milestone.amount,
  });

  if (registration.skipped) {
    return null;
  }

  milestone.contractMilestoneId = registration.contractMilestoneId;
  await milestone.save();

  return milestone.contractMilestoneId;
}

async function run() {
  try {
    if (!blockchainService.isOnChainSyncEnabled()) {
      throw new Error('On-chain sync is disabled. Configure ETHEREUM_RPC_URL and DEPLOYER_PRIVATE_KEY.');
    }

    await connectDb();

    const campaigns = await Campaign.find({}).select('_id title ngoWalletAddress contractCampaignId').lean(false);
    console.log(`[sync] Found ${campaigns.length} campaigns`);

    for (const campaign of campaigns) {
      const contractCampaignId = await syncCampaign(campaign);
      console.log(`[sync] Campaign synced: ${campaign._id} -> ${contractCampaignId || 'skipped'}`);

      if (!contractCampaignId) {
        continue;
      }

      const milestones = await Milestone.find({ campaign: campaign._id }).select('_id title amount contractMilestoneId').lean(false);
      for (const milestone of milestones) {
        const contractMilestoneId = await syncMilestone(campaign, milestone);
        console.log(`[sync] Milestone synced: ${milestone._id} -> ${contractMilestoneId || 'skipped'}`);
      }
    }

    // Post-sync audit
    const contract = (() => {
      const { address, abi } = (() => {
        const deploymentPath = require('path').resolve(process.cwd(), 'deployments', `${config.donationNetwork}.donation.json`);
        const deployment = JSON.parse(require('fs').readFileSync(deploymentPath, 'utf8'));
        return { address: deployment.address, abi: deployment.abi };
      })();
      return new ethers.Contract(address, abi, blockchainService.getProvider());
    })();

    const campaignDocs = await Campaign.find({}).select('_id contractCampaignId ngoWalletAddress');
    for (const campaign of campaignDocs) {
      if (!campaign.contractCampaignId) continue;
      const onchainNgo = await contract.campaignNgoWallet(BigInt(campaign.contractCampaignId));
      if (ethers.getAddress(onchainNgo) !== ethers.getAddress(campaign.ngoWalletAddress)) {
        throw new Error(`Campaign wallet mismatch for ${campaign._id}`);
      }
    }

    const milestoneDocs = await Milestone.find({}).select('_id contractMilestoneId campaign amount');
    for (const milestone of milestoneDocs) {
      if (!milestone.contractMilestoneId) continue;
      const campaign = await Campaign.findById(milestone.campaign).select('contractCampaignId');
      if (!campaign?.contractCampaignId) continue;
      const onchainCampaign = await contract.milestoneToCampaign(BigInt(milestone.contractMilestoneId));
      const onchainAmount = await contract.milestoneReleaseAmount(BigInt(milestone.contractMilestoneId));
      if (BigInt(onchainCampaign.toString()) !== BigInt(campaign.contractCampaignId)) {
        throw new Error(`Milestone mapping mismatch for ${milestone._id}`);
      }
      const expectedAmountWei = ethers.parseEther(String(milestone.amount));
      if (BigInt(onchainAmount.toString()) !== expectedAmountWei) {
        throw new Error(`Milestone amount mismatch for ${milestone._id}`);
      }
    }

    console.log('[sync] On-chain mapping audit complete: no mismatches found');
    process.exit(0);
  } catch (error) {
    console.error('[sync] Failed:', error.message);
    process.exit(1);
  }
}

run();

/**
 * Migration script for contract-generated numeric IDs.
 * Repairs missing/invalid contractCampaignId and contractMilestoneId mappings.
 *
 * Usage: npm run migrate:contract-ids
 */

const mongoose = require('mongoose');
const config = require('../src/config/env');
const Campaign = require('../src/models/Campaign');
const Milestone = require('../src/models/Milestone');
const blockchainService = require('../src/services/blockchainService');

async function migrate() {
  let migratedCampaigns = 0;
  let migratedMilestones = 0;
  let failed = 0;

  try {
    await mongoose.connect(config.mongoUri);
    console.log('[migrate] Connected to MongoDB');

    const campaigns = await Campaign.find({}).select('_id title ngoWalletAddress contractCampaignId').lean(false);
    console.log(`[migrate] Auditing ${campaigns.length} campaigns`);

    const seenCampaignIds = new Map();

    for (const campaign of campaigns) {
      try {
        let needsCampaignRegistration = false;

        if (!campaign.contractCampaignId) {
          needsCampaignRegistration = true;
        } else {
          try {
            blockchainService.validateNumericCampaignId(campaign.contractCampaignId);
            if (seenCampaignIds.has(campaign.contractCampaignId)) {
              needsCampaignRegistration = true;
            } else {
              seenCampaignIds.set(campaign.contractCampaignId, String(campaign._id));
            }
          } catch (_e) {
            needsCampaignRegistration = true;
          }
        }

        if (needsCampaignRegistration) {
          const reg = await blockchainService.registerCampaignOnChain({ ngoAddress: campaign.ngoWalletAddress });
          if (!reg.skipped) {
            campaign.contractCampaignId = reg.contractCampaignId;
            await campaign.save();
            seenCampaignIds.set(reg.contractCampaignId, String(campaign._id));
            migratedCampaigns += 1;
            console.log('[migrate] campaign mapped', {
              campaignDbId: String(campaign._id),
              contractCampaignId: reg.contractCampaignId,
              txHash: reg.txHash,
            });
          }
        }

        const milestones = await Milestone.find({ campaign: campaign._id })
          .select('_id amount contractMilestoneId')
          .lean(false);

        const seenMilestoneIds = new Set();
        for (const milestone of milestones) {
          let needsMilestoneRegistration = false;

          if (!milestone.contractMilestoneId) {
            needsMilestoneRegistration = true;
          } else {
            try {
              blockchainService.validateNumericMilestoneId(milestone.contractMilestoneId);
              if (seenMilestoneIds.has(milestone.contractMilestoneId)) {
                needsMilestoneRegistration = true;
              } else {
                seenMilestoneIds.add(milestone.contractMilestoneId);
              }
            } catch (_e) {
              needsMilestoneRegistration = true;
            }
          }

          if (needsMilestoneRegistration && campaign.contractCampaignId) {
            const reg = await blockchainService.registerMilestoneOnChain({
              contractCampaignId: campaign.contractCampaignId,
              amountEth: milestone.amount,
            });
            if (!reg.skipped) {
              milestone.contractMilestoneId = reg.contractMilestoneId;
              await milestone.save();
              seenMilestoneIds.add(reg.contractMilestoneId);
              migratedMilestones += 1;
              console.log('[migrate] milestone mapped', {
                milestoneDbId: String(milestone._id),
                contractMilestoneId: reg.contractMilestoneId,
                contractCampaignId: campaign.contractCampaignId,
                txHash: reg.txHash,
              });
            }
          }
        }
      } catch (error) {
        failed += 1;
        console.error('[migrate] campaign migration error', {
          campaignDbId: String(campaign._id),
          message: error.message,
        });
      }
    }

    console.log('[migrate] complete', {
      migratedCampaigns,
      migratedMilestones,
      failed,
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[migrate] fatal', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrate();

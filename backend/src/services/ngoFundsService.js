const Campaign = require('../models/Campaign');
const Milestone = require('../models/Milestone');
const User = require('../models/User');

async function getNgoFundsSummary(ngoId) {
  // Fetch NGO details
  const ngo = await User.findOne({ _id: ngoId, role: 'ngo' }).select('_id email walletAddress profile');
  if (!ngo) {
    const err = new Error('NGO not found');
    err.status = 404;
    err.code = 'NGO_NOT_FOUND';
    throw err;
  }

  // Get all campaigns for this NGO
  const campaigns = await Campaign.find({ ngo: ngoId }).select('_id title fundingGoalETH');
  
  if (!campaigns.length) {
    return {
      ngo,
      totalReceivedEth: 0,
      totalPendingEth: 0,
      totalPossibleEth: 0,
      totalMilestoneAmountEth: 0,
      walletAddress: ngo.walletAddress,
      campaign_milestones: [],
    };
  }

  const campaignIds = campaigns.map((c) => c._id);

  // Get all milestones for these campaigns
  const milestones = await Milestone.find({ campaign: { $in: campaignIds } });

  // Calculate funds
  let totalReceivedEth = 0;
  let totalPendingEth = 0;
  let totalPossibleEth = 0;
  let totalMilestoneAmountEth = 0;
  const campaignMilestones = [];

  campaigns.forEach((campaign) => {
    const campaignMilestoneList = milestones.filter((m) => String(m.campaign) === String(campaign._id));
    const campaignPossibleEth = Number(campaign.fundingGoalETH || 0);

    const getMilestoneAmountEth = (milestone) => Number(
      milestone?.milestoneAmountETH ?? milestone?.amountETH ?? milestone?.amount ?? 0
    );

    const campaignMilestoneTotalEth = campaignMilestoneList.reduce(
      (sum, m) => sum + getMilestoneAmountEth(m),
      0
    );

    // A milestone is considered released when either legacy (isPaid) or fundRequest status marks release.
    const campaignReceived = campaignMilestoneList
      .filter((m) => m.isPaid || m.fundRequest?.status === 'released')
      .reduce(
        (sum, m) => sum + Number(m.fundRequest?.releasedAmount ?? getMilestoneAmountEth(m)),
        0
      );

    // Pending means all unreleased milestone value, regardless of request state (none/pending/rejected).
    const campaignPending = campaignMilestoneList
      .filter((m) => !(m.isPaid || m.fundRequest?.status === 'released'))
      .reduce((sum, m) => sum + getMilestoneAmountEth(m), 0);

    totalReceivedEth += campaignReceived;
    totalPendingEth += campaignPending;
    totalPossibleEth += campaignPossibleEth;
    totalMilestoneAmountEth += campaignMilestoneTotalEth;

    campaignMilestones.push({
      campaignId: campaign._id,
      title: campaign.title,
      possibleEth: campaignPossibleEth,
      receivedEth: campaignReceived,
      pendingEth: campaignPending,
      milestoneTotalEth: campaignMilestoneTotalEth,
      milestones: campaignMilestoneList.map((m) => ({
        _id: m._id,
        title: m.title,
        amountEth: getMilestoneAmountEth(m),
        status: m.status,
        isPaid: m.isPaid,
        fundRequestStatus: m.fundRequest?.status,
      })),
    });
  });

  return {
    ngo,
    totalReceivedEth,
    totalPendingEth,
    totalPossibleEth,
    totalMilestoneAmountEth,
    walletAddress: ngo.walletAddress,
    campaign_milestones: campaignMilestones,
  };
}

module.exports = { getNgoFundsSummary };

const Donation = require('../models/Donation');
const Transaction = require('../models/Transaction');

async function createDonation(data) {
  const donation = new Donation(data);
  const saved = await donation.save();

  if (saved.txHash) {
    await Transaction.findOneAndUpdate(
      { txHash: saved.txHash },
      {
        donation: saved._id,
        campaign: saved.campaign,
        donor: saved.donor,
      }
    );
  }

  return saved;
}

async function getDonationById(id) {
  return Donation.findById(id).populate('campaign donor');
}

async function findDonations({ page = 1, perPage = 10, campaignId, donorId, status } = {}) {
  const filter = {};
  if (campaignId) filter.campaign = campaignId;
  if (donorId) filter.donor = donorId;
  if (status) filter.status = status;

  const skip = (page - 1) * perPage;
  const [items, total] = await Promise.all([
    Donation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(perPage).populate('campaign donor').lean(),
    Donation.countDocuments(filter),
  ]);

  return { items, total };
}

module.exports = { createDonation, getDonationById, findDonations };

const request = require('supertest');
const bcryptjs = require('bcryptjs');
const app = require('../app');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Milestone = require('../models/Milestone');
const AuditLog = require('../models/AuditLog');
const Transaction = require('../models/Transaction');
const Donation = require('../models/Donation');

async function login(email, password) {
  const res = await request(app).post('/api/login').send({ email, password });
  return res.body.accessToken;
}

describe('Admin, NGO Verification, and Fund Release API', () => {
  let adminToken;
  let ngoToken;
  let donorToken;
  let adminUser;
  let ngoUser;
  let donorUser;

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Campaign.deleteMany({}),
      Milestone.deleteMany({}),
      AuditLog.deleteMany({}),
      Transaction.deleteMany({}),
      Donation.deleteMany({}),
    ]);

    adminUser = await User.create({
      email: 'admin2@example.com',
      passwordHash: await bcryptjs.hash('adminpass123', 10),
      role: 'admin',
      profile: { name: 'Admin 2' },
    });

    ngoUser = await User.create({
      email: 'ngo2@example.com',
      passwordHash: await bcryptjs.hash('ngopass123', 10),
      role: 'ngo',
      walletAddress: '0x3333333333333333333333333333333333333333',
      profile: { name: 'NGO 2', organizationName: 'Org 2' },
    });

    donorUser = await User.create({
      email: 'donor2@example.com',
      passwordHash: await bcryptjs.hash('donorpass123', 10),
      role: 'donor',
      profile: { name: 'Donor 2' },
    });

    adminToken = await login('admin2@example.com', 'adminpass123');
    ngoToken = await login('ngo2@example.com', 'ngopass123');
    donorToken = await login('donor2@example.com', 'donorpass123');
  });

  describe('NGO verification', () => {
    it('should list NGOs for admin only', async () => {
      const adminRes = await request(app)
        .get('/api/admin/ngos')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminRes.status).toBe(200);
      expect(Array.isArray(adminRes.body.items)).toBe(true);
      expect(adminRes.body.items.length).toBe(1);
      expect(adminRes.body.items[0].verificationStatus).toBe('pending');

      const donorRes = await request(app)
        .get('/api/admin/ngos')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(donorRes.status).toBe(403);
    });

    it('should approve NGO and allow campaign creation after approval', async () => {
      const deniedCampaign = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({
          title: 'Denied Campaign',
          slug: 'denied-campaign',
          description:
            'This campaign should fail because NGO is not verified before approval.',
          category: 'health',
          fundingGoal: 1000,
        });

      expect(deniedCampaign.status).toBe(403);
      expect(deniedCampaign.body.code).toBe('NGO_NOT_VERIFIED');

      const verifyRes = await request(app)
        .post(`/api/admin/ngos/${ngoUser._id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.ngo.isVerified).toBe(true);
      expect(verifyRes.body.ngo.verificationStatus).toBe('approved');

      const campaignRes = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({
          title: 'Approved Campaign',
          slug: 'approved-campaign',
          description:
            'This campaign should pass because NGO has been approved by an admin and now can publish.',
          category: 'health',
          fundingGoal: 1000,
        });

      expect(campaignRes.status).toBe(201);
      expect(campaignRes.body.campaign).toBeDefined();
    });

    it('should reject NGO verification update by non-admin', async () => {
      const res = await request(app)
        .post(`/api/admin/ngos/${ngoUser._id}/verify`)
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({ status: 'rejected' });

      expect(res.status).toBe(403);
    });
  });

  describe('Audit logs', () => {
    it('should expose admin audit logs and contain campaign creation action', async () => {
      await request(app)
        .post(`/api/admin/ngos/${ngoUser._id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' });

      const campaignRes = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({
          title: 'Audit Campaign',
          slug: 'audit-campaign',
          description:
            'This campaign should generate an audit entry for creation and remain queryable by admin users.',
          category: 'education',
          fundingGoal: 2200,
        });

      expect(campaignRes.status).toBe(201);

      const logsRes = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ action: 'CREATE_CAMPAIGN' });

      expect(logsRes.status).toBe(200);
      expect(Array.isArray(logsRes.body.items)).toBe(true);
      expect(logsRes.body.items.length).toBeGreaterThan(0);
      expect(logsRes.body.items[0].action).toBe('CREATE_CAMPAIGN');

      const ngoRes = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${ngoToken}`);

      expect(ngoRes.status).toBe(403);
    });
  });

  describe('Fund request and release', () => {
    async function prepareVerifiedNgoCampaignAndMilestone() {
      await request(app)
        .post(`/api/admin/ngos/${ngoUser._id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' });

      const campaignRes = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({
          title: 'Funds Campaign',
          slug: `funds-campaign-${Date.now()}`,
          description:
            'A campaign used to test milestone fund request and release behavior with verified proofs and states.',
          category: 'relief',
          fundingGoal: 5000,
        });

      const campaignId = campaignRes.body.campaign._id;

      const milestoneRes = await request(app)
        .post(`/api/campaigns/${campaignId}/milestones`)
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({
          title: 'Milestone One',
          amountETH: 1.0,
          order: 1,
        });

      const milestoneId = milestoneRes.body.milestone._id;
      await Milestone.findByIdAndUpdate(milestoneId, { status: 'verified' });

      return { campaignId, milestoneId };
    }

    it('should allow owner NGO to request funds and admin to approve release', async () => {
      const { milestoneId } = await prepareVerifiedNgoCampaignAndMilestone();

      const requestRes = await request(app)
        .post(`/api/ngo/milestones/${milestoneId}/request-funds`)
        .set('Authorization', `Bearer ${ngoToken}`);

      expect(requestRes.status).toBe(200);
      expect(requestRes.body.milestone.fundRequest.status).toBe('pending');

      const releaseRes = await request(app)
        .post(`/api/admin/milestones/${milestoneId}/release-funds`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          decision: 'approve',
          txHash: '0xabc123456789def0000000000000000000000000000000000000000000000001',
          remarks: 'Verified and released',
          expectedNgoWalletAddress: ngoUser.walletAddress,
        });

      expect(releaseRes.status).toBe(200);
      expect(releaseRes.body.milestone.fundRequest.status).toBe('released');
      expect(releaseRes.body.milestone.status).toBe('completed');
      expect(releaseRes.body.milestone.fundRequest.releasedAmount).toBe(1);
    });

    it('should reject request funds when milestone is not verified', async () => {
      await request(app)
        .post(`/api/admin/ngos/${ngoUser._id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' });

      const campaignRes = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({
          title: 'Unverified Milestone Campaign',
          slug: `unverified-campaign-${Date.now()}`,
          description:
            'Campaign for testing invalid milestone status during fund request.',
          category: 'health',
          fundingGoal: 3300,
        });

      const campaignId = campaignRes.body.campaign._id;

      const milestoneRes = await request(app)
        .post(`/api/campaigns/${campaignId}/milestones`)
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({ title: 'Milestone Pending', amountETH: 0.7, order: 1 });

      const milestoneId = milestoneRes.body.milestone._id;

      const res = await request(app)
        .post(`/api/ngo/milestones/${milestoneId}/request-funds`)
        .set('Authorization', `Bearer ${ngoToken}`);

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('INVALID_MILESTONE_STATE');
    });

    it('should enforce authorization boundaries for fund request/release', async () => {
      const { milestoneId } = await prepareVerifiedNgoCampaignAndMilestone();

      const donorRequest = await request(app)
        .post(`/api/ngo/milestones/${milestoneId}/request-funds`)
        .set('Authorization', `Bearer ${donorToken}`);
      expect(donorRequest.status).toBe(403);

      await request(app)
        .post(`/api/ngo/milestones/${milestoneId}/request-funds`)
        .set('Authorization', `Bearer ${ngoToken}`);

      const ngoRelease = await request(app)
        .post(`/api/admin/milestones/${milestoneId}/release-funds`)
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({ decision: 'reject', remarks: 'Not allowed' });
      expect(ngoRelease.status).toBe(403);
    });
  });

  describe('Database relation consistency', () => {
    it('should keep proof-milestone and transaction-donation links consistent', async () => {
      await request(app)
        .post(`/api/admin/ngos/${ngoUser._id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' });

      const campaignRes = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({
          title: 'Relation Campaign',
          slug: `relation-campaign-${Date.now()}`,
          description:
            'Campaign used for relation integrity checks across milestone, proof, transaction, and donation entities.',
          category: 'relief',
          fundingGoal: 25000000,
        });
      const campaignId = campaignRes.body.campaign._id;

      const milestoneRes = await request(app)
        .post(`/api/campaigns/${campaignId}/milestones`)
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({ title: 'Relation Milestone', amountETH: 1.2, order: 1 });
      const milestoneId = milestoneRes.body.milestone._id;

      const proofRes = await request(app)
        .post(`/api/milestones/${milestoneId}/proofs`)
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({
          cid: 'bafybeigdyrztz4qexample000000000000000000000000000000000001',
          filename: 'proof.jpg',
          mimeType: 'image/jpeg',
          size: 12345,
        });
      expect(proofRes.status).toBe(201);

      const freshMilestone = await Milestone.findById(milestoneId);
      expect(freshMilestone.proofs.length).toBe(1);
      expect(freshMilestone.status).toBe('submitted');

      const txHash = '0xabc123456789def0000000000000000000000000000000000000000000000099';
      const txRes = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          txHash,
          from: '0x1111111111111111111111111111111111111111',
          to: '0x2222222222222222222222222222222222222222',
          amount: 50,
          status: 'pending',
          campaignId,
        });
      expect(txRes.status).toBe(201);

      const donationRes = await request(app)
        .post('/api/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          campaignId,
          amount: 50,
          txHash,
          status: 'confirmed',
        });
      expect(donationRes.status).toBe(201);

      const linkedTx = await Transaction.findOne({ txHash });
      expect(linkedTx.donation).toBeDefined();
      const linkedDonation = await Donation.findById(linkedTx.donation);
      expect(String(linkedDonation.campaign)).toBe(String(campaignId));
    });
  });
});

const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Milestone = require('../models/Milestone');
const bcryptjs = require('bcryptjs');

describe('Campaign API', () => {
  let ngoToken, donorToken, adminToken;
  let ngoUser, donorUser, adminUser;

  beforeEach(async () => {
    await User.deleteMany({});
    await Campaign.deleteMany({});
    await Milestone.deleteMany({});

    // Create NGO user
    const ngoHash = await bcryptjs.hash('ngopass123', 10);
    ngoUser = await User.create({
      email: 'ngo@example.com',
      passwordHash: ngoHash,
      role: 'ngo',
      walletAddress: '0x4444444444444444444444444444444444444444',
      isVerified: true,
      verificationStatus: 'approved',
      profile: { name: 'NGO', organizationName: 'Test NGO' },
    });

    // Create Donor user
    const donorHash = await bcryptjs.hash('donorpass123', 10);
    donorUser = await User.create({
      email: 'donor@example.com',
      passwordHash: donorHash,
      role: 'donor',
      profile: { name: 'Donor' },
    });

    // Create Admin user
    const adminHash = await bcryptjs.hash('adminpass123', 10);
    adminUser = await User.create({
      email: 'admin@example.com',
      passwordHash: adminHash,
      role: 'admin',
      profile: { name: 'Admin' },
    });

    // Login all users to get tokens
    const ngoRes = await request(app)
      .post('/api/login')
      .send({ email: 'ngo@example.com', password: 'ngopass123' });
    ngoToken = ngoRes.body.accessToken;

    const donorRes = await request(app)
      .post('/api/login')
      .send({ email: 'donor@example.com', password: 'donorpass123' });
    donorToken = donorRes.body.accessToken;

    const adminRes = await request(app)
      .post('/api/login')
      .send({ email: 'admin@example.com', password: 'adminpass123' });
    adminToken = adminRes.body.accessToken;
  });

  describe('GET /api/campaigns', () => {
    beforeEach(async () => {
      await Campaign.create({
        title: 'Campaign 1',
        slug: 'campaign-1',
        description: 'This is a test campaign with enough content to meet minimum length requirements for description.',
        category: 'health',
        fundingGoal: 10000,
        ngo: ngoUser._id,
        ngoWalletAddress: ngoUser.walletAddress,
        status: 'published',
      });

      await Campaign.create({
        title: 'Campaign 2',
        slug: 'campaign-2',
        description: 'Another test campaign with description that meets the minimum required character count.',
        category: 'education',
        fundingGoal: 5000,
        ngo: ngoUser._id,
        ngoWalletAddress: ngoUser.walletAddress,
        status: 'published',
      });
    });

    it('should list all campaigns', async () => {
      const res = await request(app).get('/api/campaigns');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBe(2);
      expect(res.body.total).toBe(2);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/campaigns')
        .query({ page: 1, perPage: 1 });

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.perPage).toBe(1);
    });

    it('should filter by category', async () => {
      const res = await request(app)
        .get('/api/campaigns')
        .query({ category: 'health' });

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].category).toBe('health');
    });
  });

  describe('GET /api/campaigns/:id', () => {
    let campaignId;

    beforeEach(async () => {
      const campaign = await Campaign.create({
        title: 'Test Campaign',
        slug: 'test-campaign',
        description: 'This is a detailed test campaign description with plenty of content.',
        category: 'health',
        fundingGoal: 10000,
        ngo: ngoUser._id,
        ngoWalletAddress: ngoUser.walletAddress,
        status: 'published',
      });
      campaignId = campaign._id;
    });

    it('should get campaign by id', async () => {
      await Milestone.create({
        campaign: campaignId,
        title: 'Phase 1',
        description: 'Initial procurement',
        amount: 1000,
      });

      const res = await request(app).get(`/api/campaigns/${campaignId}`);

      expect(res.status).toBe(200);
      expect(res.body.campaign).toBeDefined();
      expect(res.body.campaign.title).toBe('Test Campaign');
      expect(res.body.campaign.ngo).toBeDefined();
      expect(Array.isArray(res.body.milestones)).toBe(true);
      expect(res.body.milestones.length).toBe(1);
    });

    it('should return 404 for non-existent campaign', async () => {
      const fakeId = '000000000000000000000000';
      const res = await request(app).get(`/api/campaigns/${fakeId}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/campaigns', () => {
    const validCampaignData = {
      title: 'New Campaign',
      slug: 'new-campaign',
      summary: 'Campaign summary',
      description: 'This is a comprehensive campaign description with sufficient content to meet validation requirements.',
      category: 'health',
      fundingGoal: 15000,
    };

    it('should allow NGO to create campaign', async () => {
      const res = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${ngoToken}`)
        .send(validCampaignData);

      expect(res.status).toBe(201);
      expect(res.body.campaign).toBeDefined();
      expect(res.body.campaign.ngo).toBe(ngoUser._id.toString());
    });

    it('should reject donor creating campaign', async () => {
      const res = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${donorToken}`)
        .send(validCampaignData);

      expect(res.status).toBe(403);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/campaigns')
        .send(validCampaignData);

      expect(res.status).toBe(401);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({ title: 'Missing fields campaign' });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT/PATCH /api/campaigns/:id', () => {
    let campaignId;

    beforeEach(async () => {
      const campaign = await Campaign.create({
        title: 'Original Title',
        slug: 'original-campaign',
        description: 'This is a test campaign description with necessary content for validation.',
        category: 'health',
        fundingGoal: 10000,
        ngo: ngoUser._id,
        ngoWalletAddress: ngoUser.walletAddress,
        status: 'draft',
      });
      campaignId = campaign._id;
    });

    it('should allow owner NGO to update campaign', async () => {
      const res = await request(app)
        .put(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.campaign.title).toBe('Updated Title');
    });

    it('should allow admin to update any campaign', async () => {
      const res = await request(app)
        .put(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Admin Updated' });

      expect(res.status).toBe(200);
      expect(res.body.campaign.title).toBe('Admin Updated');
    });

    it('should allow owner NGO to update campaign via PATCH', async () => {
      const res = await request(app)
        .patch(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({ title: 'Patched Title' });

      expect(res.status).toBe(200);
      expect(res.body.campaign.title).toBe('Patched Title');
    });

    it('should update existing milestones, create new milestones, and delete removed milestones via PATCH', async () => {
      const existingA = await Milestone.create({
        campaign: campaignId,
        title: 'Phase A',
        description: 'Old A',
        amount: 100,
      });

      const existingB = await Milestone.create({
        campaign: campaignId,
        title: 'Phase B',
        description: 'Old B',
        amount: 200,
      });

      const res = await request(app)
        .patch(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({
          title: 'Patched With Milestones',
          milestones: [
            {
              id: existingA._id.toString(),
              title: 'Phase A Updated',
              description: 'Updated A',
              amount: 150,
            },
            {
              title: 'Phase C New',
              description: 'New C',
              amount: 300,
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.campaign.title).toBe('Patched With Milestones');
      expect(Array.isArray(res.body.milestones)).toBe(true);
      expect(res.body.milestones.length).toBe(2);

      const persistedA = await Milestone.findById(existingA._id);
      expect(persistedA.title).toBe('Phase A Updated');
      expect(persistedA.amount).toBe(150);

      const deletedB = await Milestone.findById(existingB._id);
      expect(deletedB).toBeNull();
    });

    it('should reject duplicate milestone titles in PATCH payload', async () => {
      const res = await request(app)
        .patch(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({
          milestones: [
            { title: 'Same Title', amount: 100 },
            { title: 'same title', amount: 200 },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('DUPLICATE_MILESTONES');
    });

    it('should reject non-owner NGO from updating', async () => {
      const otherNgoHash = await bcryptjs.hash('other', 10);
      const otherNgo = await User.create({
        email: 'other-ngo@example.com',
        passwordHash: otherNgoHash,
        role: 'ngo',
        walletAddress: '0x5555555555555555555555555555555555555555',
      });

      const otherRes = await request(app)
        .post('/api/login')
        .send({ email: 'other-ngo@example.com', password: 'other' });

      const res = await request(app)
        .put(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${otherRes.body.accessToken}`)
        .send({ title: 'Attempted Hijack' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/campaigns/:id', () => {
    let campaignId;

    beforeEach(async () => {
      const campaign = await Campaign.create({
        title: 'To Delete',
        slug: 'to-delete',
        description: 'This is a campaign that will be deleted in the test.',
        fundingGoal: 5000,
        ngo: ngoUser._id,
        ngoWalletAddress: ngoUser.walletAddress,
      });
      campaignId = campaign._id;
    });

    it('should allow admin to delete campaign', async () => {
      const res = await request(app)
        .delete(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = await Campaign.findById(campaignId);
      expect(check).toBeNull();
    });

    it('should allow owner NGO to delete campaign', async () => {
      const res = await request(app)
        .delete(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${ngoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject non-owner from deleting', async () => {
      const otherNgoHash = await bcryptjs.hash('other-delete', 10);
      await User.create({
        email: 'other-delete-ngo@example.com',
        passwordHash: otherNgoHash,
        role: 'ngo',
        walletAddress: '0x6666666666666666666666666666666666666666',
        isVerified: true,
        verificationStatus: 'approved',
      });

      const otherRes = await request(app)
        .post('/api/login')
        .send({ email: 'other-delete-ngo@example.com', password: 'other-delete' });

      const res = await request(app)
        .delete(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${otherRes.body.accessToken}`);

      expect(res.status).toBe(403);
    });
  });
});

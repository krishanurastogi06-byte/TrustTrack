const { z } = require('zod');
const objectId = /^[a-f0-9]{24}$/i;

const createCampaignSchema = z.object({
  title: z.string().min(5).max(200),
  slug: z.string().min(3).max(200).regex(/^[a-z0-9-]+$/i),
  summary: z.string().max(500).optional(),
  description: z.string().min(20).max(10000),
  category: z.string().optional(),
  coverImage: z.string().url().optional(),
  fundingGoal: z.number().min(1),
  tags: z.array(z.string()).optional(),
});

const campaignMilestoneInputSchema = z.object({
  id: z.string().regex(objectId, 'Invalid milestone id').optional(),
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  amount: z.coerce.number().min(0.01),
});

const updateCampaignSchema = createCampaignSchema.partial().extend({
  milestones: z.array(campaignMilestoneInputSchema).max(100).optional(),
});

const campaignIdParamSchema = z.object({
  id: z.string().regex(objectId, 'Invalid campaign id'),
});

const listCampaignsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().min(1).max(100).optional(),
  category: z.string().max(100).optional(),
  ngoId: z.string().regex(objectId, 'Invalid ngoId').optional(),
});

module.exports = {
  createCampaignSchema,
  updateCampaignSchema,
  campaignIdParamSchema,
  listCampaignsQuerySchema,
};

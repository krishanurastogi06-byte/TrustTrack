const { z } = require('zod');
const objectId = /^[a-f0-9]{24}$/i;

const createMilestoneSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  amount: z.number().min(0.01),
});

const updateMilestoneSchema = createMilestoneSchema.partial();

const campaignMilestoneParamSchema = z.object({
  campaignId: z.string().regex(objectId, 'Invalid campaignId'),
});

const milestoneIdParamSchema = z.object({
  id: z.string().regex(objectId, 'Invalid milestone id'),
});

module.exports = {
  createMilestoneSchema,
  updateMilestoneSchema,
  campaignMilestoneParamSchema,
  milestoneIdParamSchema,
};

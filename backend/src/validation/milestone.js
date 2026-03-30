const { z } = require('zod');
const objectId = /^[a-f0-9]{24}$/i;

const createMilestoneSchema = z
  .object({
    title: z.string().trim().min(3, 'title is required').max(200),
    amountETH: z.coerce.number().min(0.00000001, 'amountETH must be greater than 0'),
    order: z.coerce.number().int().min(1, 'order must be a positive integer'),
  })
  .strict();

const updateMilestoneSchema = z
  .object({
    title: z.string().trim().min(3).max(200).optional(),
    amountETH: z.coerce.number().min(0.00000001).optional(),
    order: z.coerce.number().int().min(1).optional(),
  })
  .strict();

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

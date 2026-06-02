const { z } = require('zod');

const objectId = /^[a-f0-9]{24}$/i;

const proofMilestoneParamSchema = z.object({
  milestoneId: z.string().regex(objectId, 'Invalid milestoneId'),
});

const createProofSchema = z.object({
  cid: z.string().min(5).max(2048),
  filename: z.string().max(255).optional(),
  mimeType: z.string().max(120).optional(),
  size: z.coerce.number().int().nonnegative().optional(),
  remarks: z.string().max(1000).optional(),
});

const proofIdParamSchema = z.object({
  id: z.string().regex(objectId, 'Invalid proof id'),
});

const proofStatusQuerySchema = z.object({
  status: z.enum(['pending', 'verified', 'rejected']).optional(),
});

const myProofsQuerySchema = z.object({
  status: z.enum(['pending', 'verified', 'rejected']).optional(),
  campaignId: z.string().regex(objectId, 'Invalid campaignId').optional(),
});

const verifyRejectProofSchema = z.object({
  remarks: z.string().max(1000).optional(),
});

module.exports = {
  proofMilestoneParamSchema,
  createProofSchema,
  proofIdParamSchema,
  proofStatusQuerySchema,
  myProofsQuerySchema,
  verifyRejectProofSchema,
};
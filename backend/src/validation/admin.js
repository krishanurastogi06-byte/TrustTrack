const { z } = require('zod');

const objectId = /^[a-f0-9]{24}$/i;

const ngoIdParamSchema = z.object({
  id: z.string().regex(objectId, 'Invalid ngo id'),
});

const verifyNgoSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

const listNgosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(100).optional(),
  verificationStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
});

const listAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(100).optional(),
  action: z.string().max(120).optional(),
  entityType: z.string().max(120).optional(),
});

const listAdminCampaignsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  status: z.enum(['draft', 'published', 'completed', 'cancelled']).optional(),
});

const milestoneIdParamSchema = z.object({
  id: z.string().regex(objectId, 'Invalid milestone id'),
});

const campaignIdParamSchema = z.object({
  id: z.string().regex(objectId, 'Invalid campaign id'),
});

const releaseFundsSchema = z
  .object({
    decision: z.enum(['approve', 'reject']),
    txHash: z.string().min(10).max(200).optional(),
    remarks: z.string().max(1000).optional(),
    expectedNgoWalletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid NGO wallet address').optional(),
  });

const manualReleaseSchema = z.object({
  txHash: z.string().min(10).max(200).optional(),
  remarks: z.string().max(1000).optional(),
  expectedNgoWalletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid NGO wallet address').optional(),
});

module.exports = {
  ngoIdParamSchema,
  verifyNgoSchema,
  listNgosQuerySchema,
  listAuditLogsQuerySchema,
  listAdminCampaignsQuerySchema,
  milestoneIdParamSchema,
  campaignIdParamSchema,
  releaseFundsSchema,
  manualReleaseSchema,
};

const { z } = require('zod');

const objectId = /^[a-f0-9]{24}$/i;

const createDonationSchema = z.object({
  campaignId: z.string().regex(objectId, 'Invalid campaignId'),
  amount: z.coerce.number().positive(),
  currency: z.string().min(1).max(10).optional(),
  txHash: z.string().min(10).max(200).optional(),
  status: z.enum(['pending', 'confirmed', 'failed']).optional(),
  message: z.string().max(500).optional(),
  metadata: z.any().optional(),
});

const donationIdParamSchema = z.object({
  id: z.string().regex(objectId, 'Invalid donation id'),
});

const listDonationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(100).optional(),
  campaignId: z.string().regex(objectId, 'Invalid campaignId').optional(),
  donorId: z.string().regex(objectId, 'Invalid donorId').optional(),
  status: z.enum(['pending', 'confirmed', 'failed']).optional(),
});

module.exports = { createDonationSchema, donationIdParamSchema, listDonationsQuerySchema };

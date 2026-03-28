const { z } = require('zod');

const objectId = /^[a-f0-9]{24}$/i;

const createTransactionSchema = z.object({
  txHash: z.string().min(10).max(200),
  from: z.string().min(4).max(120),
  to: z.string().min(4).max(120),
  amount: z.coerce.number().positive(),
  status: z.enum(['pending', 'confirmed', 'failed']).optional(),
  network: z.coerce.number().int().nonnegative().optional(),
  campaignId: z.string().regex(objectId, 'Invalid campaignId').optional(),
  metadata: z.any().optional(),
  blockNumber: z.coerce.number().int().nonnegative().optional(),
});

const updateTransactionSchema = z
  .object({
    status: z.enum(['pending', 'confirmed', 'failed']).optional(),
    blockNumber: z.coerce.number().int().nonnegative().optional(),
    confirmations: z.coerce.number().int().nonnegative().optional(),
    receipt: z.any().optional(),
    error: z.string().max(1000).optional(),
    metadata: z.any().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required for update' });

const transactionTxHashParamSchema = z.object({
  txHash: z.string().min(10).max(200),
});

module.exports = { createTransactionSchema, updateTransactionSchema, transactionTxHashParamSchema };

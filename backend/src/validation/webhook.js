const { z } = require('zod');

const transactionWebhookSchema = z.object({
  txHash: z.string().min(10).max(200),
  status: z.enum(['pending', 'confirmed', 'failed']),
  blockNumber: z.coerce.number().int().nonnegative().optional(),
  confirmations: z.coerce.number().int().nonnegative().optional(),
  receipt: z.any().optional(),
  error: z.string().max(1000).optional(),
  metadata: z.any().optional(),
});

module.exports = { transactionWebhookSchema };

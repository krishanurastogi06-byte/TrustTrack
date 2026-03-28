const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ngo', 'donor']).optional(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid walletAddress').optional(),
  profile: z.object({
    name: z.string().optional(),
    organizationName: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
}).superRefine((payload, ctx) => {
  const role = payload.role || 'donor';
  if (role === 'ngo' && !payload.walletAddress) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'walletAddress is required for NGO registration',
      path: ['walletAddress'],
    });
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

module.exports = { registerSchema, loginSchema, refreshSchema };

const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ngo', 'donor']).optional(),
  walletAddress: z.string()
    .optional()
    .nullable()
    .refine(
      (val) => !val || /^0x[a-fA-F0-9]{40}$/.test(val),
      'Invalid walletAddress format'
    ),
  profile: z.object({
    name: z.string().optional(),
    organizationName: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

const updateWalletSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid walletAddress').transform((value) => value.toLowerCase()),
});

module.exports = { registerSchema, loginSchema, refreshSchema, updateWalletSchema };

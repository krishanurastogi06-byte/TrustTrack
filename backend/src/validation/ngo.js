const { z } = require('zod');

const objectId = /^[a-f0-9]{24}$/i;
const ethereumAddress = /^0x[a-fA-F0-9]{40}$/;

const milestoneIdParamSchema = z.object({
  id: z.string().regex(objectId, 'Invalid milestone id'),
});

const updateNgoProfileSchema = z.object({
  profile: z.object({
    name: z.string().min(1, 'Name is required').optional(),
    organizationName: z.string().min(1, 'Organization name is required').optional(),
    phone: z.string().regex(/^\+?[0-9]{10,}$/, 'Phone number must be at least 10 digits').optional(),
  }).optional(),
  walletAddress: z.string()
    .regex(ethereumAddress, 'Invalid Ethereum wallet address (must be 0x followed by 40 hex characters)')
    .toLowerCase()
    .optional(),
});

const getNgoProfileParamSchema = z.object({
  id: z.string().regex(objectId, 'Invalid NGO id').optional(),
});

module.exports = { 
  milestoneIdParamSchema, 
  updateNgoProfileSchema,
  getNgoProfileParamSchema,
};

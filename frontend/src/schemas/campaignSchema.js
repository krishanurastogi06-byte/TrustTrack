import { z } from "zod";

export const milestoneSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, "Milestone title too short").max(120),
  order: z.coerce.number().int().min(1, "Milestone order must be at least 1"),
  amount: z
    .number({ invalid_type_error: "Amount must be a number" })
    .min(1, "Amount must be at least ₹1"),
});

export const createCampaignSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(120),
  category: z.string().min(1, "Select a category"),
  coverImageUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  description: z.string().min(20, "Description must be at least 20 characters").max(5000),
  fundingGoal: z
    .coerce
    .number({ invalid_type_error: "Funding goal is required" })
    .finite("Funding goal is required")
    .min(100, "Funding goal must be at least ₹100")
    .max(100000000, "Funding goal seems too large"),
  milestones: z
    .array(milestoneSchema)
    .min(1, "Add at least one milestone")
    .max(50, "Too many milestones"),
});

export const submitProofSchema = z.object({
  campaignId: z.string().min(1, "Select campaign"),
  milestoneId: z.string().min(1, "Select milestone"),
  file: z
    .any()
    .refine((f) => Boolean(f), "Upload a file")
    .refine((f) => (f ? f instanceof File : false), "Upload a file")
    .refine((f) => (f?.size ? f.size <= 10 * 1024 * 1024 : false), "File must be ≤ 10MB"),
  remarks: z.string().max(1000).optional(),
});

export default createCampaignSchema;

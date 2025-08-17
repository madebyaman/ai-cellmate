import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z
    .string({ required_error: "Worspace name is required" })
    .min(1, "Workspace name is required")
    .max(100, "Workspace name must be less than 100 characters"),
  slug: z
    .string({ required_error: "Slug is required" })
    .min(1, "Slug is required")
    .max(50, "Slug must be less than 50 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
    .regex(/^[a-z0-9]/, "Slug must start with a letter or number")
    .regex(/[a-z0-9]$/, "Slug must end with a letter or number"),
  userName: z
    .string({ required_error: "User name is required" })
    .min(1, "User name is required")
    .max(100, "User name must be less than 100 characters"),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

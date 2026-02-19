import { z } from "zod";
import costCategoriesList from "./costCategories.json";

/** Single link schema (for add-link dialog validation and supportingInfoLinks array). Title mandatory, 255 chars. */
export const supportingInfoLinkSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  url: z.string().url("Enter a valid URL"),
});

/** Ordered list of category names (for z.enum and ordering). */
export const COST_CATEGORIES = costCategoriesList.map((c) => c.name);

/** Full list with name + description for selects and UI. */
export const COST_CATEGORIES_LIST = costCategoriesList;

/** Single budget row input schema (object only). Matches workPackages[].budgetBreakdown[]. */
export const budgetRowInputSchema = z.object({
  costCategory: z.enum(COST_CATEGORIES, {
    errorMap: () => ({ message: "Cost category is required" }),
  }),
  description: z
    .string()
    .min(1, "Item description is required")
    .max(600),
  quantity: z.coerce
    .number({ invalid_type_error: "Quantity must be a number" })
    .min(0.001, "Quantity is required and must be greater than 0"),
  unitPrice: z.coerce
    .number({ invalid_type_error: "Unit cost must be a number" })
    .min(0, "Unit cost in ADA is required and must be 0 or greater"),
});

/** Single budget row schema (repeatable per work package); adds total via transform. */
export const budgetRowSchema = budgetRowInputSchema.transform((row) => ({
  ...row,
  total: Math.round(row.quantity * row.unitPrice * 1000) / 1000,
}));

/** Single milestone schema (repeatable per work package). */
export const milestoneSchema = z.object({
  milestoneName: z.string().min(1, "Milestone name is required").max(100),
  deliverables: z.string().min(1, "Deliverables are required").max(600),
  acceptanceCriteria: z.string().min(1, "Acceptance criteria are required").max(600),
  duration: z.string().min(1, "Duration is required").max(200),
});

/** Single work package schema (Section 3 – Execution Roadmap). Matches metaData.executionRoadmap.workPackages[]. */
export const workPackageSchema = z.object({
  title: z.string().min(1, "Work Package name is required").max(100),
  scope: z.string().min(1, "Scope of Work is required").max(2000),
  supportingDocuments: z.array(supportingInfoLinkSchema).optional().default([]),
  estimatedDuration: z.string().max(200).optional(),
  coreObjectives: z
    .array(z.string().min(1, "At least one Core Objective is required").max(400)),
  expectedValue: z.string().min(1, "Expected Value (ROI) is required").max(600),
  metric: z.string().min(1, "Metric is required").max(600),
  milestones: z.array(milestoneSchema).optional().default([]),
  budgetBreakdown: z.array(budgetRowSchema).min(1, "At least one budget row is required").optional().default([]),
});

export default workPackageSchema;

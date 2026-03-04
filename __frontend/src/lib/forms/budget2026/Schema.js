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
    error: "Cost category is required",
  }),
  name: z
    .string()
    .min(1, "Item name is required")
    .max(200),
  description: z
    .string()
    .min(1, "Item description is required")
    .max(600),
  quantity: z.coerce
    .number({ invalid_type_error: "Quantity must be a number" })
    .min(0.001, "Quantity is required and must be greater than 0"),
  unitPrice: z.coerce
    .number({ invalid_type_error: "Unit cost must be a number" })
    .min(0.001, "Unit cost in ADA is required and must be greater than 0"),
});

/** Single budget row schema (repeatable per work package); adds total via transform. */
export const budgetRowSchema = budgetRowInputSchema.transform((row) => ({
  ...row,
  total: Math.round(row.quantity * row.unitPrice * 1000) / 1000,
}));

/** Single milestone schema (repeatable per work package). */
export const milestoneSchema = z.object({
  name: z.string().min(1, "Milestone name is required").max(100),
  deliverables: z.string().min(1, "Deliverables are required").max(4000),
  acceptanceCriteria: z
    .string()
    .min(1, "Acceptance criteria are required")
    .max(4000),
  duration: z.string().min(1, "Duration is required").max(100),
});

/** Single work package schema. Matches FormWorkPackages.svelte (metaData.proposalDetails.workPackages[]). */
export const workPackageSchema = z
  .object({
    name: z.string().min(1, "Work Package name is required").max(100),
    summary: z.string().min(1, "Work Package summary is required").max(10000),
    initiativeType: z.union([z.string(), z.undefined()]).superRefine((val, ctx) => {
      if (val === "" || val === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Initiative type is required" });
        return;
      }
      if (val !== "New Initiative" && val !== "Maintenance") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Initiative type must be New Initiative or Maintenance",
        });
      }
    }),
    proposalType: z.union([z.string(), z.undefined()]).superRefine((val, ctx) => {
      if (val === "" || val === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Type of proposal is required" });
        return;
      }
      if (val !== "Technical (software/IT)" && val !== "Non-technical") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Type of proposal must be Technical (software/IT) or Non-technical",
        });
      }
    }),
    supportingDocuments: z.array(supportingInfoLinkSchema).optional().default([]),
    coreObjectives: z
    .array(z.string().min(1).max(1000))
    .min(1, "At least one core objective is required")
    .optional()
    .default([]),
    expectedValue: z.string().min(1, "Expected Value (ROI) is required").max(1000),
    metric: z.string().min(1, "Metric is required").max(600),
    milestones: z.array(milestoneSchema).optional().default([]),
    budgetBreakdown: z.array(budgetRowSchema).optional().default([]),
    noMilestonesBreakdown: z.boolean().optional().default(false),
    milestoneAlternative: z.string().max(4000).optional().default(""),
  })
  .superRefine((data, ctx) => {
    // Only validate milestone alternative when checkbox is set; "at least one milestone" is enforced on backend on submit.
    if (data.noMilestonesBreakdown) {
      const alt = (data.milestoneAlternative ?? "").trim();
      if (alt.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Milestone alternative is required when not using milestones",
          path: ["milestoneAlternative"],
        });
      }
    }
  });

export default workPackageSchema;

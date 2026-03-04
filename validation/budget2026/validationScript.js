/**
 * Budget 2026 proposal validation script.
 * Validates POST/PUT proposal body (voteId, title, summary, status, metaData).
 * Used when a vote has validationScript set to "budget2026/validationScript.js".
 */
import { z } from "zod";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const costCategoriesPath = join(__dirname, "costCategories.json");
const costCategoriesList = JSON.parse(readFileSync(costCategoriesPath, "utf8"));
const COST_CATEGORIES = costCategoriesList.map((c) => c.name);

const supportingInfoLinkSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  url: z.string().url("Enter a valid URL"),
});

/** Additional Info section: links with title max 255 (per form-additional-info.md). */
const supportingInfoLinkSchemaOtherInfo = z.object({
  title: z.string().min(1, "Title is required").max(100),
  url: z.string().min(1, "URL is required").url("Enter a valid URL"),
});

const budgetRowInputSchema = z.object({
  costCategory: z.enum(COST_CATEGORIES, {
    error: "Cost category is required",
  }),
  name: z.string().min(1, "Item name is required").max(200),
  description: z.string().min(1, "Item description is required").max(600),
  quantity: z.coerce
    .number({ invalid_type_error: "Quantity must be a number" })
    .min(0.001, "Quantity is required and must be greater than 0"),
  unitPrice: z.coerce
    .number({ invalid_type_error: "Unit cost must be a number" })
    .min(0.001, "Unit cost in ADA is required and must be greater than 0"),
});

const budgetRowSchema = budgetRowInputSchema.transform((row) => ({
  ...row,
  total: Math.round(row.quantity * row.unitPrice * 1000) / 1000,
}));

const milestoneSchema = z.object({
  name: z.string().min(1, "Milestone name is required").max(100),
  deliverables: z.string().min(1, "Deliverables are required").max(4000),
  acceptanceCriteria: z.string().min(1, "Acceptance criteria are required").max(4000),
  duration: z.string().min(1, "Duration is required").max(100),
});

const workPackageSchema = z
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
    .min(1, "At least one core objective is required"),
    expectedValue: z.string().min(1, "Expected Value (ROI) is required").max(1000),
    metric: z.string().min(1, "Metric is required").max(600),
    milestones: z.array(milestoneSchema).optional().default([]),
    budgetBreakdown: z
      .array(budgetRowSchema)
      .min(1, "At least one budget row is required")
      .optional()
      .default([]),
    noMilestonesBreakdown: z.boolean().optional().default(false),
    milestoneAlternative: z.string().max(4000).optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (data.noMilestonesBreakdown) {
      const alt = (data.milestoneAlternative ?? "").trim();
      if (alt.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Milestone alternative is required when not using milestones",
          path: ["milestoneAlternative"],
        });
      }
    } else {
      const list = data.milestones ?? [];
      if (!Array.isArray(list) || list.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one milestone is required",
          path: ["milestones"],
        });
      }
    }
  });

/** Proposer details (FormProposerDetails): public name, contact email, social/media links. */
const proposerDetailsSchema = z.object({
  name: z.string().min(1, "Proposer name is required").max(100),
  email: z
    .union([z.string(), z.undefined()])
    .transform((v) => (v == null ? "" : String(v).trim()))
    .superRefine((val, ctx) => {
      if (val === "" || val === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Primary contact email is required" });
        return;
      }
      if (val.length > 255) {
        ctx.addIssue({ code: z.ZodIssueCode.too_big, maximum: 255, type: "string", message: "Email must be at most 255 characters" });
        return;
      }
      const emailSchema = z.string().email("Enter a valid email");
      const result = emailSchema.safeParse(val);
      if (!result.success) {
        const msg = result.error.errors[0]?.message ?? "Enter a valid email";
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg });
      }
    }),
  links: z.array(supportingInfoLinkSchemaOtherInfo).optional().default([]),
});

const proposalDetailsSchema = z.object({
  conversionRate: z.coerce
    .number({ invalid_type_error: "Enter a valid number" })
    .min(0)
    .refine((v) => v > 0, { message: "Conversion rate is required" }),
  workPackages: z
    .array(workPackageSchema)
    .min(1, "At least one work package is required")
    .optional()
    .default([]),
});

const legalDeclarationsSchema = z.object({
  dataProcessingConsent: z.boolean().refine((v) => v === true, { message: "You must acknowledge and consent." }),
  publicVisibilityConsent: z.boolean().refine((v) => v === true, { message: "You must acknowledge and agree." }),
  authorizationEntity: z.boolean().refine((v) => v === true, { message: "You must confirm authorization." }),
  authorizationAttestation: z.boolean().refine((v) => v === true, { message: "You must confirm authorization." }),
  submitterName: z.string().min(1, "Name is required").max(100),
  submitterRole: z.string().min(1, "Role is required").max(100),
  submitterEmail: z.string().trim().min(1, "Email is required").max(100).email("Enter a valid email"),
});

const strategyFrameworkSchema = z.object({
  pillars: z
    .array(
      z
        .string()
        .length(24, "Please choose at least one pillar")
        .regex(/^[a-fA-F0-9]{24}$/, "Must be a valid MongoDB ObjectId")
    )
    .min(1, "Please choose at least one pillar"),
  pillarRationale: z
    .string()
    .min(1, "Rationale for your selection is required")
    .max(15000),
  kpiAlignment: z
    .string()
    .min(1, "Alignment to KPIs is required")
    .max(10000),
});

const metaDataSchema = z.object({
  trackRecord: z.union([z.literal(""), z.string().min(2).max(650)]).optional().default(""),
  estimatedDuration: z.coerce.number({ invalid_type_error: "Estimated duration must be a number" }).min(1, "Estimated duration is required and must be greater than 0"),
  strategyFramework: strategyFrameworkSchema,
  proposalDetails: proposalDetailsSchema.optional().default({ conversionRate: "", workPackages: [] }),
  proposerDetails: proposerDetailsSchema.optional().default({ name: "", email: "", links: [] }),
  /** Other Info section (FormAdditionalInfo): supporting links only. Initiative type and proposal type are per work package. */
  supportingInfoLinks: z.array(supportingInfoLinkSchemaOtherInfo).optional().default([]),
  /** Budget Summary section (FormBudgetSummary): treasury repayment, circumstances, prior funding. */
  treasuryRepayment: z.union([z.string(), z.undefined()]).superRefine((val, ctx) => {
    if (val === "" || val === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Treasury repayment is required" });
      return;
    }
    if (val !== "Yes" && val !== "No") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Treasury repayment must be Yes or No",
      });
    }
  }),
  treasuryRepaymentCircumstances: z.string().max(10000).optional().default(""),
  priorFunding: z.string().min(1, "Prior funding is required").max(10000),
  legalDeclarations: legalDeclarationsSchema.optional(),
});

const formSchema = z.object({
  title: z.string().min(2, "Proposal Title is required").max(100),
  summary: z.string().min(2, "Executive Summary is required").max(2000),
  status: z.enum(["draft", "live"]).default("draft"),
  metaData: metaDataSchema,
});

/** Full proposal body: form payload + voteId (ObjectId string). */
export const createProposalBodySchema = formSchema.extend({
  voteId: z
    .string()
    .length(24, "voteId must be a valid ObjectId")
    .regex(/^[a-fA-F0-9]{24}$/, "voteId must be a valid ObjectId"),
});

/** Draft: only title (and voteId) required. */
export const createDraftProposalBodySchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  voteId: z
    .string()
    .length(24, "voteId must be a valid ObjectId")
    .regex(/^[a-fA-F0-9]{24}$/, "voteId must be a valid ObjectId"),
  status: z.enum(["draft"]).optional().default("draft"),
  summary: z.string().max(2000).optional().default(""),
  metaData: z.record(z.string(), z.any()).optional().default({}),
});

/**
 * Validate proposal body. For status "live" uses full schema; otherwise draft schema (title + voteId only).
 * @param {unknown} body - Raw request body
 * @returns {{ success: true, data } | { success: false, error: z.ZodError }}
 */
export function validate(body) {
  const status = body?.status;
  if (status === "live") {
    const result = createProposalBodySchema.safeParse(body);
    if (result.success) return { success: true, data: result.data };
    return { success: false, error: result.error };
  }
  const result = createDraftProposalBodySchema.safeParse(body);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error };
}

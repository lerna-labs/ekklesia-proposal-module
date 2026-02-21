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

const budgetRowInputSchema = z.object({
  costCategory: z.enum(COST_CATEGORIES, {
    errorMap: () => ({ message: "Cost category is required" }),
  }),
  description: z.string().min(1, "Item description is required").max(600),
  quantity: z.coerce
    .number({ invalid_type_error: "Quantity must be a number" })
    .min(0.001, "Quantity is required and must be greater than 0"),
  unitPrice: z.coerce
    .number({ invalid_type_error: "Unit cost must be a number" })
    .min(0, "Unit cost in ADA is required and must be 0 or greater"),
});

const budgetRowSchema = budgetRowInputSchema.transform((row) => ({
  ...row,
  total: Math.round(row.quantity * row.unitPrice * 1000) / 1000,
}));

const milestoneSchema = z.object({
  milestoneName: z.string().min(1, "Milestone name is required").max(100),
  deliverables: z.string().min(1, "Deliverables are required").max(600),
  acceptanceCriteria: z.string().min(1, "Acceptance criteria are required").max(600),
  duration: z.string().min(1, "Duration is required").max(200),
});

const workPackageSchema = z.object({
  title: z.string().min(1, "Work Package name is required").max(100),
  scope: z.string().min(1, "Scope of Work is required").max(2000),
  supportingDocuments: z.array(supportingInfoLinkSchema).optional().default([]),
  estimatedDuration: z.string().max(200).optional(),
  coreObjectives: z.array(z.string().min(1).max(400)),
  expectedValue: z.string().min(1, "Expected Value (ROI) is required").max(600),
  metric: z.string().min(1, "Metric is required").max(600),
  milestones: z.array(milestoneSchema).optional().default([]),
  budgetBreakdown: z
    .array(budgetRowSchema)
    .min(1, "At least one budget row is required")
    .optional()
    .default([]),
});

const contractingPartySchema = z.object({
  legalEntityType: z.enum(["company", "individual"], {
    required_error: "Legal entity type is required",
    invalid_type_error: "Legal entity type must be company or individual",
  }),
  legalEntityName: z.string().max(100).optional(),
  legalEntityRegistrationNumber: z.string().max(100).optional(),
  legalEntityCountry: z.string().max(100).optional(),
  legalEntityAddress: z.string().max(100).optional(),
  countryOfResidence: z.string().max(100).optional(),
  govtIssuedIdNumber: z.string().max(100).optional(),
  fullResidentialAddress: z.string().max(100).optional(),
});

const primaryContactSchema = z.object({
  name: z.string().max(100).min(1, "Name is required"),
  title: z.string().max(100).min(1, "Title is required"),
  email: z.string().trim().max(255).min(1, "Email is required").email("Enter a valid email"),
  socialMedia: z.string().max(100).optional(),
});

const signatoryContactSchema = z.object({
  name: z.string().max(100).min(1, "Name is required"),
  title: z.string().max(100).min(1, "Role is required"),
  email: z.string().trim().max(255).min(1, "Email is required").email("Enter a valid email"),
  authorization: z.boolean().refine((v) => v === true, { message: "You must confirm authorization." }),
});

const kycInfoSchema = z
  .object({
    submitted: z.boolean().optional(),
    email: z.string().trim().max(100).email().optional(),
    totalProposalsSubmitted: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => {
        if (v === "" || v == null) return undefined;
        const n = Number(v);
        if (Number.isNaN(n)) return undefined;
        const int = Math.floor(n);
        return int >= 0 && int <= 99999 ? int : undefined;
      }),
  })
  .refine(
    (data) => {
      if (data.submitted === false) {
        const email = (data.email ?? "").trim();
        return email.length > 0 && z.string().email().safeParse(email).success;
      }
      return true;
    },
    { message: "KYC Contact Email is required when KYC/KYB has not been submitted.", path: ["email"] }
  );

const financialAndAdministrativeSchema = z.object({
  conversionRate: z.coerce
    .number({ invalid_type_error: "Enter a valid number" })
    .min(0)
    .refine((v) => v > 0, { message: "Conversion rate is required" }),
  intersectAdministrator: z.boolean().optional(),
  otherAdministrators: z.string().max(400).optional(),
  initiativeType: z.enum(["New Initiative", "Maintenance"]).optional(),
  priorFunding: z.string().min(1, "Prior funding is required").max(800),
  treasuryRepayment: z.boolean().optional(),
  treasuryRepaymentCondition: z.string().max(800).optional(),
  treasuryDonationHash: z.string().max(255).optional(),
  thirdPartyAssurers: z.string().max(600).optional(),
  supportingDocuments: z.array(supportingInfoLinkSchema).optional().default([]),
});

// API receives dates as ISO strings; coerce to Date for validation/storage
const executionRoadmapSchema = z.object({
  projectStartDate: z.coerce.date("Start Date is required"),
  projectEndDate: z.coerce.date("End Date is required"),
  workPackages: z.array(workPackageSchema).optional().default([]),
});

const legalDeclarationsSchema = z.object({
  dataProtection: z.boolean().refine((v) => v === true, { message: "You must acknowledge and consent." }),
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
    .max(150000),
  kpiAlignment: z
    .string()
    .min(1, "Alignment to KPIs is required")
    .max(100000),
});

const metaDataSchema = z.object({
  trackRecord: z.union([z.literal(""), z.string().min(2).max(650)]).optional().default(""),
  strategyFramework: strategyFrameworkSchema,
  executionRoadmap: executionRoadmapSchema.optional().default({ workPackages: [] }),
  financialAndAdministrative: financialAndAdministrativeSchema.optional().default({}),
  contractingParty: contractingPartySchema.optional().default({}),
  primaryContact: primaryContactSchema.optional().default({}),
  signatoryContact: signatoryContactSchema.optional().default({}),
  proposalType: z.enum(["Technical (software/IT)", "Non-technical"]).optional(),
  kycInfo: kycInfoSchema.optional().default({}),
  legalDeclarations: legalDeclarationsSchema.optional(),
});

const formSchema = z.object({
  title: z.string().min(2).max(100),
  summary: z.string().min(2).max(2000),
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

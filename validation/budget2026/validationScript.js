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
  title: z.string().min(1, "Title is required").max(100),
  url: z.string().url("Enter a valid URL"),
});

/** Additional Info section: links with title max 100. */
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

/** Admin section: contracting party (company or individual), contact, signatory, KYC. */
const contractingPartySchema = z.object({
  legalEntityType: z.string().optional().default(""),
  legalEntityName: z.string().max(100).optional().default(""),
  legalEntityRegistrationNumber: z.string().max(100).optional().default(""),
  legalEntityCountry: z.string().max(100).optional().default(""),
  legalEntityAddressLine1: z.string().max(100).optional().default(""),
  legalEntityAddressLine2: z.string().max(100).optional().default(""),
  legalEntityAddressLine3: z.string().max(100).optional().default(""),
  govtIssuedIdNumber: z.string().max(100).optional().default(""),
  countryOfResidence: z.string().max(100).optional().default(""),
  residentialAddressLine1: z.string().max(100).optional().default(""),
  residentialAddressLine2: z.string().max(100).optional().default(""),
  residentialAddressLine3: z.string().max(100).optional().default(""),
});

const primaryContactSchema = z.object({
  name: z.string().max(100).optional().default(""),
  email: z.string().max(255).optional().default(""),
});

const signatoryContactSchema = z.object({
  title: z.string().max(100).optional().default(""),
  name: z.string().max(100).optional().default(""),
  email: z.string().max(255).optional().default(""),
  authorization: z.boolean().optional().default(false),
});

const kycInfoSchema = z.object({
  submitted: z.string().optional().default(""),
  email: z.string().max(100).optional().default(""),
  totalProposalsSubmitted: z.string().max(100).optional().default(""),
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
  /** Total budget (ADA); must equal sum of work package budget breakdown rows. Set by frontend. */
  totalBudget: z.coerce.number({ invalid_type_error: "Total budget must be a number" }).min(0, "Total budget must be ≥ 0"),
  /** Treasury Donation (FormTreasuryDonation): verification hash and confirmation. */
  treasuryDonationTxHash: z.string().max(64).optional().default(""),
  treasuryDonationConfirmed: z.boolean().optional().default(false),
  /** Budget Admin: independent audits text (FormBudgetAdmin). */
  independentAudits: z.string().max(1000).optional().default(""),
  /** Budget Admin: administrator choice, contracting party, primary contact, signatory, KYC. */
  administrator: z.string().optional().default(""),
  intersectAdministratorFeeConsent: z.boolean().optional().default(false),
  otherAdministrator: z.string().max(4000).optional().default(""),
  contractingParty: contractingPartySchema.optional().default({}),
  primaryContact: primaryContactSchema.optional().default({}),
  signatoryContact: signatoryContactSchema.optional().default({}),
  kycInfo: kycInfoSchema.optional().default({}),
  legalDeclarations: legalDeclarationsSchema.optional(),
}).superRefine((data, ctx) => {
  if (data.treasuryRepayment === "Yes") {
    const circumstances = (data.treasuryRepaymentCircumstances ?? "").trim();
    if (!circumstances) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["treasuryRepaymentCircumstances"],
        message: "Repayment circumstances are required when treasury repayment is Yes",
      });
    }
  }
  // Admin section: administrator required first; only validate the rest when administrator is selected
  const admin = (data.administrator ?? "").trim();
  if (admin !== "Intersect" && admin !== "Other") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["administrator"],
      message: "Administrator is required (Intersect or Other)",
    });
    return; // Do not validate contracting party, contact, signatory, KYC until administrator is selected
  }
  if (admin === "Intersect" && data.intersectAdministratorFeeConsent !== true) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["intersectAdministratorFeeConsent"],
      message: "You must agree to the Intersect administration fee",
    });
  }
  if (admin === "Other") {
    const other = (data.otherAdministrator ?? "").trim();
    if (!other) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["otherAdministrator"],
        message: "Other administrator details are required when not selecting Intersect",
      });
    }
  }
  // Contracting party type required; conditional company/individual fields
  const cp = data.contractingParty ?? {};
  const entityType = (cp.legalEntityType ?? "").trim();
  if (entityType !== "company" && entityType !== "individual") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["contractingParty", "legalEntityType"],
      message: "Please select Company or Individual",
    });
  }
  if (entityType === "company") {
    if (!(cp.legalEntityName ?? "").trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["contractingParty", "legalEntityName"], message: "Legal entity name is required" });
    if (!(cp.legalEntityRegistrationNumber ?? "").trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["contractingParty", "legalEntityRegistrationNumber"], message: "Registration number is required" });
    if (!(cp.legalEntityCountry ?? "").trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["contractingParty", "legalEntityCountry"], message: "Country of incorporation is required" });
    if (!(cp.legalEntityAddressLine1 ?? "").trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["contractingParty", "legalEntityAddressLine1"], message: "Registered address line 1 is required" });
  }
  if (entityType === "individual") {
    if (!(cp.govtIssuedIdNumber ?? "").trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["contractingParty", "govtIssuedIdNumber"], message: "Government-issued ID number is required" });
    if (!(cp.countryOfResidence ?? "").trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["contractingParty", "countryOfResidence"], message: "Country of residence is required" });
    if (!(cp.residentialAddressLine1 ?? "").trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["contractingParty", "residentialAddressLine1"], message: "Residential address line 1 is required" });
  }
  // Primary contact
  const pc = data.primaryContact ?? {};
  if (!(pc.name ?? "").trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["primaryContact", "name"], message: "Primary contact name is required" });
  const pcEmail = (pc.email ?? "").trim();
  if (!pcEmail) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["primaryContact", "email"], message: "Primary contact email is required" });
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pcEmail)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["primaryContact", "email"], message: "Enter a valid email" });
  // Signatory
  const sc = data.signatoryContact ?? {};
  if (!(sc.title ?? "").trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["signatoryContact", "title"], message: "Signatory title is required" });
  if (!(sc.name ?? "").trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["signatoryContact", "name"], message: "Signatory name is required" });
  const scEmail = (sc.email ?? "").trim();
  if (!scEmail) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["signatoryContact", "email"], message: "Signatory email is required" });
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(scEmail)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["signatoryContact", "email"], message: "Enter a valid email" });
  if (sc.authorization !== true) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["signatoryContact", "authorization"], message: "You must confirm signatory authorization" });
  // KYC
  const kyc = data.kycInfo ?? {};
  const kycSubmitted = (kyc.submitted ?? "").trim();
  if (kycSubmitted !== "Yes" && kycSubmitted !== "No") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["kycInfo", "submitted"], message: "KYC/KYB submission status is required (Yes or No)" });
  }
  if (kycSubmitted === "No") {
    const kycEmail = (kyc.email ?? "").trim();
    if (!kycEmail) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["kycInfo", "email"], message: "KYC contact email is required when KYC has not been submitted" });
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(kycEmail)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["kycInfo", "email"], message: "Enter a valid email" });
  }
  // Third party assurers (independent audits) required when administrator is selected
  const independentAuditsVal = (data.independentAudits ?? "").trim();
  if (!independentAuditsVal) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["independentAudits"],
      message: "Third party assurers (independent audits) is required",
    });
  }
  // Total budget must equal sum of work package budget breakdown rows (round to 3 decimals)
  const workPackages = data.proposalDetails?.workPackages ?? [];
  let sumAda = 0;
  for (const pkg of workPackages) {
    const rows = Array.isArray(pkg?.budgetBreakdown) ? pkg.budgetBreakdown : [];
    for (const row of rows) {
      const ada = Number(row?.total ?? (row?.quantity != null && row?.unitPrice != null ? row.quantity * row.unitPrice : NaN));
      if (Number.isFinite(ada)) sumAda += ada;
    }
  }
  const sumRounded = Math.round(sumAda * 1000) / 1000;
  const totalBudgetRounded = typeof data.totalBudget === "number" && Number.isFinite(data.totalBudget) ? Math.round(data.totalBudget * 1000) / 1000 : data.totalBudget;
  if (Number.isFinite(totalBudgetRounded) && Math.abs(totalBudgetRounded - sumRounded) > 1e-9) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["totalBudget"],
      message: "Total budget must equal the sum of all work package budget line items",
    });
  }
});

const formSchema = z
  .object({
    title: z.string().min(2, "Proposal Title is required").max(100),
    summary: z.string().min(2, "Executive Summary is required").max(2000),
    status: z.enum(["draft", "live"]).default("draft"),
    metaData: metaDataSchema,
  })
  .superRefine((data, ctx) => {
    if (data.status !== "live") return;
    const md = data.metaData ?? {};
    const txHash = (md.treasuryDonationTxHash ?? "").trim();
    if (!txHash) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["metaData", "treasuryDonationTxHash"],
        message: "Treasury donation verification hash is required to submit",
      });
    }
    if (md.treasuryDonationConfirmed !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["metaData", "treasuryDonationConfirmed"],
        message: "You must confirm the treasury donation to submit",
      });
    }
    // Legal declarations required on submit/re-submit (all checkboxes and submitter fields)
    const ld = md.legalDeclarations;
    if (!ld || typeof ld !== "object") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["metaData", "legalDeclarations"],
        message: "Legal declarations are required to submit",
      });
      return;
    }
    const ldResult = legalDeclarationsSchema.safeParse(ld);
    if (!ldResult.success) {
      for (const issue of ldResult.error.issues) {
        ctx.addIssue({
          ...issue,
          path: ["metaData", "legalDeclarations", ...(issue.path || [])],
        });
      }
    }
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

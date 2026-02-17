import { z } from "zod";

/**
 * Legal declarations schema matching the PDF (CBC Proposal Template FORM Final DRAFT).
 * The PDF has only 4 checkboxes: 2 under "1. Data Protection", 2 under "8. Declaration of Submitter".
 * Sections 2–7 are text-only (no checkboxes). When building API payload, set other backend
 * declaration booleans (antiBribery, authenticity, etc.) to true if required by the API.
 */
export const declarationsSchema = z.object({
  dataProtection: z
    .boolean()
    .refine((v) => v === true, { message: "You must acknowledge and consent." })
    .meta({
      label:
        "I acknowledge and consent to the above data processing and sharing.",
      required: true,
    }),
  publicVisibilityConsent: z
    .boolean()
    .refine((v) => v === true, { message: "You must acknowledge and agree." })
    .meta({
      label:
        "By submitting this form, you acknowledge and agree that the legal entity name, personal name, and X (Twitter) handle entered will be publicly visible in connection with this budget request.",
      required: true,
    }),
  authorizationEntity: z
    .boolean()
    .refine((v) => v === true, { message: "You must confirm authorization." })
    .meta({
      label:
        "I confirm that I am authorized to submit this proposal on behalf of the vendor entity. I acknowledge that submission does not constitute authority to bind the entity contractually.",
      required: true,
    }),
  authorizationAttestation: z
    .boolean()
    .refine((v) => v === true, { message: "You must confirm authorization." })
    .meta({
      label:
        "I confirm that I am authorized to submit and attest to all legal declarations above on behalf of the vendor.",
      required: true,
    }),
  submitterName: z
    .string()
    .min(1, "Name is required")
    .max(100)
    .meta({
      label: "Name",
      placeholder: "Enter Full Name",
      required: true,
    }),
  submitterRole: z
    .string()
    .min(1, "Role is required")
    .max(100)
    .meta({
      label: "Role",
      placeholder: "Enter Role",
      required: true,
    }),
  submitterEmail: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(100)
    .email("Enter a valid email")
    .meta({
      label: "Email",
      placeholder: "Enter Email",
      required: true,
    }),
});

/** Single link schema (for add-link dialog validation and supportingInfoLinks array). Title mandatory, 255 chars. */
export const supportingInfoLinkSchema = z.object({
  title: z.string().min(1, "Title is required").max(255).meta({ required: true }),
  url: z.string().url("Enter a valid URL"),
});

/** Cost category options for work package budget rows (from costCategories.json). */
import costCategoriesList from "./costCategories.json";

/** Ordered list of category names (for z.enum and ordering). */
export const COST_CATEGORIES = costCategoriesList.map((c) => c.name);

/** Full list with name + description for selects and UI. */
export const COST_CATEGORIES_LIST = costCategoriesList;

/** Single budget row input schema (object only; form fields use .shape from this). Matches workPackages[].budgetBreakdown[]. */
export const budgetRowInputSchema = z.object({
  costCategory: z
    .enum(COST_CATEGORIES, {
      errorMap: () => ({ message: "Cost category is required" }),
    })
    .meta({
      label: "Cost Category",
      required: true,
    }),
  description: z
    .string()
    .min(1, "Item description is required")
    .max(600)
    .meta({
      label: "Item Description",
      required: true,
    }),
  quantity: z.coerce
    .number({ invalid_type_error: "Quantity must be a number" })
    .min(0.001, "Quantity is required and must be greater than 0")
    .meta({
      label: "Quantity",
      required: true,
    }),
  unitPrice: z.coerce
    .number({ invalid_type_error: "Unit cost must be a number" })
    .min(0, "Unit cost in ADA is required and must be 0 or greater")
    .meta({
      label: "Unit Cost (ADA)",
      required: true,
    }),
});

/** Single budget row schema (repeatable per work package); adds total via transform. */
export const budgetRowSchema = budgetRowInputSchema.transform((row) => ({
  ...row,
  total: Math.round(row.quantity * row.unitPrice * 1000) / 1000,
}));

/** Single milestone schema (repeatable per work package). */
export const milestoneSchema = z.object({
  milestoneName: z
    .string()
    .min(1, "Milestone name is required")
    .max(100)
    .meta({
      label: "Milestone (and reference name)",
      description:
        'You may use labels like "Milestone 1," but please include a descriptive name afterward (e.g., "Milestone 1 – Design Approval").',
      placeholder: "e.g. Milestone 1 – Design Approval",
      required: true,
    }),
  deliverables: z
    .string()
    .min(1, "Deliverables are required")
    .max(600)
    .meta({
      label: "Deliverables",
      description:
        "What is produced? Concrete outputs (reports, code, documentation, audits, etc.).",
      placeholder: "e.g. Senior Dev",
      required: true,
    }),
  acceptanceCriteria: z
    .string()
    .min(1, "Acceptance criteria are required")
    .max(600)
    .meta({
      label: "Acceptance Criteria",
      description:
        'How do you know it\'s "done"? Objective conditions for approval and payment.',
      placeholder: "Enter Description",
      required: true,
    }),
  duration: z
    .string()
    .min(1, "Duration is required")
    .max(200)
    .meta({
      label: "Duration",
      description: "How long do you expect it to take for this milestone to be finished?",
      placeholder: "e.g. 2 weeks",
      required: true,
    }),
});

/** Single work package schema (Section 3 – Execution Roadmap). Matches metaData.executionRoadmap.workPackages[]. */
export const workPackageSchema = z.object({
  title: z.string().min(1, "Work Package name is required").max(100).meta({
    label: "Work Package",
    description: "A descriptive name for this specific work package.",
    placeholder: "e.g. WP1 Node Performance Improvements",
    required: true,
  }),
  scope: z.string().min(1, "Scope of Work is required").max(2000).meta({
    label: "Scope of Work",
    description:
      "Provide a high-level description of the work involved. This may include activities, approaches, or key outputs, but does not need to be a detailed delivery plan. The goal is to give reviewers enough context to understand how the stated objectives will be achieved.",
    placeholder:
      "Describe the main activities and, where applicable, the key outputs or deliverables associated with this work package",
    required: true,
  }),
  supportingDocuments: z.array(supportingInfoLinkSchema).optional().default([]).meta({
    label: "Supporting Documentation Link",
    description:
      "Link any relevant diagrams, technical specs, or planning documents (PDF, PNG, JPG).",
    required: false,
  }),
  estimatedDuration: z.string().max(200).optional().meta({
    label: "Estimated Duration",
    placeholder: "e.g. 3 months",
    required: false,
  }),
  coreObjectives: z
    .array(z.string().min(1, "At least one Core Objective is required").max(400))
    .meta({
      label: "Core Objectives",
      description:
        "What is this Work Package intended to achieve? Focus on outcomes or improvements, not tasks or activities.",
      placeholder: "e.g. Improve node synchronization reliability across the network",
      required: true,
    }),
  expectedValue: z.string().min(1, "Expected Value (ROI) is required").max(600).meta({
    label: "Expected Value (ROI)",
    description:
      "Why does this work matter? Describe what will change or improve as a result of this Work Package. This may be qualitative or quantitative and does not need to be financial.",
    placeholder: "e.g. Faster onboarding for developers integrating with Cardano",
    required: true,
  }),
  metric: z.string().min(1, "Metric is required").max(600).meta({
    label: "Metric",
    description:
      "How will success be measured? Provide one or more metrics that demonstrate whether the expected value has been achieved.",
    placeholder: "e.g. Average time to first successful deployment reduced by 30%",
    required: true,
  }),
  milestones: z.array(milestoneSchema).optional().default([]).meta({
    label: "Milestones",
    description: "How do you plan to deliver this package? Copy this table for each milestone.",
    required: false,
  }),
  budgetBreakdown: z.array(budgetRowSchema).optional().default([]),
});

// --- Nested schemas matching API / proposal-schema-description.md ---

/** metaData.contractingParty */
export const contractingPartySchema = z.object({
  legalEntityType: z
    .enum(["company", "individual"], {
      required_error: "Please select Company or Individual",
      invalid_type_error: "Please select Company or Individual",
    })
    .optional()
    .meta({
      label: "Contracting Party Details",
      required: true,
      options: [
        { value: "company", label: "A Company" },
        { value: "individual", label: "An Individual" },
      ],
    }),
  legalEntityName: z.string().max(100).optional().meta({ label: "Legal Entity Name", required: true }),
  legalEntityRegistrationNumber: z.string().max(100).optional().meta({ label: "Registration Number", required: true, notPublic: true }),
  legalEntityCountry: z.string().length(2).optional().meta({ label: "Country of Incorporation", required: true, notPublic: true }),
  legalEntityAddress: z.string().max(100).optional().meta({ label: "Registered Address", required: true, notPublic: true }),
  countryOfResidence: z.string().length(2).optional().meta({ label: "Country of Residence", required: true, notPublic: true }),
  govtIssuedIdNumber: z.string().max(100).optional().meta({ label: "Govt Issued ID Number", required: true, notPublic: true }),
  fullResidentialAddress: z.string().max(100).optional().meta({ label: "Full Residential Address", required: true, notPublic: true }),
});

/** metaData.primaryContact */
export const primaryContactSchema = z.object({
  name: z.string().max(100).optional().meta({ label: "Primary Contact Full Name", required: true }),
  title: z.string().max(100).optional().meta({ label: "Title", required: false }),
  email: z.string().trim().max(255).email("Enter a valid email").optional().meta({ label: "Primary Contact Email", required: true, notPublic: true }),
  socialMedia: z.string().max(100).optional().meta({ label: "X Handle", required: false }),
});

/** metaData.signatoryContact */
export const signatoryContactSchema = z.object({
  name: z.string().max(100).optional().meta({ label: "Signatory Name", required: true, notPublic: true }),
  title: z.string().max(100).optional().meta({ label: "Signatory Title", required: true, notPublic: true }),
  email: z.string().trim().max(255).email("Enter a valid email").optional().meta({ label: "Signatory Email", required: true, notPublic: true }),
  authorization: z.boolean().optional().meta({ label: "Signatory Authorization", required: true, notPublic: true }),
});

/** metaData.kycInfo */
export const kycInfoSchema = z
  .object({
    submitted: z.boolean().optional().meta({
      label: "KYC/KYB Submitted?",
      required: true,
      notPublic: true,
      options: [
        { value: true, label: "Yes" },
        { value: false, label: "No" },
      ],
    }),
    email: z.string().trim().max(100).email("Enter a valid email").optional().meta({
      label: "KYC Contact Email (If No)",
      required: false,
      notPublic: true,
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

/** metaData.financialAndAdministrative */
export const financialAndAdministrativeSchema = z.object({
  conversionRate: z.coerce
    .number({ invalid_type_error: "Enter a valid number" })
    .min(0)
    .refine((v) => v > 0, { message: "Conversion rate is required" })
    .meta({ label: "ADA/USD conversion rate", required: true }),
  intersectAdministrator: z.boolean().optional().meta({
    label: "Intersect Administrator?",
    required: true,
    options: [
      { value: true, label: "Yes" },
      { value: false, label: "No" },
    ],
  }),
  otherAdministrators: z.string().max(400).optional().meta({ label: "Other Administrators?", required: false, notPublic: true }),
  initiativeType: z
    .enum(["New Initiative", "Maintenance"], { required_error: "Please select one" })
    .optional()
    .meta({
      label: "Initiative Type",
      required: true,
      options: [
        { value: "New Initiative", label: "New Initiative" },
        { value: "Maintenance", label: "Maintenance" },
      ],
    }),
  priorFunding: z.string().min(1, "Prior funding is required").max(800).meta({ label: "Prior Funding", required: true }),
  treasuryRepayment: z.boolean().optional().meta({
    label: "Treasury Repayment?",
    required: true,
    options: [
      { value: true, label: "Yes" },
      { value: false, label: "No" },
    ],
  }),
  treasuryRepaymentCondition: z.string().max(800).optional().meta({ label: "Repayment Circumstances", required: false }),
  treasuryDonationHash: z.string().max(255).optional().meta({ label: "Treasury Donation Verification Hash", required: true }),
  thirdPartyAssurers: z.string().max(600).optional().meta({ label: "Third Party Assurers", required: false }),
  supportingDocuments: z.array(supportingInfoLinkSchema).optional().default([]).meta({ label: "Other Supporting Info", required: false }),
  administrator: z.string().optional().meta({ label: "Administrator (legacy)", required: false }),
});

/** metaData.executionRoadmap */
export const executionRoadmapSchema = z.object({
  projectStartDate: z.date("Start Date is required").optional().meta({ label: "Project Start Date", required: true }),
  projectEndDate: z.date("End Date is required").optional().meta({ label: "Project End Date", required: true }),
  workPackages: z.array(workPackageSchema).optional().default([]).meta({ label: "Work Packages", required: false }),
});

/** metaData object: matches API and proposal-schema-description.md */
export const metaDataSchema = z.object({
  trackRecord: z
    .union([z.literal(""), z.string().min(2).max(650)])
    .optional()
    .default("")
    .meta({ label: "Track Record", required: false }),
  strategicFocusArea: z
    .string()
    .length(24, "Please choose a strategic focus area")
    .regex(/^[a-fA-F0-9]{24}$/, "Must be a valid MongoDB ObjectId")
    .optional()
    .default("")
    .meta({ label: "Strategic Focus Area", required: true }),
  keyPerformanceIndicators: z
    .array(
      z.object({
        kpi: z.string().min(1, "KPI is required").max(400),
        contributionStrategy: z.string().min(1, "Contribution strategy is required").max(800),
      })
    )
    .min(1, "At least one KPI is required")
    .default([])
    .meta({ label: "Key Performance Indicators", required: true }),
  executionRoadmap: executionRoadmapSchema.optional().default({ projectStartDate: undefined, projectEndDate: undefined, workPackages: [] }),
  financialAndAdministrative: financialAndAdministrativeSchema.optional().default({ conversionRate: 0.25 }),
  contractingParty: contractingPartySchema.optional().default({}),
  primaryContact: primaryContactSchema.optional().default({}),
  signatoryContact: signatoryContactSchema.optional().default({}),
  proposalType: z
    .enum(["Technical (software/IT)", "Non-technical"], { required_error: "Please select one" })
    .optional()
    .meta({
      label: "Type of Proposal",
      required: true,
      options: [
        { value: "Technical (software/IT)", label: "Technical (software/IT)" },
        { value: "Non-technical", label: "Non-technical" },
      ],
    }),
  kycInfo: kycInfoSchema.optional().default({}),
  legalDeclarations: declarationsSchema.optional(),
});

/** Full form schema: shape matches API request body (title, summary, status, metaData). */
export const formSchema = z.object({
  title: z.string().min(2).max(100).meta({
    label: "Proposal Title",
    description: "The official name of your project as it will appear in governance voting.",
    placeholder: "Enter Title Here",
    required: true,
  }),
  summary: z.string().min(2).max(2000).meta({
    label: "Executive Summary",
    description: "A high-level overview of the problem, solution, and impact. This is the first thing voters read.",
    placeholder: "Enter Summary Here",
    required: true,
  }),
  status: z.enum(["draft", "live"]).default("draft").meta({ label: "Status" }),
  metaData: metaDataSchema,
});

// Legacy flat shape removed; form uses nested metaData. FormAdministrative receives metaData and binds to metaData.contractingParty, .primaryContact, etc.

/** Schema for main form validation before opening declarations dialog. Same as formSchema (legalDeclarations in metaData is optional). */
export const mainFormSchema = formSchema;

export default formSchema;
import { z } from "zod";

/** Flat schema for the legal declarations dialog (formSchema.shape[id] works with field ids). */
export const declarationsSchema = z.object({
  dataProcessingConsent: z
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
  authorizedToSubmit: z
    .boolean()
    .refine((v) => v === true, { message: "You must confirm authorization." })
    .meta({
      label:
        "I confirm that I am authorized to submit this proposal on behalf of the vendor entity. I acknowledge that submission does not constitute authority to bind the entity contractually.",
      required: true,
    }),
  authorizedToAttest: z
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
    .min(1, "Email is required")
    .max(100)
    .email("Enter a valid email")
    .meta({
      label: "Email",
      placeholder: "Enter Email",
      required: true,
    }),
});

export const formSchema = z.object({
  title: z.string().min(2).max(255).meta({
    label: "Proposal Title",
    description: "The official name of your project as it will appear in governance voting.",
    placeholder: "Enter Title Here",
    required: true,
  }),
  summary: z.string().min(2).max(2000).meta({
    label: "Proposal Summary",
    description: "A high-level overview of the problem, solution, and impact. This is the first thing voters read.",
    placeholder: "Enter Summary Here",
    required: true,
  }),
  trackRecord: z.string().min(2).max(650).meta({
    label: "Track Record",
    description: "Proven history of delivery. Mention previous successful proposals, mainnet deployments, or relevant enterprise experience.",
    placeholder: "Enter Track Record Here",
    required: false,
  }),
  category: z
    .string()
    .length(24, "Please select a focus area")
    .regex(/^[a-fA-F0-9]{24}$/, "Must be a valid MongoDB ObjectId")
    .meta({
      label: "Focus Area",
      description: "The primary Cardano strategic pillar your project addresses (e.g., L1 Improvements, DeFi, RWA).",
      placeholder: "Select a focus area...",
      required: true,
    }),
  kpis: z.array(z.object({
    title: z.string().min(3).max(255),
    contributionStrategy: z.string().min(100).max(1000),
  })).min(1, "At least one KPI is required").meta({
    label: "Key Performance Indicators",
    description: "Select specific KPIs you intend to impact (e.g., TVL, Monthly Transactions, Active Users).",
    required: true,
  }),
  timeline: z.object({
    startDate: z.date("Start Date is required"),
    endDate: z.date("End Date is required"),
  }).meta({
    label: "Timeline",
    description: "Project duration. How long do you realistically think the project will take? Consider including some contingency here.",
    required: true,
  }),
  legalDeclarations: declarationsSchema.optional(),
});

/** Schema for main form only (excludes legal declarations, validated before opening dialog). */
export const mainFormSchema = formSchema.omit({ legalDeclarations: true });

export default formSchema;
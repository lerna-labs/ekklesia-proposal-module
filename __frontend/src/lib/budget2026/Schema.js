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
    .trim()
    .min(1, "Email is required")
    .max(255)
    .email("Enter a valid email")
    .meta({
      label: "Email",
      placeholder: "Enter Email",
      required: true,
    }),
});

/** Single link schema (for add-link dialog validation and supportingInfoLinks array). */
export const supportingInfoLinkSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  url: z.string().url("Enter a valid URL"),
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
    .length(24, "Please choose a strategic focus area")
    .regex(/^[a-fA-F0-9]{24}$/, "Must be a valid MongoDB ObjectId")
    .meta({
      label: "Strategic Focus Area",
      description: "The primary Cardano strategic pillar your project addresses (e.g., L1 Improvements, DeFi, RWA).",
      placeholder: "Choose a strategic focus area...",
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
  administrative: z.object({
    intersectAdministrator: z
      .boolean({
        required_error: "Please select Yes or No",
        invalid_type_error: "Please select Yes or No",
      })
      .meta({
        label: "Intersect Administrator?",
        description: "Do you choose Intersect to be your administrator?",
        required: true,
        options: [
          { value: true, label: "Yes" },
          { value: false, label: "No" },
        ],
      }),
    // Shown when Intersect is not admin
    otherAdministrators: z.string().max(400).optional().meta({
      label: "Other Administrators?",
      description: "Please specify who is your administrator",
      placeholder: "",
      required: false,
      notPublic: true,
    }),
    // Contracting Party (both branches)
    contractingParty: z
      .enum(["company", "individual"], {
        required_error: "Please select Company or Individual",
        invalid_type_error: "Please select Company or Individual",
      })
      .optional()
      .meta({
        label: "Contracting Party Details",
        description: "Are you contracting as a registered company or an individual?",
        required: true,
        options: [
          { value: "company", label: "A Company" },
          { value: "individual", label: "An Individual" },
        ],
      }),
    // Company-only
    legalEntityName: z.string().max(100).optional().meta({
      label: "Legal Entity Name",
      description: "The official registered name of the organization receiving funds. Must match bank/KYC records.",
      placeholder: "Registered Company Name",
      required: true,
      notPublic: false,
    }),
    registrationNumber: z.string().max(100).optional().meta({
      label: "Registration Number",
      description: "Tax ID, UEN, or Company Registration Number in your jurisdiction.",
      placeholder: "Tax ID / UEN",
      required: true,
      notPublic: true,
    }),
    countryOfIncorporation: z
      .string()
      .length(2, "Select a country")
      .optional()
      .meta({
        label: "Country of Incorporation",
        description: "The legal jurisdiction where your entity is registered.",
        placeholder: "Select country...",
        required: true,
        notPublic: true,
      }),
    registeredAddress: z.string().max(100).optional().meta({
      label: "Registered Address",
      description: "Registered office address for legal correspondence.",
      placeholder: "Full Registered Address",
      required: true,
      notPublic: true,
    }),
    // Individual-only
    countryOfResidence: z
      .string()
      .length(2, "Select a country")
      .optional()
      .meta({
        label: "Country of Residence",
        description: "Country of residence for the individual.",
        placeholder: "Select country...",
        required: true,
        notPublic: true,
      }),
    govtIssuedIdNumber: z.string().max(100).optional().meta({
      label: "Govt Issued ID Number",
      description: "Government issued ID number.",
      placeholder: "ID / Passport #",
      required: true,
      notPublic: true,
    }),
    fullResidentialAddress: z.string().max(100).optional().meta({
      label: "Full Residential Address",
      description: "Full residential address for legal correspondence.",
      placeholder: "Full Home Address",
      required: true,
      notPublic: true,
    }),
    // Shared (Company and Individual)
    primaryContactFullName: z.string().max(100).optional().meta({
      label: "Primary Contact Full Name",
      description: "The main person responsible for day-to-day communication regarding this proposal.",
      placeholder: "Enter Name",
      required: true,
    }),
    primaryContactEmail: z
      .string()
      .trim()
      .max(255)
      .email("Enter a valid email")
      .optional()
      .meta({
        label: "Primary Contact Email",
        description: "Primary email for notifications and official correspondence.",
        placeholder: "Enter Email",
        required: true,
        notPublic: true,
      }),
    xHandle: z.string().max(100).optional().meta({
      label: "X Handle",
      description: "X handle to be tagged in Intersect communications on project progress.",
      placeholder: "Enter X Handle",
      required: false,
    }),
    signatoryName: z.string().max(100).optional().meta({
      label: "Signatory Name",
      description: "The person legally authorized to sign contracts on behalf of the entity/individual.",
      placeholder: "Enter Name",
      required: true,
      notPublic: true,
    }),
    signatoryTitle: z.string().max(100).optional().meta({
      label: "Signatory Title",
      description: "Job title or role of the signatory (e.g., CEO, Director).",
      placeholder: "Enter Title",
      required: true,
      notPublic: true,
    }),
    signatoryEmail: z
      .string()
      .trim()
      .max(255)
      .email("Enter a valid email")
      .optional()
      .meta({
        label: "Signatory Email",
        description: "Direct email address for the authorized signatory.",
        placeholder: "Enter Email",
        required: true,
        notPublic: true,
      }),
    signatoryAuthorization: z.boolean().optional().meta({
      label: "Signatory Authorization",
      description: "The above individual is authorized to execute a binding agreement on behalf of the vendor entity, subject to selection and contract execution.",
      required: true,
      notPublic: true,
    }),
    totalProposalsSubmitted: z.string().max(100).optional().meta({
      label: "Total Proposals Submitted",
      description: "The total count of proposals submitted by this entity/individual in this funding round.",
      placeholder: "Enter Count",
      required: false,
      notPublic: true,
    }),
    kycKybSubmitted: z
      .boolean({
        required_error: "Please select Yes or No",
        invalid_type_error: "Please select Yes or No",
      })
      .optional()
      .meta({
        label: "KYC/KYB Submitted?",
        description: "Have you previously submitted valid KYB/KYC with Intersect?",
        required: true,
        notPublic: true,
        options: [
          { value: true, label: "Yes" },
          { value: false, label: "No" },
        ],
      }),
    kycContactEmail: z
      .string()
      .trim()
      .max(255)
      .email("Enter a valid email")
      .optional()
      .meta({
        label: "KYC Contact Email (If No)",
        description: "Contact email for submitting KYC/KYB if not already done.",
        placeholder: "Enter Email",
        required: false,
        notPublic: true,
      }),
    // Other fields (not related to choosing Admin)
    treasuryRepayment: z
      .boolean({
        required_error: "Please select Yes or No",
        invalid_type_error: "Please select Yes or No",
      })
      .optional()
      .meta({
        label: "Treasury Repayment?",
        description: "Will any portion of the requested funds be returned to the treasury (e.g., any unused fund, from profits)?",
        required: true,
        options: [
          { value: true, label: "Yes" },
          { value: false, label: "No" },
        ],
      }),
    repaymentCircumstances: z.string().max(800).optional().meta({
      label: "Repayment Circumstances",
      description: "The specific conditions or triggers that would cause a repayment to occur.",
      placeholder: "Enter Explanation",
      required: false,
    }),
    initiativeType: z
      .enum(["new", "maintenance"], {
        required_error: "Please select one",
        invalid_type_error: "Please select one",
      })
      .optional()
      .meta({
        label: "Initiative Type",
        description: "Is this a brand new project or the continuation/maintenance of an existing one?",
        required: true,
        options: [
          { value: "new", label: "New Initiative" },
          { value: "maintenance", label: "Maintenance" },
        ],
      }),
    typeOfProposal: z
      .enum(["technical", "non-technical"], {
        required_error: "Please select one",
        invalid_type_error: "Please select one",
      })
      .optional()
      .meta({
        label: "Type of Proposal",
        description: "Classification of the proposal type.",
        required: true,
        options: [
          { value: "technical", label: "Technical (software/IT)" },
          { value: "non-technical", label: "Non-technical" },
        ],
      }),
    priorFunding: z.string().max(800).optional().meta({
      label: "Prior Funding",
      description: "List any funds previously received from Catalyst, Treasury, or other ecosystem grants.",
      placeholder: "Enter Details or N/A",
      required: true,
    }),
    treasuryDonationVerificationHash: z.string().max(64).optional().meta({
      label: "Treasury Donation Verification Hash",
      description: "The transaction hash confirming the required 1000 ada donation to the Cardano Treasury. This serves as proof of wallet control and commitment.",
      placeholder: "Transaction hash",
      required: true,
    }),
    thirdPartyAssurers: z.string().max(600).optional().meta({
      label: "Third Party Assurers",
      description: "Who is your Third Party Assurer? This person can be a person or organization.",
      placeholder: "If known please write vendor/person/organization and cost involved…",
      required: false,
    }),
    supportingInfoLinks: z
      .array(supportingInfoLinkSchema)
      .optional()
      .default([])
      .meta({
        label: "Other Supporting Info",
        description:
          "External links get the disclaimer text popup before they open. Any other details relevant to the proposal.",
        required: false,
      }),
  }),
  legalDeclarations: declarationsSchema.optional(),
});

/** Schema for main form only (excludes legal declarations, validated before opening dialog). */
export const mainFormSchema = formSchema.omit({ legalDeclarations: true });

export default formSchema;
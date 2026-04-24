/**
 * CC Vote 2026 proposal validation. Track required for live; track-specific metaData
 * (individual identity, organisation, consortium details + members) validated per track.
 * Used when validationScript is "cc-vote2026/validationScript.js".
 */
import { z } from "zod";

const objectIdString = z
  .string()
  .length(24, "voteId must be a valid ObjectId")
  .regex(/^[a-fA-F0-9]{24}$/, "voteId must be a valid ObjectId");

const trackEnum = z.enum(["individual", "organisation", "consortium"]);

const TITLE_MAX_LENGTH = 100;

/** Long-form markdown fields on individual proposals (aligned with frontend Textarea maxLength). */
const INDIVIDUAL_LONG_TEXT_MAX = 2000;

function normalizeUrl(val) {
  const trimmed = (val ?? "").trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const individualLinkItemSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(
      TITLE_MAX_LENGTH,
      `Title must be at most ${TITLE_MAX_LENGTH} characters`,
    ),
  url: z
    .string()
    .min(1, "URL is required")
    .transform(normalizeUrl)
    .pipe(z.string().url("Enter a valid URL")),
});

const regionIdOptional = z.union([
  z.literal(""),
  z
    .string()
    .length(24, "Geographic region must be a valid Id")
    .regex(/^[a-fA-F0-9]{24}$/, "Geographic region must be a valid Id"),
]);

const poolIdOptional = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : ""),
  z.union([
    z.literal(""),
    z
      .string()
      .regex(
        /^pool1/,
        "Pool ID must start with pool1 when provided",
      ),
  ]),
);

const drepIdOptional = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : ""),
  z.union([
    z.literal(""),
    z
      .string()
      .regex(
        /^drep1/,
        "DRep ID must start with drep1 when provided",
      ),
  ]),
);

const handleOptional = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : ""),
  z.string().max(100, "Must be at most 100 characters"),
);

const websiteOptional = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : ""),
  z.union([
    z.literal(""),
    z
      .string()
      .transform(normalizeUrl)
      .pipe(z.string().url("Enter a valid URL")),
  ]),
);

/** @param {unknown} raw */
function normalizeIndividualInput(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const links = Array.isArray(o.otherLinks) ? o.otherLinks : [];
  return {
    fullNameOrAlias: o.fullNameOrAlias ?? "",
    contactEmail: o.contactEmail ?? "",
    geographicRegion: o.geographicRegion ?? "",
    poolId: o.poolId ?? "",
    drepId: o.drepId ?? "",
    xUsername: o.xUsername ?? "",
    linkedinUsername: o.linkedinUsername ?? "",
    website: o.website ?? "",
    otherLinks: links,
    professionalBackground: o.professionalBackground ?? "",
    governanceExperience: o.governanceExperience ?? "",
    briefBiography: o.briefBiography ?? "",
    conflictOfInterestStatement: o.conflictOfInterestStatement ?? "",
    contributionsToCardano: o.contributionsToCardano ?? "",
    motivation: o.motivation ?? "",
    decentralisedGovernanceImportance: o.decentralisedGovernanceImportance ?? "",
    constitutionalInterpretation: o.constitutionalInterpretation ?? "",
    perspectiveYouWouldBring: o.perspectiveYouWouldBring ?? "",
    transparencyApproach: o.transparencyApproach ?? "",
  };
}

/** @param {unknown} raw */
function normalizeOrganisationInput(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const links = Array.isArray(o.otherLinks) ? o.otherLinks : [];
  return {
    organisationName: o.organisationName ?? "",
    organisationDescription: o.organisationDescription ?? "",
    geographicRegion: o.geographicRegion ?? "",
    contactPerson: o.contactPerson ?? "",
    contactEmail: o.contactEmail ?? "",
    poolId: o.poolId ?? "",
    drepId: o.drepId ?? "",
    xUsername: o.xUsername ?? "",
    linkedinUsername: o.linkedinUsername ?? "",
    website: o.website ?? "",
    otherLinks: links,
    organisationalAreasOfExpertise: o.organisationalAreasOfExpertise ?? "",
    governanceExperience: o.governanceExperience ?? "",
    conflictOfInterestStatement: o.conflictOfInterestStatement ?? "",
    contributionsToCardano: o.contributionsToCardano ?? "",
    motivation: o.motivation ?? "",
    decentralisedGovernanceImportance: o.decentralisedGovernanceImportance ?? "",
    constitutionalInterpretation: o.constitutionalInterpretation ?? "",
    perspectiveYouWouldBring: o.perspectiveYouWouldBring ?? "",
    transparencyApproach: o.transparencyApproach ?? "",
  };
}

/** @param {unknown} raw */
function normalizeConsortiumMemberInput(raw) {
  const m = raw && typeof raw === "object" ? raw : {};
  const links = Array.isArray(m.otherLinks) ? m.otherLinks : [];
  return {
    fullNameOrAlias: m.fullNameOrAlias ?? "",
    geographicRegion: m.geographicRegion ?? "",
    briefBiography: m.briefBiography ?? "",
    professionalBackground: m.professionalBackground ?? "",
    governanceExperience: m.governanceExperience ?? "",
    poolId: m.poolId ?? "",
    drepId: m.drepId ?? "",
    xUsername: m.xUsername ?? "",
    linkedinUsername: m.linkedinUsername ?? "",
    website: m.website ?? "",
    otherLinks: links,
    conflictOfInterestStatement: m.conflictOfInterestStatement ?? "",
  };
}

/** @param {unknown} raw */
function normalizeConsortiumMembersArray(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => normalizeConsortiumMemberInput(item));
}

/** @param {unknown} raw */
function normalizeConsortiumInput(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const links = Array.isArray(o.otherLinks) ? o.otherLinks : [];
  return {
    consortiumName: o.consortiumName ?? "",
    contactPerson: o.contactPerson ?? "",
    contactEmail: o.contactEmail ?? "",
    xUsername: o.xUsername ?? "",
    linkedinUsername: o.linkedinUsername ?? "",
    website: o.website ?? "",
    otherLinks: links,
    conflictOfInterestStatement: o.conflictOfInterestStatement ?? "",
    contributionsToCardano: o.contributionsToCardano ?? "",
    motivation: o.motivation ?? "",
    decentralisedGovernanceImportance: o.decentralisedGovernanceImportance ?? "",
    constitutionalInterpretation: o.constitutionalInterpretation ?? "",
    perspectiveYouWouldBring: o.perspectiveYouWouldBring ?? "",
    transparencyApproach: o.transparencyApproach ?? "",
    internalDecisionMakingProcess: o.internalDecisionMakingProcess ?? "",
    members: normalizeConsortiumMembersArray(o.members),
  };
}

const coldCredentialTypeEnum = z.enum(["keyCredential", "scriptCredential"]);

const COLD_HASH_MAX = 64;
const CIP129_CC_COLD_PREFIX = "cc_cold1";
const BECH32_DATA_CHARS_RE = /^[023456789acdefghjklmnpqrstuvwxyz]+$/;

/** @param {unknown} val */
function trimStr(val) {
  return typeof val === "string" ? val.trim() : "";
}

/**
 * CIP-0129 CC cold credential identifier check.
 * - must start with `cc_cold1`
 * - be lowercase bech32 charset
 * - max total length 64 chars
 * @param {string} value
 */
function isValidCcColdCredential(value) {
  if (!value) return false;
  if (value.length > COLD_HASH_MAX) return false;
  if (!value.startsWith(CIP129_CC_COLD_PREFIX)) return false;
  const payload = value.slice(CIP129_CC_COLD_PREFIX.length);
  if (!payload) return false;
  return BECH32_DATA_CHARS_RE.test(payload);
}

const individualIdentityLiveSchema = z.object({
  fullNameOrAlias: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Full name or alias is required")
        .max(100, "Full name or alias must be at most 100 characters"),
    ),
  contactEmail: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .email("Enter a valid email")
        .max(254, "Email must be at most 254 characters"),
    ),
  geographicRegion: regionIdOptional,
  poolId: poolIdOptional,
  drepId: drepIdOptional,
  xUsername: handleOptional,
  linkedinUsername: handleOptional,
  website: websiteOptional,
  otherLinks: z.array(individualLinkItemSchema).default([]),
  professionalBackground: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Professional background is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Professional background must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  governanceExperience: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Governance experience is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Governance experience must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  briefBiography: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Brief biography is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Brief biography must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  conflictOfInterestStatement: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Conflict of interest statement must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  contributionsToCardano: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Contributions to Cardano is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Contributions to Cardano must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  motivation: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Motivation is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Motivation must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  decentralisedGovernanceImportance: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Why decentralised governance is important is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `This field must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  constitutionalInterpretation: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Constitutional familiarity and interpretation is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Constitutional familiarity and interpretation must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  perspectiveYouWouldBring: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Perspective you would bring is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Perspective you would bring must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  transparencyApproach: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Transparency approach is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Transparency approach must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
});

const organisationLiveSchema = z.object({
  organisationName: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Organisation name is required")
        .max(100, "Organisation name must be at most 100 characters"),
    ),
  organisationDescription: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Organisational description is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Organisational description must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  geographicRegion: regionIdOptional,
  contactPerson: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Contact person is required")
        .max(100, "Contact person must be at most 100 characters"),
    ),
  contactEmail: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .email("Enter a valid email")
        .max(254, "Email must be at most 254 characters"),
    ),
  poolId: poolIdOptional,
  drepId: drepIdOptional,
  xUsername: handleOptional,
  linkedinUsername: handleOptional,
  website: websiteOptional,
  otherLinks: z.array(individualLinkItemSchema).default([]),
  organisationalAreasOfExpertise: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Organisational areas of expertise is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Organisational areas of expertise must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  governanceExperience: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Governance experience is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Governance experience must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  conflictOfInterestStatement: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Conflict of interest statement must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  contributionsToCardano: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Contributions to Cardano is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Contributions to Cardano must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  motivation: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Motivation is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Motivation must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  decentralisedGovernanceImportance: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Why decentralised governance is important is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `This field must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  constitutionalInterpretation: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Constitutional familiarity and interpretation is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Constitutional familiarity and interpretation must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  perspectiveYouWouldBring: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Perspective you would bring is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Perspective you would bring must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  transparencyApproach: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Transparency approach is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Transparency approach must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
});

/** Consortium identity and contact (section 1); extend when more consortium fields exist. */
const consortiumDetailsLiveSchema = z.object({
  consortiumName: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Consortium name is required")
        .max(100, "Consortium name must be at most 100 characters"),
    ),
  contactPerson: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Contact person is required")
        .max(100, "Contact person must be at most 100 characters"),
    ),
  contactEmail: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .email("Enter a valid email")
        .max(254, "Email must be at most 254 characters"),
    ),
  xUsername: handleOptional,
  linkedinUsername: handleOptional,
  website: websiteOptional,
  otherLinks: z.array(individualLinkItemSchema).default([]),
});

/** Consortium governance statement (section 2); overlaps organisation governance fields plus internal process. */
const consortiumGovernanceLiveSchema = z.object({
  conflictOfInterestStatement: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Conflict of interest statement must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  contributionsToCardano: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Contributions to Cardano is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Contributions to Cardano must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  motivation: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Motivation is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Motivation must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  decentralisedGovernanceImportance: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Why decentralised governance is important is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `This field must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  constitutionalInterpretation: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Constitutional familiarity and interpretation is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Constitutional familiarity and interpretation must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  perspectiveYouWouldBring: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Perspective you would bring is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Perspective you would bring must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  transparencyApproach: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Transparency approach is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Transparency approach must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  internalDecisionMakingProcess: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Internal decision-making process is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Internal decision-making process must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
});

const consortiumMemberLiveSchema = z.object({
  fullNameOrAlias: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Name or alias is required")
        .max(100, "Name or alias must be at most 100 characters"),
    ),
  geographicRegion: regionIdOptional,
  briefBiography: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .min(1, "Brief biography is required")
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Brief biography must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  professionalBackground: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Professional background must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  governanceExperience: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Governance experience must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
  poolId: poolIdOptional,
  drepId: drepIdOptional,
  xUsername: handleOptional,
  linkedinUsername: handleOptional,
  website: websiteOptional,
  otherLinks: z.array(individualLinkItemSchema).default([]),
  conflictOfInterestStatement: z
    .string()
    .transform((s) => (typeof s === "string" ? s.trim() : ""))
    .pipe(
      z
        .string()
        .max(
          INDIVIDUAL_LONG_TEXT_MAX,
          `Conflict of interest statement must be at most ${INDIVIDUAL_LONG_TEXT_MAX} characters`,
        ),
    ),
});

const consortiumMembersArraySchema = z
  .array(consortiumMemberLiveSchema)
  .min(1, "At least one consortium member is required");

/**
 * @param {{
 *   existingProposal?: { status?: string, metaData?: Record<string, unknown> },
 *   coldCredentialHashDuplicate?: boolean, // true when another live proposal on this vote already has this cold credential
 * }} [context]
 */
function liveProposalBodySchemaForContext(context = {}) {
  return z
    .object({
      title: z.preprocess(
        (v) => (typeof v === "string" ? v.trim() : ""),
        z
          .string()
          .min(1, "Candidate name is required")
          .max(100, "Title must be at most 100 characters"),
      ),
      summary: z.string().max(2000).optional().default(""),
      status: z.literal("live"),
      metaData: z.record(z.string(), z.unknown()).optional().default({}),
      voteId: objectIdString,
    })
    .superRefine((data, ctx) => {
      const md = data.metaData ?? {};
      const trackResult = trackEnum.safeParse(md.track);
      if (!trackResult.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["metaData", "track"],
          message:
            "Select a proposal track (Individual, Organisation, or Consortium)",
        });
        return;
      }
      const track = trackResult.data;
      const existing = context?.existingProposal;
      const storedMeta = existing?.metaData ?? {};
      const isLiveResubmit = existing?.status === "live";
      if (existing?.status === "live") {
        const storedTrack = storedMeta.track;
        const storedParsed = trackEnum.safeParse(storedTrack);
        if (storedParsed.success) {
          if (track !== storedParsed.data) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["metaData", "track"],
              message: "Proposal track cannot be changed after submission.",
            });
          }
        } else if (String(storedTrack ?? "") !== String(track)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["metaData", "track"],
            message: "Proposal track cannot be changed after submission.",
          });
        }
      }

      const expectedTitle =
        track === "individual"
          ? trimStr(normalizeIndividualInput(md.individual).fullNameOrAlias)
          : track === "organisation"
            ? trimStr(
                normalizeOrganisationInput(md.organisation).organisationName,
              )
            : trimStr(normalizeConsortiumInput(md.consortium).consortiumName);

      if (trimStr(data.title) !== expectedTitle) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["title"],
          message:
            "Proposal title must match the candidate name for the selected track",
        });
      }

      if (track === "individual") {
        const normalized = normalizeIndividualInput(md.individual);
        const indResult = individualIdentityLiveSchema.safeParse(normalized);
        if (!indResult.success) {
          for (const issue of indResult.error.issues) {
            ctx.addIssue({
              code: issue.code ?? z.ZodIssueCode.custom,
              message: issue.message,
              path: ["metaData", "individual", ...issue.path],
            });
          }
        }
      }

      if (track === "organisation") {
        const normalized = normalizeOrganisationInput(md.organisation);
        const orgResult = organisationLiveSchema.safeParse(normalized);
        if (!orgResult.success) {
          for (const issue of orgResult.error.issues) {
            ctx.addIssue({
              code: issue.code ?? z.ZodIssueCode.custom,
              message: issue.message,
              path: ["metaData", "organisation", ...issue.path],
            });
          }
        }
      }

      if (track === "consortium") {
        const normalized = normalizeConsortiumInput(md.consortium);
        const consDetailsResult = consortiumDetailsLiveSchema.safeParse(normalized);
        if (!consDetailsResult.success) {
          for (const issue of consDetailsResult.error.issues) {
            ctx.addIssue({
              code: issue.code ?? z.ZodIssueCode.custom,
              message: issue.message,
              path: ["metaData", "consortium", ...issue.path],
            });
          }
        }
        const consGovResult = consortiumGovernanceLiveSchema.safeParse(normalized);
        if (!consGovResult.success) {
          for (const issue of consGovResult.error.issues) {
            ctx.addIssue({
              code: issue.code ?? z.ZodIssueCode.custom,
              message: issue.message,
              path: ["metaData", "consortium", ...issue.path],
            });
          }
        }
        const membersResult = consortiumMembersArraySchema.safeParse(
          normalized.members,
        );
        if (!membersResult.success) {
          for (const issue of membersResult.error.issues) {
            ctx.addIssue({
              code: issue.code ?? z.ZodIssueCode.custom,
              message: issue.message,
              path: ["metaData", "consortium", "members", ...issue.path],
            });
          }
        }
      }

      const coldHash = trimStr(md.coldCredentialHash);
      const coldTypeRaw = md.coldCredentialType;
      if (isLiveResubmit) {
        const storedCold = trimStr(storedMeta.coldCredentialHash);
        const storedType = storedMeta.coldCredentialType;
        if (storedCold) {
          if (coldHash !== storedCold) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["metaData", "coldCredentialHash"],
              message:
                "Cold credential hash cannot be changed after submission.",
            });
          }
        } else if (!coldHash) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["metaData", "coldCredentialHash"],
            message: "Cold credential hash is required",
          });
        } else if (!isValidCcColdCredential(coldHash)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["metaData", "coldCredentialHash"],
            message:
              "Cold credential hash must be a valid CIP-0129 cc_cold identifier and at most 64 characters",
          });
        }
        if (context?.coldCredentialHashDuplicate === true) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["metaData", "coldCredentialHash"],
            message: "This cold credential hash is already used by another proposal",
          });
        }
        if (coldCredentialTypeEnum.safeParse(storedType).success) {
          if (coldTypeRaw !== storedType) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["metaData", "coldCredentialType"],
              message:
                "Credential type cannot be changed after submission.",
            });
          }
        } else {
          const parsed = coldCredentialTypeEnum.safeParse(coldTypeRaw);
          if (!parsed.success) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["metaData", "coldCredentialType"],
              message: "Select Key credential or Script credential",
            });
          }
        }
      } else {
        if (!coldHash) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["metaData", "coldCredentialHash"],
            message: "Cold credential hash is required",
          });
        } else if (!isValidCcColdCredential(coldHash)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["metaData", "coldCredentialHash"],
            message:
              "Cold credential hash must be a valid CIP-0129 cc_cold identifier and at most 64 characters",
          });
        }
        if (context?.coldCredentialHashDuplicate === true) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["metaData", "coldCredentialHash"],
            message: "This cold credential hash is already used by another proposal",
          });
        }
        const ctParsed = coldCredentialTypeEnum.safeParse(coldTypeRaw);
        if (!ctParsed.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["metaData", "coldCredentialType"],
            message: "Select Key credential or Script credential",
          });
        }
      }

      const da = md.declarationAgreement;
      if (da?.accuracyPublicVisibilityConsent !== true) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [
            "metaData",
            "declarationAgreement",
            "accuracyPublicVisibilityConsent",
          ],
          message:
            "You must confirm accuracy and consent to public visibility to submit",
        });
      }
      if (da?.termsAndConditionsAgreement !== true) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [
            "metaData",
            "declarationAgreement",
            "termsAndConditionsAgreement",
          ],
          message:
            "You must agree to the Intersect CC Election Terms and Conditions to submit",
        });
      }
      if (track === "consortium" && da?.memberIdentityVouching !== true) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["metaData", "declarationAgreement", "memberIdentityVouching"],
          message:
            "You must confirm you are authorised to vouch for all consortium members to submit",
        });
      }
    });
}

const draftProposalBodySchema = z.object({
  title: z.string().max(100).optional().default(""),
  voteId: objectIdString,
  status: z.enum(["draft"]).optional().default("draft"),
  summary: z.string().max(2000).optional().default(""),
  metaData: z.record(z.string(), z.unknown()).optional().default({}),
});

/**
 * @param {unknown} body - Raw request body
 * @param {{
 *   existingProposal?: { status?: string, metaData?: Record<string, unknown> },
 * }} [context] - On PUT, include stored proposal snapshot.
 * @returns {{ success: true, data } | { success: false, error: z.ZodError }}
 */
export function validate(body, context = {}) {
  if (body?.status === "live") {
    const result = liveProposalBodySchemaForContext(context).safeParse(body);
    if (result.success) return { success: true, data: result.data };
    return { success: false, error: result.error };
  }
  const result = draftProposalBodySchema.safeParse(body);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error };
}

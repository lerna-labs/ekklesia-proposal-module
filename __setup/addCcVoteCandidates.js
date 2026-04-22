/**
 * Add 11 live candidate proposals to CC Vote 2026 with mixed tracks.
 *
 * Usage (repo root):
 *   node __setup/addCcVoteCandidates.js
 */

import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.development") });

import { loadEnvironmentVariables } from "../helper/envLoader.js";
loadEnvironmentVariables(path.join(__dirname, ".."));

import { connectToDatabase, disconnectFromDatabase } from "../helper/dbManager.js";
import { Vote } from "../schema/Vote.js";
import { Proposal } from "../schema/Proposal.js";
import { User } from "../schema/User.js";

const CC_VOTE_SLUG = "cc-vote-2026";
const CANDIDATE_COUNT = 11;

const TRACK_SEQUENCE = [
  "individual",
  "organisation",
  "consortium",
  "individual",
  "organisation",
  "consortium",
  "individual",
  "organisation",
  "consortium",
  "individual",
  "organisation",
];

function buildDeclarationAgreement(track) {
  return {
    accuracyPublicVisibilityConsent: true,
    termsAndConditionsAgreement: true,
    memberIdentityVouching: track === "consortium",
  };
}

function buildCommonMetaData(track, index) {
  return {
    track,
    treasuryDonationTxHash: `txhash-${String(index + 1).padStart(2, "0")}-ccvote2026`,
    treasuryDonationConfirmed: true,
    coldCredentialHash: `cold-credential-hash-${String(index + 1).padStart(2, "0")}`,
    coldCredentialType: index % 2 === 0 ? "keyCredential" : "scriptCredential",
    declarationAgreement: buildDeclarationAgreement(track),
  };
}

function buildIndividual(index) {
  return {
    fullNameOrAlias: `CC Candidate Individual ${index + 1}`,
    contactEmail: `cc-individual-${index + 1}@example.com`,
    geographicRegion: "",
    poolId: "",
    drepId: "",
    xUsername: `ccindividual${index + 1}`,
    linkedinUsername: "",
    website: "https://example.com",
    otherLinks: [],
    professionalBackground:
      "Experienced governance contributor and ecosystem operator with a focus on transparent decision making.",
    governanceExperience:
      "Contributed to governance discussions, review cycles, and public feedback over multiple proposal rounds.",
    briefBiography:
      "Long-term Cardano ecosystem contributor focused on practical governance outcomes and accountability.",
    conflictOfInterestStatement: "No known conflicts beyond publicly disclosed ecosystem roles.",
    contributionsToCardano:
      "Supported community education initiatives, governance tooling feedback, and proposal review participation.",
    motivation:
      "I want to help improve governance quality through consistent evaluation criteria and transparent communication.",
    decentralisedGovernanceImportance:
      "Decentralised governance distributes responsibility and creates resilient decision making across the ecosystem.",
    constitutionalInterpretation:
      "Constitutional guidance should be applied with clarity, consistency, and explicit rationale for decisions.",
    perspectiveYouWouldBring:
      "Practical operator perspective with emphasis on measurable outcomes, process clarity, and inclusiveness.",
    transparencyApproach:
      "Publish decisions, supporting reasoning, and trade-offs so stakeholders can understand and scrutinize outcomes.",
  };
}

function buildOrganisation(index) {
  return {
    organisationName: `CC Org Candidate ${index + 1}`,
    organisationDescription:
      "Organisation focused on governance operations, ecosystem support, and process improvement.",
    geographicRegion: "",
    contactPerson: `Organisation Contact ${index + 1}`,
    contactEmail: `cc-organisation-${index + 1}@example.com`,
    poolId: "",
    drepId: "",
    xUsername: `ccorg${index + 1}`,
    linkedinUsername: "",
    website: "https://example.com",
    otherLinks: [],
    organisationalAreasOfExpertise:
      "Governance operations, stakeholder facilitation, and process design for distributed decision making.",
    governanceExperience:
      "Facilitated governance consultations and drafted implementation recommendations for community initiatives.",
    conflictOfInterestStatement:
      "Potential overlaps are disclosed publicly; recusal is used when decisions involve direct organisational interests.",
    contributionsToCardano:
      "Delivered workshops, documentation, and coordination support for governance participation programs.",
    motivation:
      "Our organisation is motivated to support stronger governance quality through structured collaboration and accountability.",
    decentralisedGovernanceImportance:
      "Decentralised governance enables broader participation and better long-term alignment across stakeholders.",
    constitutionalInterpretation:
      "Constitutional interpretation should prioritize transparency, proportionality, and predictable precedent.",
    perspectiveYouWouldBring:
      "We bring facilitation and policy experience to translate complex inputs into clear, actionable governance outcomes.",
    transparencyApproach:
      "We will publish rationale, alternatives considered, and implementation follow-up for each major decision.",
  };
}

function buildConsortium(index) {
  return {
    consortiumName: `CC Consortium Candidate ${index + 1}`,
    contactPerson: `Consortium Contact ${index + 1}`,
    contactEmail: `cc-consortium-${index + 1}@example.com`,
    xUsername: `ccconsortium${index + 1}`,
    linkedinUsername: "",
    website: "https://example.com",
    otherLinks: [],
    conflictOfInterestStatement:
      "Consortium members disclose affiliations and apply recusal where direct conflicts exist.",
    contributionsToCardano:
      "Consortium members have contributed to governance tooling, education, and operational support.",
    motivation:
      "Our consortium is motivated to represent diverse expertise while maintaining consistent and transparent governance standards.",
    decentralisedGovernanceImportance:
      "A decentralised approach allows expertise from multiple domains to shape robust and legitimate governance outcomes.",
    constitutionalInterpretation:
      "Constitutional interpretation should be explicit, principle-based, and documented for future consistency.",
    perspectiveYouWouldBring:
      "Multi-disciplinary perspective combining technical, operational, and community governance experience.",
    transparencyApproach:
      "We will maintain public records of member positions, rationale summaries, and any dissenting views.",
    internalDecisionMakingProcess:
      "Consensus-first process with documented voting fallback when consensus cannot be reached in time.",
    members: [
      {
        fullNameOrAlias: `Consortium Member A${index + 1}`,
        geographicRegion: "",
        briefBiography: "Governance contributor with policy and community coordination experience.",
        professionalBackground: "Policy and governance operations.",
        governanceExperience: "Active in governance discussions and proposal assessment.",
        poolId: "",
        drepId: "",
        xUsername: "",
        linkedinUsername: "",
        website: "",
        otherLinks: [],
        conflictOfInterestStatement: "No undeclared conflicts.",
      },
    ],
  };
}

function buildCandidateMetaData(track, index) {
  const metaData = buildCommonMetaData(track, index);
  if (track === "individual") {
    metaData.individual = buildIndividual(index);
  } else if (track === "organisation") {
    metaData.organisation = buildOrganisation(index);
  } else {
    metaData.consortium = buildConsortium(index);
  }
  return metaData;
}

function buildCandidateTitle(track, index) {
  if (track === "individual") return `CC Candidate Individual ${index + 1}`;
  if (track === "organisation") return `CC Org Candidate ${index + 1}`;
  return `CC Consortium Candidate ${index + 1}`;
}

async function ensureUser(proposerId, index) {
  await User.findOneAndUpdate(
    { _id: proposerId },
    {
      $set: {
        name: `CC Candidate User ${index + 1}`,
        updatedAt: new Date(),
        lastLogin: new Date(),
      },
    },
    { upsert: true },
  );
}

async function main() {
  let exitCode = 0;
  try {
    console.log("Connecting to database...");
    const conn = await connectToDatabase();
    if (!conn) {
      throw new Error("Could not connect to MongoDB. Check MONGODB_* in .env");
    }

    const vote = await Vote.findOne({ slug: CC_VOTE_SLUG }).lean();
    if (!vote) {
      throw new Error(
        `Vote with slug "${CC_VOTE_SLUG}" was not found. Run __setup/setup-cc-vote2026.js first.`,
      );
    }

    console.log(`Target vote: ${vote.title} (${vote._id})`);

    const inserted = [];
    const now = Date.now();
    for (let i = 0; i < CANDIDATE_COUNT; i++) {
      const track = TRACK_SEQUENCE[i];
      const title = buildCandidateTitle(track, i);
      const proposerId = `stake_test1cccandidate${String(i + 1).padStart(4, "0")}`;
      await ensureUser(proposerId, i);

      const proposal = await Proposal.create({
        proposerId,
        voteId: vote._id,
        title,
        summary: "",
        status: "live",
        submittedAt: new Date(now - (CANDIDATE_COUNT - i) * 60 * 1000),
        metaData: buildCandidateMetaData(track, i),
      });

      inserted.push({
        id: proposal._id.toString(),
        title,
        track,
        proposerId,
      });
    }

    console.log(`\n✅ Added ${inserted.length} CC candidates to ${CC_VOTE_SLUG}`);
    for (const row of inserted) {
      console.log(`  - ${row.title} [${row.track}] -> ${row.id}`);
    }
  } catch (error) {
    console.error(error);
    exitCode = 1;
  } finally {
    await disconnectFromDatabase();
    process.exit(exitCode);
  }
}

main();

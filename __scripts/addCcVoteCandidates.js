/**
 * Add 11 live candidate proposals to CC Vote 2026 with mixed tracks.
 *
 * Usage (repo root):
 *   node __scripts/addCcVoteCandidates.js
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
import { Region } from "../schema/Region.js";

const CC_VOTE_SLUG = "cc-vote-2026";
const CANDIDATE_COUNT = 11;
const BECH32_PAYLOAD_CHARS = "023456789acdefghjklmnpqrstuvwxyz";
const BECH32_ID_PAYLOAD_CHARS = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const CC_COLD_PREFIX = "cc_cold1";
const CC_COLD_TOTAL_LENGTH = 61;
const CC_COLD_PAYLOAD_LENGTH = CC_COLD_TOTAL_LENGTH - CC_COLD_PREFIX.length;

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

function buildColdCredentialHash(index) {
  let payload = "";
  for (let i = 0; i < CC_COLD_PAYLOAD_LENGTH; i++) {
    const charIndex = (index * 7 + i * 3) % BECH32_PAYLOAD_CHARS.length;
    payload += BECH32_PAYLOAD_CHARS[charIndex];
  }
  return `${CC_COLD_PREFIX}${payload}`;
}

function buildRegionId(regionIds, index) {
  if (!Array.isArray(regionIds) || regionIds.length === 0) return "";
  return regionIds[index % regionIds.length];
}

function buildBech32LikeId(prefix, index, payloadLength = 52) {
  let payload = "";
  for (let i = 0; i < payloadLength; i++) {
    const charIndex = (index * 11 + i * 5) % BECH32_ID_PAYLOAD_CHARS.length;
    payload += BECH32_ID_PAYLOAD_CHARS[charIndex];
  }
  return `${prefix}1${payload}`;
}

function buildPoolId(index) {
  return buildBech32LikeId("pool", index, 52);
}

function buildDrepId(index) {
  return buildBech32LikeId("drep", index, 52);
}

function buildCommonMetaData(track, index) {
  return {
    track,
    coldCredentialHash: buildColdCredentialHash(index),
    coldCredentialType: index % 2 === 0 ? "keyCredential" : "scriptCredential",
    declarationAgreement: buildDeclarationAgreement(track),
  };
}

function buildIndividual(regionIds, index) {
  return {
    fullNameOrAlias: `CC Candidate Individual ${index + 1}`,
    contactEmail: `cc-individual-${index + 1}@example.com`,
    geographicRegion: buildRegionId(regionIds, index),
    poolId: buildPoolId(index),
    drepId: buildDrepId(index),
    xUsername: `ccindividual${index + 1}`,
    linkedinUsername: `cc-individual-${index + 1}`,
    website: `https://individual-${index + 1}.example.com`,
    otherLinks: [
      {
        title: "Candidate profile",
        url: `https://profiles.example.com/individual-${index + 1}`,
      },
      {
        title: "Governance forum posts",
        url: `https://forum.example.com/individual-${index + 1}`,
      },
    ],
    professionalBackground:
      "### Professional background\n\nI have worked in governance operations and stakeholder facilitation for more than five years, with a focus on transparent decision frameworks.",
    governanceExperience:
      "I have participated in multiple governance review cycles, authored feedback on proposals, and facilitated public consultation sessions.",
    briefBiography:
      "Cardano ecosystem contributor focused on practical governance outcomes, process clarity, and accountability for public decisions.",
    conflictOfInterestStatement:
      "I hold minor advisory roles that are publicly disclosed and will recuse from any decision with direct overlap.",
    contributionsToCardano:
      "Contributed to community education sessions, tooling feedback rounds, and governance working groups.",
    motivation:
      "I am running to improve governance quality through consistent evaluation criteria, documented rationale, and clear communication.",
    decentralisedGovernanceImportance:
      "Decentralised governance distributes responsibility and improves resilience by reducing single points of influence.",
    constitutionalInterpretation:
      "Constitutional interpretation should be principle-driven, consistent across cases, and accompanied by written reasoning.",
    perspectiveYouWouldBring:
      "I bring an operator perspective with emphasis on measurable outcomes, clear process gates, and broad participation.",
    transparencyApproach:
      "I will publish decision rationales, alternatives considered, and follow-up actions for accountability.",
  };
}

function buildOrganisation(regionIds, index) {
  return {
    organisationName: `CC Org Candidate ${index + 1}`,
    organisationDescription:
      "## Organisation description\n\nOur organisation supports governance operations, ecosystem enablement, and process improvement across community programs.",
    geographicRegion: buildRegionId(regionIds, index + 1),
    contactPerson: `Organisation Contact ${index + 1}`,
    contactEmail: `cc-organisation-${index + 1}@example.com`,
    poolId: buildPoolId(index + 100),
    drepId: buildDrepId(index + 100),
    xUsername: `ccorg${index + 1}`,
    linkedinUsername: `cc-org-${index + 1}`,
    website: `https://organisation-${index + 1}.example.com`,
    otherLinks: [
      {
        title: "Organisation website",
        url: `https://org.example.com/candidate-${index + 1}`,
      },
      {
        title: "Public reports",
        url: `https://reports.example.com/org-${index + 1}`,
      },
    ],
    organisationalAreasOfExpertise:
      "Governance operations, stakeholder facilitation, policy analysis, and process design for distributed decision making.",
    governanceExperience:
      "Facilitated governance consultations, coordinated stakeholder workshops, and delivered implementation recommendations.",
    conflictOfInterestStatement:
      "Potential overlaps are publicly disclosed, and we apply recusal policies whenever direct organisational interests are involved.",
    contributionsToCardano:
      "Delivered workshops, public documentation, and operational coordination for governance participation programs.",
    motivation:
      "Our organisation is motivated to support stronger governance quality through structured collaboration and public accountability.",
    decentralisedGovernanceImportance:
      "Decentralised governance enables broader participation and long-term alignment across diverse stakeholder groups.",
    constitutionalInterpretation:
      "Constitutional interpretation should prioritize transparency, proportionality, and a predictable body of precedent.",
    perspectiveYouWouldBring:
      "We bring facilitation and policy expertise to translate complex input into actionable governance outcomes.",
    transparencyApproach:
      "We will publish rationale, alternatives considered, and implementation follow-up for major decisions.",
  };
}

function buildConsortium(regionIds, index) {
  return {
    consortiumName: `CC Consortium Candidate ${index + 1}`,
    contactPerson: `Consortium Contact ${index + 1}`,
    contactEmail: `cc-consortium-${index + 1}@example.com`,
    xUsername: `ccconsortium${index + 1}`,
    linkedinUsername: `cc-consortium-${index + 1}`,
    website: `https://consortium-${index + 1}.example.com`,
    otherLinks: [
      {
        title: "Consortium profile",
        url: `https://consortiums.example.com/${index + 1}`,
      },
      {
        title: "Operational charter",
        url: `https://docs.example.com/consortium-${index + 1}-charter`,
      },
    ],
    conflictOfInterestStatement:
      "Consortium members disclose affiliations and apply recusal whenever direct conflicts are identified.",
    contributionsToCardano:
      "Consortium members have contributed to governance tooling, educational initiatives, and operational support.",
    motivation:
      "Our consortium is motivated to represent diverse expertise while maintaining consistent, transparent governance standards.",
    decentralisedGovernanceImportance:
      "A decentralised approach allows expertise from multiple domains to shape robust and legitimate governance outcomes.",
    constitutionalInterpretation:
      "Constitutional interpretation should be explicit, principle-based, and documented for consistency over time.",
    perspectiveYouWouldBring:
      "A multidisciplinary perspective combining technical, operational, legal, and community governance experience.",
    transparencyApproach:
      "We will maintain public records of member positions, rationale summaries, and dissenting views when present.",
    internalDecisionMakingProcess:
      "Consensus-first governance with documented voting fallback, role clarity, and published decision logs.",
    members: [
      {
        fullNameOrAlias: `Consortium Member A${index + 1}`,
        geographicRegion: buildRegionId(regionIds, index + 2),
        briefBiography:
          "Governance contributor with policy and community coordination experience across ecosystem initiatives.",
        professionalBackground:
          "Background in public policy, distributed governance design, and operational program management.",
        governanceExperience:
          "Active in governance consultations, proposal assessment, and public reporting workflows.",
        poolId: buildPoolId(index + 200),
        drepId: buildDrepId(index + 200),
        xUsername: `consortiummembera${index + 1}`,
        linkedinUsername: `consortium-member-a-${index + 1}`,
        website: `https://members.example.com/a-${index + 1}`,
        otherLinks: [
          {
            title: "Member profile",
            url: `https://profiles.example.com/consortium-a-${index + 1}`,
          },
        ],
        conflictOfInterestStatement:
          "No undeclared conflicts; advisory engagements are disclosed publicly.",
      },
      {
        fullNameOrAlias: `Consortium Member B${index + 1}`,
        geographicRegion: buildRegionId(regionIds, index + 3),
        briefBiography:
          "Technical governance practitioner focused on constitutional interpretation and decision transparency.",
        professionalBackground:
          "Software architecture, governance tooling, and compliance-oriented process engineering.",
        governanceExperience:
          "Served on advisory groups and coordinated governance proposal review cycles.",
        poolId: buildPoolId(index + 300),
        drepId: buildDrepId(index + 300),
        xUsername: `consortiummemberb${index + 1}`,
        linkedinUsername: `consortium-member-b-${index + 1}`,
        website: `https://members.example.com/b-${index + 1}`,
        otherLinks: [
          {
            title: "Governance writing",
            url: `https://writing.example.com/consortium-b-${index + 1}`,
          },
        ],
        conflictOfInterestStatement:
          "Potential overlaps are disclosed and recusals are applied when necessary.",
      },
    ],
  };
}

function buildCandidateMetaData(regionIds, track, index) {
  const metaData = buildCommonMetaData(track, index);
  if (track === "individual") {
    metaData.individual = buildIndividual(regionIds, index);
  } else if (track === "organisation") {
    metaData.organisation = buildOrganisation(regionIds, index);
  } else {
    metaData.consortium = buildConsortium(regionIds, index);
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
        `Vote with slug "${CC_VOTE_SLUG}" was not found. Run __scripts/setup-cc-vote2026.js first.`,
      );
    }

    console.log(`Target vote: ${vote.title} (${vote._id})`);
    const regionDocs = await Region.find({})
      .sort({ name: 1 })
      .select("_id")
      .lean();
    const regionIds = regionDocs.map((region) => String(region._id)).filter(Boolean);
    if (regionIds.length === 0) {
      throw new Error(
        'No regions found. Run "__scripts/seedRegions.js" (or setupVotesAndGeoSeed.js) before seeding CC candidates.',
      );
    }

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
        status: "live",
        submittedAt: new Date(now - (CANDIDATE_COUNT - i) * 60 * 1000),
        metaData: buildCandidateMetaData(regionIds, track, i),
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

/**
 * Create dummy data: 3 users (same as ADMINS in createDummyData.js), 1 vote, and 3 proposals per user
 * (one draft, one live, one withdrawn). All proposal titles include the user name (e.g. "MAD – Draft").
 *
 * Usage (from project root): node __setup/createDummyDataThreeUsers.js
 * From __setup: node createDummyDataThreeUsers.js
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.development") });

import { loadEnvironmentVariables } from "../helper/envLoader.js";
loadEnvironmentVariables();

import { connectToDatabase, disconnectFromDatabase } from "../helper/dbManager.js";
import { Vote } from "../schema/Vote.js";
import { Proposal } from "../schema/Proposal.js";
import { User } from "../schema/User.js";

const CSV_PATH = path.join(__dirname, "categories.csv");

function parseCsvLine(line) {
  const fields = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let searchStart = i + 1;
      while (searchStart < line.length) {
        const next = line.indexOf('"', searchStart);
        if (next === -1) {
          fields.push(line.slice(i + 1).replace(/""/g, '"'));
          i = line.length;
          break;
        }
        if (line[next + 1] === '"') {
          searchStart = next + 2;
          continue;
        }
        fields.push(line.slice(i + 1, next).replace(/""/g, '"'));
        i = next + 1;
        if (line[i] === ";") i++;
        break;
      }
      continue;
    }
    const sep = line.indexOf(";", i);
    if (sep === -1) {
      fields.push(line.slice(i).trim());
      break;
    }
    fields.push(line.slice(i, sep).trim());
    i = sep + 1;
  }
  return fields;
}

function buildPillarsFromCsv() {
  const raw = readFileSync(CSV_PATH, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    throw new Error("categories.csv must have a header row and at least one data row.");
  }
  const header = parseCsvLine(lines[0]);
  const dataRows = lines.slice(1);
  const rows = dataRows.map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    header.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
  const seen = new Map();
  for (const row of rows) {
    const pillar = (row["Pillar"] ?? "").trim();
    if (!pillar) continue;
    if (seen.has(pillar)) continue;
    const pillarDesc = (row["Pillar description"] ?? "").trim();
    seen.set(pillar, { title: pillar, description: pillarDesc || "" });
  }
  const pillars = [];
  let sortOrder = 0;
  for (const { title, description } of seen.values()) {
    sortOrder += 1;
    pillars.push({
      _id: new mongoose.Types.ObjectId().toString(),
      title,
      description: description ?? "",
      sortOrder,
    });
  }
  return pillars;
}

const LEGAL_DECLARATIONS = {
  authorizationEntity: true,
  authorizationAttestation: true,
  submitterName: "Test Submitter",
  submitterRole: "Lead",
  submitterEmail: "submitter@example.com",
};

function buildBudget2026AdminMetaData(template, index) {
  const adminChoice = index % 2 === 0 ? "Intersect" : "Other";
  const entityType = index % 3 === 0 ? "company" : "individual";
  const isCompany = entityType === "company";
  const kycSubmitted = index % 4 !== 3 ? "Yes" : "No";

  const baseContact = {
    name: template.contactName || "Test Contact",
    email: template.contactEmail || "admin-contact@example.com",
  };

  const contractingParty = {
    legalEntityType: entityType,
    legalEntityName: isCompany ? "Acme Solutions Ltd" : "",
    legalEntityRegistrationNumber: isCompany ? "REG-123456" : "",
    legalEntityCountry: isCompany ? "Singapore" : "",
    legalEntityAddressLine1: isCompany ? "1 Business Park Drive" : "",
    legalEntityAddressLine2: isCompany ? "Suite 100" : "",
    legalEntityAddressLine3: isCompany ? "" : "",
    govtIssuedIdNumber: isCompany ? "" : "PASSPORT-XYZ789",
    countryOfResidence: isCompany ? "" : "DE",
    residentialAddressLine1: isCompany ? "" : "42 Main Street",
    residentialAddressLine2: isCompany ? "" : "Apt 5",
    residentialAddressLine3: isCompany ? "" : "",
  };

  return {
    administrator: adminChoice,
    intersectAdministratorFeeConsent: adminChoice === "Intersect",
    otherAdministrator: adminChoice === "Other" ? "External Admin Corp." : "",
    contractingParty,
    primaryContact: { ...baseContact },
    signatoryContact: {
      title: isCompany ? "Director" : "Proposer",
      name: template.contactName || "Jane Signatory",
      email: template.contactEmail ? `signatory-${template.contactEmail}` : "signatory@example.com",
      authorization: true,
    },
    kycInfo: {
      submitted: kycSubmitted,
      email: kycSubmitted === "No" ? "kyc-submit@example.com" : "",
    },
    independentAudits: "Third-party audit firm TBD.",
  };
}

function randomConversionRate() {
  return Math.round((0.2 + Math.random() * 1) * 100) / 100;
}

function buildBudget2026MetaData(template, categoryIds, proposalIndex = 0) {
  const ids = Array.isArray(categoryIds) ? categoryIds : categoryIds ? [categoryIds] : [];
  const pillars = ids.map((id) => String(id));
  const wpBudget = Math.floor(template.totalBudget * 0.6);
  const adminMeta = buildBudget2026AdminMetaData(template, proposalIndex);
  return {
    treasuryDonationTxHash: "abc123def456789",
    treasuryDonationConfirmed: true,
    trackRecord: "Previous community projects delivered on time.",
    estimatedDuration: 6,
    strategyFramework: {
      pillars,
      pillarRationale: "Alignment with test budget priorities.",
      kpiAlignment: "KPIs aligned with roadmap deliverables.",
    },
    proposalDetails: {
      conversionRate: randomConversionRate(),
      workPackages: [
        {
          name: `WP1 – ${template.title.slice(0, 30)}`,
          summary: template.summary,
          initiativeType: "New Initiative",
          proposalType: "Technical (software/IT)",
          supportingDocuments: [{ title: "Design doc", url: "https://example.com/design.pdf" }],
          coreObjectives: ["Deliver scope", "Report progress"],
          expectedValue: "Value for community.",
          metric: "On-time delivery.",
          milestones: [
            { name: "M1 – Kickoff", deliverables: "Plan and approval", acceptanceCriteria: "Approved", duration: "2 weeks" },
          ],
          budgetBreakdown: [
            {
              costCategory: "Development",
              name: "Core development",
              description: "Core work",
              quantity: 1,
              unitPrice: wpBudget,
              total: wpBudget,
            },
          ],
        },
      ],
    },
    proposerDetails: {
      name: template.contactName,
      email: template.contactEmail || "proposal@example.com",
      links: [{ title: "Project", url: "https://example.com" }],
    },
    supportingInfoLinks: [{ title: "Project plan", url: "https://example.com/plan.pdf" }],
    treasuryRepayment: "No",
    treasuryRepaymentCircumstances: "",
    priorFunding: "None",
    ...adminMeta,
    legalDeclarations: LEGAL_DECLARATIONS,
  };
}

/** Same 3 stake addresses as in createDummyData (only the first is vote admin). Names used in proposal titles. */
const USERS = [
  { id: "stake_test1uqwcrkr4chst8xnk5se4442fz5ku5ekql644zew5l5uwswgf643wf", name: "MAD" },
  { id: "stake_test1uqvx67glm2hdjcfp9pg0d59x0595n372k8sh437vk3hda0gukg9fa", name: "ADAM" },
  { id: "stake_test1ury4vups5rm3dahv3vht7lp83kdpxc0assfgwulm2z4rn4qe9ceqz", name: "SIMO" },
];

/** Only MAD is admin of the vote. */
const VOTE_ADMIN_ID = USERS[0].id;

async function createDummyDataThreeUsers() {
  try {
    console.log("Connecting to database...");
    await connectToDatabase();

    const now = new Date();

    // 1. Create/ensure the 3 users
    console.log("Creating users...");
    for (const u of USERS) {
      await User.findOneAndUpdate(
        { _id: u.id },
        { $set: { name: u.name, lastLogin: now, updatedAt: now } },
        { upsert: true }
      );
      console.log(`  User: ${u.name} (${u.id})`);
    }

    // 2. Build pillars and create vote
    console.log("Building pillars from categories.csv...");
    const pillars = buildPillarsFromCsv();
    if (pillars.length === 0) {
      throw new Error("No pillars from categories.csv. Check categories.csv.");
    }
    console.log(`  Built ${pillars.length} pillars.`);

    const submissionStart = new Date(now);
    submissionStart.setMonth(submissionStart.getMonth() - 1);
    const submissionEnd = new Date(now);
    submissionEnd.setMonth(submissionEnd.getMonth() + 2);
    const feedbackStart = new Date(submissionEnd);
    feedbackStart.setDate(feedbackStart.getDate() + 1);
    const feedbackEnd = new Date(feedbackStart);
    feedbackEnd.setMonth(feedbackEnd.getMonth() + 1);
    const reviewStart = new Date(feedbackEnd);
    reviewStart.setDate(reviewStart.getDate() + 1);
    const reviewEnd = new Date(reviewStart);
    reviewEnd.setMonth(reviewEnd.getMonth() + 1);
    const votingStart = new Date(reviewEnd);
    votingStart.setDate(votingStart.getDate() + 1);
    const votingEnd = new Date(votingStart);
    votingEnd.setMonth(votingEnd.getMonth() + 1);

    console.log("Creating vote...");
    const vote = await Vote.create({
      title: "Three Users Test Vote",
      description: "Vote for testing: 3 users, 3 proposals each (draft, live, withdrawn).",
      slug: "three-users-test-vote",
      admins: [VOTE_ADMIN_ID],
      submissionStartDate: submissionStart,
      submissionEndDate: submissionEnd,
      feedbackStartDate: feedbackStart,
      feedbackEndDate: feedbackEnd,
      reviewStartDate: reviewStart,
      reviewEndDate: reviewEnd,
      votingStartDate: votingStart,
      votingEndDate: votingEnd,
      validationScript: "budget2026/validationScript.js",
      excludeScript: "budget2026/excludeScript.js",
      form: "budget2026",
      depositOptions: {
        treasuryDonation: 1_000_000_000,
        depositAddress: "",
        depositAmount: 0,
      },
      sortOptions: [
        { value: "title", label: "Proposal Title", field: "title" },
        { value: "totalBudget", label: "Total Budget", field: "metaData.totalBudget" },
        { value: "commentCount", label: "Comment Count", field: "commentCount" },
        { value: "submittedAt", label: "Submission Date", field: "submittedAt" },
        { value: "updatedAt", label: "Last Updated", field: "updatedAt" },
      ],
      filterOptions: [
        { param: "status", label: "Status", field: "status", allowedValues: ["live", "withdrawn", "draft"], multiple: true },
        {
          param: "category",
          label: "Category",
          field: "metaData.strategyFramework.pillars",
          allowedValues: [],
          multiple: true,
          optionsPath: "metaData.strategyFramework.pillars",
        },
      ],
      searchOptions: [
        { field: "title", matchType: "like", caseSensitive: false },
        { field: "summary", matchType: "like", caseSensitive: false },
        { field: "proposerId", matchType: "like", caseSensitive: false },
        { field: "metaData.proposerDetails.name", matchType: "like", caseSensitive: false },
        { field: "_id", matchType: "objectId" },
      ],
      metaData: { strategyFramework: { pillars } },
    });
    console.log(`  Vote created: ${vote._id} (slug: ${vote.slug})`);

    // 3. For each user: create draft, live, withdrawn (titles include user name)
    let proposalIndex = 0;
    for (const user of USERS) {
      const pillar = pillars[proposalIndex % pillars.length];
      const categoryIds = [pillar._id];

      // Draft
      const draftTitle = `${user.name} – Draft`;
      const draftMetaData = {
        trackRecord: "",
        estimatedDuration: 0,
        strategyFramework: { pillars: [], pillarRationale: "", kpiAlignment: "" },
        proposalDetails: { conversionRate: 0, workPackages: [] },
        proposerDetails: { name: user.name, email: `${user.name.toLowerCase()}@example.com`, links: [] },
        supportingInfoLinks: [],
        treasuryRepayment: "",
        treasuryRepaymentCircumstances: "",
        priorFunding: "",
        administrator: "",
        intersectAdministratorFeeConsent: false,
        otherAdministrator: "",
        contractingParty: {
          legalEntityType: "",
          legalEntityName: "",
          legalEntityRegistrationNumber: "",
          legalEntityCountry: "",
          legalEntityAddressLine1: "",
          legalEntityAddressLine2: "",
          legalEntityAddressLine3: "",
          govtIssuedIdNumber: "",
          countryOfResidence: "",
          residentialAddressLine1: "",
          residentialAddressLine2: "",
          residentialAddressLine3: "",
        },
        primaryContact: { name: "", email: "" },
        signatoryContact: { title: "", name: "", email: "", authorization: false },
        kycInfo: { submitted: "", email: "" },
        independentAudits: "",
      };
      await Proposal.create({
        proposerId: user.id,
        voteId: vote._id,
        title: draftTitle,
        summary: `Draft proposal by ${user.name}.`,
        status: "draft",
        metaData: draftMetaData,
      });
      console.log(`  ${user.name}: created draft "${draftTitle}"`);

      // Live
      const liveTitle = `${user.name} – Live`;
      const liveTemplate = {
        title: liveTitle,
        summary: `Live proposal by ${user.name}.`,
        totalBudget: 50000 + proposalIndex * 10000,
        contactName: user.name,
        contactEmail: `${user.name.toLowerCase()}@example.com`,
      };
      const liveMetaData = buildBudget2026MetaData(liveTemplate, categoryIds, proposalIndex);
      const liveTotalBudget =
        liveMetaData.proposalDetails?.workPackages?.reduce((sum, wp) => {
          const rows = wp.budgetBreakdown || [];
          return sum + rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
        }, 0) ?? 0;
      liveMetaData.totalBudget = liveTotalBudget;
      const submittedAtLive = new Date(now.getTime() - (3 - proposalIndex) * 24 * 60 * 60 * 1000);
      await Proposal.create({
        proposerId: user.id,
        voteId: vote._id,
        title: liveTitle,
        summary: liveTemplate.summary,
        status: "live",
        submittedAt: submittedAtLive,
        metaData: liveMetaData,
      });
      console.log(`  ${user.name}: created live "${liveTitle}"`);

      // Withdrawn
      const withdrawnTitle = `${user.name} – Withdrawn`;
      const withdrawnTemplate = {
        title: withdrawnTitle,
        summary: `Withdrawn proposal by ${user.name}.`,
        totalBudget: 60000 + proposalIndex * 10000,
        contactName: user.name,
        contactEmail: `${user.name.toLowerCase()}@example.com`,
      };
      const withdrawnMetaData = buildBudget2026MetaData(withdrawnTemplate, categoryIds, proposalIndex);
      const withdrawnTotalBudget =
        withdrawnMetaData.proposalDetails?.workPackages?.reduce((sum, wp) => {
          const rows = wp.budgetBreakdown || [];
          return sum + rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
        }, 0) ?? 0;
      withdrawnMetaData.totalBudget = withdrawnTotalBudget;
      const submittedAtWithdrawn = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      await Proposal.create({
        proposerId: user.id,
        voteId: vote._id,
        title: withdrawnTitle,
        summary: withdrawnTemplate.summary,
        status: "withdrawnByProposer",
        submittedAt: submittedAtWithdrawn,
        metaData: withdrawnMetaData,
        withdrawalDetails: {
          category: "Other",
          userId: user.id,
          comment: `${user.name} withdrew to resubmit later.`,
          date: now,
        },
      });
      console.log(`  ${user.name}: created withdrawn "${withdrawnTitle}"`);

      proposalIndex += 1;
    }

    console.log("\n✅ Dummy data (three users) created successfully.");
    console.log(`  Users: ${USERS.map((u) => u.name).join(", ")}`);
    console.log(`  Vote: ${vote._id} (slug: ${vote.slug})`);
    console.log(`  Proposals: 9 total (3 per user: draft, live, withdrawn)`);
  } catch (error) {
    console.error("Error creating dummy data:", error);
    throw error;
  } finally {
    console.log("\nDisconnecting from database...");
    await disconnectFromDatabase();
    process.exit(0);
  }
}

createDummyDataThreeUsers();

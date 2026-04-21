import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { readDrepId, login } from "../helpers/session.js";
import {
  getTreasuryDonationKeysDir,
  getTreasuryDonationUserAddress,
  getOtherStakeKeysDir,
} from "../helpers/stakeKeys.js";
import { sanitizeMetaDataForLiveSubmit } from "../helpers/sanitizeMetaDataForLiveSubmit.js";
import { connect, disconnect } from "../helpers/testkitMongo.js";
import { ensureTestkitVote } from "../helpers/testVote.js";
import { resolveVoteAndLiveProposal } from "../helpers/testProposal.js";
import { Proposal } from "../../schema/Proposal.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api/v0";
const KEYS_TREASURY_USER = getTreasuryDonationKeysDir();
const KEYS_OTHER_STAKE = getOtherStakeKeysDir();

const TREASURY_HASH =
  process.env.TESTKIT_TREASURY_HASH?.trim() ||
  process.env.TESTKIT_TREASURY_DONATION_TX_HASH?.trim() ||
  "";

function requireTreasuryHash() {
  if (!TREASURY_HASH) {
    throw new Error(
      "Missing TESTKIT_TREASURY_HASH (or TESTKIT_TREASURY_DONATION_TX_HASH) in __testkit/.env"
    );
  }
}

function mutateHashLastChar(hash) {
  const clean = String(hash ?? "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(clean)) {
    throw new Error("mutateHashLastChar requires a 64-char hex hash");
  }
  const last = clean.slice(-1);
  const replacement = last === "a" ? "b" : "a";
  return `${clean.slice(0, -1)}${replacement}`;
}

async function createDraft({
  proposerId,
  voteId,
  templateMetaData,
  titlePrefix,
  summary,
  treasuryHash,
}) {
  return Proposal.create({
    proposerId,
    voteId,
    title: `${titlePrefix} ${Date.now()}`,
    summary: summary ?? "",
    status: "draft",
    metaData: {
      ...(templateMetaData ?? {}),
      treasuryDonationTxHash: treasuryHash,
    },
  });
}

function buildLiveBody({
  voteId,
  draftDoc,
  sourceMetaData,
  treasuryHash,
  treasuryDonationConfirmed = true,
  titleSuffix = "",
}) {
  const metaData = sanitizeMetaDataForLiveSubmit(sourceMetaData);
  metaData.treasuryDonationTxHash = treasuryHash;
  metaData.treasuryDonationConfirmed = treasuryDonationConfirmed;
  return {
    voteId: String(voteId),
    title: `${draftDoc.title}${titleSuffix}`,
    summary: draftDoc.summary ?? "",
    status: "live",
    metaData,
  };
}

async function submitLive({ proposalId, body, cookieHeader }) {
  return fetch(`${API_BASE_URL}/proposals/${proposalId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify(body),
  });
}

async function cleanupProposalLineage(createdIds) {
  if (!Array.isArray(createdIds) || createdIds.length === 0) return;
  await Proposal.deleteMany({
    $or: [
      { _id: { $in: createdIds } },
      { currentProposalId: { $in: createdIds } },
    ],
  });
}

describe("Proposal treasury donation hash validation", () => {
  let voteId;
  let proposerId;
  let proposerSession;
  let otherUserSession;
  let liveTemplateProposal;

  beforeAll(async () => {
    requireTreasuryHash();

    const resolved = await resolveVoteAndLiveProposal(API_BASE_URL);
    await connect();
    const normalizedHash = TREASURY_HASH.toLowerCase();
    const hashAlreadyUsed = await Proposal.findOne({
      "metaData.treasuryDonationTxHash": new RegExp(`^${normalizedHash}$`, "i"),
      status: { $ne: "draft" },
    })
      .select("_id status voteId")
      .lean();
    if (hashAlreadyUsed) {
      throw new Error(
        `TESTKIT_TREASURY_HASH is already used by non-draft proposal ${hashAlreadyUsed._id} ` +
          `(status: ${hashAlreadyUsed.status}, voteId: ${hashAlreadyUsed.voteId}). ` +
          "Use a hash that is not already on any non-draft proposal."
      );
    }

    liveTemplateProposal = await Proposal.findById(resolved.proposalId).lean();
    if (!liveTemplateProposal) {
      throw new Error("Could not resolve a live proposal template for treasury hash validation tests.");
    }

    const { vote } = await ensureTestkitVote();
    voteId = vote._id;
    proposerId = readDrepId(KEYS_TREASURY_USER);
    proposerSession = await login(API_BASE_URL, { keysDir: KEYS_TREASURY_USER });
    otherUserSession = await login(API_BASE_URL, { keysDir: KEYS_OTHER_STAKE });
  }, 120000);

  afterAll(async () => {
    await disconnect();
  }, 30000);

  it("1) creates a draft with treasury hash and submits directly to live (no edit) -> pass", async () => {
    const createdIds = [];
    try {
      const draftA = await createDraft({
        proposerId,
        voteId,
        templateMetaData: liveTemplateProposal.metaData,
        titlePrefix: "Treasury direct submit",
        summary: liveTemplateProposal.summary,
        treasuryHash: TREASURY_HASH,
      });
      createdIds.push(draftA._id);

      const body = buildLiveBody({
        voteId,
        draftDoc: draftA,
        sourceMetaData: draftA.metaData,
        treasuryHash: TREASURY_HASH,
      });

      const res = await submitLive({
        proposalId: draftA._id,
        body,
        cookieHeader: proposerSession.cookieHeader,
      });
      const text = await res.text();
      expect(res.status).toBe(200);
      const payload = JSON.parse(text);
      expect(payload.status).toBe("live");
      expect(payload.metaData?.treasuryDonationTxHash).toBe(TREASURY_HASH.toLowerCase());
    } finally {
      await cleanupProposalLineage(createdIds);
    }
  }, 120000);

  it("2) creates two drafts with same hash, edits one, and submits it to live -> pass", async () => {
    const createdIds = [];
    try {
      const draftA = await createDraft({
        proposerId,
        voteId,
        templateMetaData: liveTemplateProposal.metaData,
        titlePrefix: "Treasury dual draft A",
        summary: liveTemplateProposal.summary,
        treasuryHash: TREASURY_HASH,
      });
      const draftB = await createDraft({
        proposerId,
        voteId,
        templateMetaData: liveTemplateProposal.metaData,
        titlePrefix: "Treasury dual draft B",
        summary: liveTemplateProposal.summary,
        treasuryHash: TREASURY_HASH,
      });
      createdIds.push(draftA._id, draftB._id);

      const body = buildLiveBody({
        voteId,
        draftDoc: draftA,
        sourceMetaData: draftA.metaData,
        treasuryHash: TREASURY_HASH,
        titleSuffix: " edited",
      });
      const res = await submitLive({
        proposalId: draftA._id,
        body,
        cookieHeader: proposerSession.cookieHeader,
      });
      const text = await res.text();
      expect(res.status).toBe(200);
      const payload = JSON.parse(text);
      expect(payload.status).toBe("live");

      const untouchedB = await Proposal.findById(draftB._id).lean();
      expect(untouchedB?.status).toBe("draft");
    } finally {
      await cleanupProposalLineage(createdIds);
    }
  }, 120000);

  it("3) submits a proposal live, then creates a new version of the same proposal -> pass", async () => {
    const createdIds = [];
    try {
      const draftA = await createDraft({
        proposerId,
        voteId,
        templateMetaData: liveTemplateProposal.metaData,
        titlePrefix: "Treasury versioning",
        summary: liveTemplateProposal.summary,
        treasuryHash: TREASURY_HASH,
      });
      createdIds.push(draftA._id);

      const firstBody = buildLiveBody({
        voteId,
        draftDoc: draftA,
        sourceMetaData: draftA.metaData,
        treasuryHash: TREASURY_HASH,
      });
      const firstRes = await submitLive({
        proposalId: draftA._id,
        body: firstBody,
        cookieHeader: proposerSession.cookieHeader,
      });
      expect(firstRes.status).toBe(200);
      const firstPayload = await firstRes.json();
      expect(firstPayload.version).toBe(1);

      const secondBody = buildLiveBody({
        voteId,
        draftDoc: draftA,
        sourceMetaData: firstPayload.metaData,
        treasuryHash: TREASURY_HASH.toUpperCase(),
        titleSuffix: " v2",
      });
      const secondRes = await submitLive({
        proposalId: draftA._id,
        body: secondBody,
        cookieHeader: proposerSession.cookieHeader,
      });
      const secondText = await secondRes.text();
      expect(secondRes.status).toBe(200);
      const secondPayload = JSON.parse(secondText);
      expect(secondPayload.status).toBe("live");
      expect(secondPayload.version).toBe(2);
      expect(String(secondPayload._id)).toBe(String(draftA._id));
      expect(secondPayload.metaData?.treasuryDonationTxHash).toBe(TREASURY_HASH.toLowerCase());
    } finally {
      await cleanupProposalLineage(createdIds);
    }
  }, 120000);

  it("4) live proposal uses hash, second proposal with same hash submit live -> fail", async () => {
    const createdIds = [];
    try {
      const proposalA = await createDraft({
        proposerId,
        voteId,
        templateMetaData: liveTemplateProposal.metaData,
        titlePrefix: "Treasury duplicate A",
        summary: liveTemplateProposal.summary,
        treasuryHash: TREASURY_HASH,
      });
      const proposalB = await createDraft({
        proposerId,
        voteId,
        templateMetaData: liveTemplateProposal.metaData,
        titlePrefix: "Treasury duplicate B",
        summary: liveTemplateProposal.summary,
        treasuryHash: TREASURY_HASH,
      });
      createdIds.push(proposalA._id, proposalB._id);

      const resA = await submitLive({
        proposalId: proposalA._id,
        body: buildLiveBody({
          voteId,
          draftDoc: proposalA,
          sourceMetaData: proposalA.metaData,
          treasuryHash: TREASURY_HASH,
        }),
        cookieHeader: proposerSession.cookieHeader,
      });
      expect(resA.status).toBe(200);

      const resB = await submitLive({
        proposalId: proposalB._id,
        body: buildLiveBody({
          voteId,
          draftDoc: proposalB,
          sourceMetaData: proposalB.metaData,
          treasuryHash: TREASURY_HASH,
        }),
        cookieHeader: proposerSession.cookieHeader,
      });
      const bodyText = await resB.text();
      expect(resB.status).toBe(400);
      expect(bodyText.toLowerCase()).toMatch(/already used|already.*hash|transaction hash/);
    } finally {
      await cleanupProposalLineage(createdIds);
    }
  }, 120000);

  it("5) live proposal with hash is withdrawn, second proposal same hash submit live -> fail", async () => {
    const createdIds = [];
    try {
      const proposalA = await createDraft({
        proposerId,
        voteId,
        templateMetaData: liveTemplateProposal.metaData,
        titlePrefix: "Treasury withdrawn A",
        summary: liveTemplateProposal.summary,
        treasuryHash: TREASURY_HASH,
      });
      const proposalB = await createDraft({
        proposerId,
        voteId,
        templateMetaData: liveTemplateProposal.metaData,
        titlePrefix: "Treasury withdrawn B",
        summary: liveTemplateProposal.summary,
        treasuryHash: TREASURY_HASH,
      });
      createdIds.push(proposalA._id, proposalB._id);

      const resA = await submitLive({
        proposalId: proposalA._id,
        body: buildLiveBody({
          voteId,
          draftDoc: proposalA,
          sourceMetaData: proposalA.metaData,
          treasuryHash: TREASURY_HASH,
        }),
        cookieHeader: proposerSession.cookieHeader,
      });
      expect(resA.status).toBe(200);

      const withdrawRes = await fetch(`${API_BASE_URL}/proposals/${proposalA._id}/withdraw`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: proposerSession.cookieHeader,
        },
        body: JSON.stringify({ category: "Other", comment: "treasury validation test withdraw" }),
      });
      expect(withdrawRes.status).toBe(200);

      const resB = await submitLive({
        proposalId: proposalB._id,
        body: buildLiveBody({
          voteId,
          draftDoc: proposalB,
          sourceMetaData: proposalB.metaData,
          treasuryHash: TREASURY_HASH,
        }),
        cookieHeader: proposerSession.cookieHeader,
      });
      const bodyText = await resB.text();
      expect(resB.status).toBe(400);
      expect(bodyText.toLowerCase()).toMatch(/already used|already.*hash|transaction hash/);
    } finally {
      await cleanupProposalLineage(createdIds);
    }
  }, 120000);

  it("6) wrong treasury hash (last character changed) fails deposit verification", async () => {
    const createdIds = [];
    try {
      const wrongHash = mutateHashLastChar(TREASURY_HASH);
      const draftA = await createDraft({
        proposerId,
        voteId,
        templateMetaData: liveTemplateProposal.metaData,
        titlePrefix: "Treasury wrong hash",
        summary: liveTemplateProposal.summary,
        treasuryHash: wrongHash,
      });
      createdIds.push(draftA._id);

      const res = await submitLive({
        proposalId: draftA._id,
        body: buildLiveBody({
          voteId,
          draftDoc: draftA,
          sourceMetaData: draftA.metaData,
          treasuryHash: wrongHash,
        }),
        cookieHeader: proposerSession.cookieHeader,
      });
      const bodyText = await res.text();
      expect(res.status).toBe(400);
      expect(bodyText).not.toMatch(/<=64 characters/i);
      expect(bodyText).not.toMatch(/already used by another proposal/i);
      expect(bodyText.toLowerCase()).toMatch(/verification|transaction|stake key did not contribute|failed/);
    } finally {
      await cleanupProposalLineage(createdIds);
    }
  }, 120000);

  it("7) duplicate detection is case-insensitive", async () => {
    const createdIds = [];
    try {
      const proposalA = await createDraft({
        proposerId,
        voteId,
        templateMetaData: liveTemplateProposal.metaData,
        titlePrefix: "Treasury case A",
        summary: liveTemplateProposal.summary,
        treasuryHash: TREASURY_HASH.toLowerCase(),
      });
      const proposalB = await createDraft({
        proposerId,
        voteId,
        templateMetaData: liveTemplateProposal.metaData,
        titlePrefix: "Treasury case B",
        summary: liveTemplateProposal.summary,
        treasuryHash: TREASURY_HASH.toUpperCase(),
      });
      createdIds.push(proposalA._id, proposalB._id);

      const resA = await submitLive({
        proposalId: proposalA._id,
        body: buildLiveBody({
          voteId,
          draftDoc: proposalA,
          sourceMetaData: proposalA.metaData,
          treasuryHash: TREASURY_HASH.toLowerCase(),
        }),
        cookieHeader: proposerSession.cookieHeader,
      });
      expect(resA.status).toBe(200);

      const resB = await submitLive({
        proposalId: proposalB._id,
        body: buildLiveBody({
          voteId,
          draftDoc: proposalB,
          sourceMetaData: proposalB.metaData,
          treasuryHash: TREASURY_HASH.toUpperCase(),
        }),
        cookieHeader: proposerSession.cookieHeader,
      });
      const bodyText = await resB.text();
      expect(resB.status).toBe(400);
      expect(bodyText.toLowerCase()).toMatch(/already used|already.*hash|transaction hash/);
    } finally {
      await cleanupProposalLineage(createdIds);
    }
  }, 120000);

  it("8) missing treasuryDonationTxHash on live submit -> fail", async () => {
    const createdIds = [];
    try {
      const draftA = await createDraft({
        proposerId,
        voteId,
        templateMetaData: liveTemplateProposal.metaData,
        titlePrefix: "Treasury missing hash",
        summary: liveTemplateProposal.summary,
        treasuryHash: TREASURY_HASH,
      });
      createdIds.push(draftA._id);

      const body = buildLiveBody({
        voteId,
        draftDoc: draftA,
        sourceMetaData: draftA.metaData,
        treasuryHash: "",
      });
      const res = await submitLive({
        proposalId: draftA._id,
        body,
        cookieHeader: proposerSession.cookieHeader,
      });
      const bodyText = await res.text();
      expect(res.status).toBe(400);
      expect(bodyText.toLowerCase()).toMatch(/treasury donation verification hash is required|treasurydonationtxhash/);
    } finally {
      await cleanupProposalLineage(createdIds);
    }
  }, 120000);

  it("9) treasuryDonationConfirmed false on live submit -> fail", async () => {
    const createdIds = [];
    try {
      const draftA = await createDraft({
        proposerId,
        voteId,
        templateMetaData: liveTemplateProposal.metaData,
        titlePrefix: "Treasury unconfirmed",
        summary: liveTemplateProposal.summary,
        treasuryHash: TREASURY_HASH,
      });
      createdIds.push(draftA._id);

      const body = buildLiveBody({
        voteId,
        draftDoc: draftA,
        sourceMetaData: draftA.metaData,
        treasuryHash: TREASURY_HASH,
        treasuryDonationConfirmed: false,
      });
      const res = await submitLive({
        proposalId: draftA._id,
        body,
        cookieHeader: proposerSession.cookieHeader,
      });
      const bodyText = await res.text();
      expect(res.status).toBe(400);
      expect(bodyText.toLowerCase()).toMatch(/must confirm the treasury donation|treasurydonationconfirmed/);
    } finally {
      await cleanupProposalLineage(createdIds);
    }
  }, 120000);

  it("10) treasury hash longer than 64 chars on live submit -> fail", async () => {
    const createdIds = [];
    try {
      const tooLongHash = `${TREASURY_HASH}a`;
      const draftA = await createDraft({
        proposerId,
        voteId,
        templateMetaData: liveTemplateProposal.metaData,
        titlePrefix: "Treasury too long",
        summary: liveTemplateProposal.summary,
        treasuryHash: tooLongHash,
      });
      createdIds.push(draftA._id);

      const body = buildLiveBody({
        voteId,
        draftDoc: draftA,
        sourceMetaData: draftA.metaData,
        treasuryHash: tooLongHash,
      });
      const res = await submitLive({
        proposalId: draftA._id,
        body,
        cookieHeader: proposerSession.cookieHeader,
      });
      const bodyText = await res.text();
      expect(res.status).toBe(400);
      expect(bodyText.toLowerCase()).toMatch(/<=64 characters|at most 64 characters|too big/);
    } finally {
      await cleanupProposalLineage(createdIds);
    }
  }, 120000);

  it("11) cross-user duplicate enforcement after non-draft use -> fail", async () => {
    const createdIds = [];
    try {
      const proposerDraft = await createDraft({
        proposerId,
        voteId,
        templateMetaData: liveTemplateProposal.metaData,
        titlePrefix: "Treasury cross-user A",
        summary: liveTemplateProposal.summary,
        treasuryHash: TREASURY_HASH,
      });
      const otherUserId = readDrepId(KEYS_OTHER_STAKE);
      const otherDraft = await createDraft({
        proposerId: otherUserId,
        voteId,
        templateMetaData: liveTemplateProposal.metaData,
        titlePrefix: "Treasury cross-user B",
        summary: liveTemplateProposal.summary,
        treasuryHash: TREASURY_HASH,
      });
      createdIds.push(proposerDraft._id, otherDraft._id);

      const proposerRes = await submitLive({
        proposalId: proposerDraft._id,
        body: buildLiveBody({
          voteId,
          draftDoc: proposerDraft,
          sourceMetaData: proposerDraft.metaData,
          treasuryHash: TREASURY_HASH,
        }),
        cookieHeader: proposerSession.cookieHeader,
      });
      expect(proposerRes.status).toBe(200);

      const otherRes = await submitLive({
        proposalId: otherDraft._id,
        body: buildLiveBody({
          voteId,
          draftDoc: otherDraft,
          sourceMetaData: otherDraft.metaData,
          treasuryHash: TREASURY_HASH,
        }),
        cookieHeader: otherUserSession.cookieHeader,
      });
      const bodyText = await otherRes.text();
      expect(otherRes.status).toBe(400);
      expect(bodyText.toLowerCase()).toMatch(/already used|already.*hash|transaction hash/);
    } finally {
      await cleanupProposalLineage(createdIds);
    }
  }, 120000);
});

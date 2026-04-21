/**
 * Proposal permission tests:
 * 1) Draft is not publicly visible.
 * 2) Draft is not visible to a different (non-admin, non-proposer) DRep.
 * 3) Different DRep cannot update proposer's draft.
 * 4) Different DRep cannot withdraw proposer's live proposal.
 * 5) Different DRep cannot edit proposer's comment.
 * 6) Different DRep cannot withdraw proposer's comment (admin-only action).
 *
 * Setup strategy:
 * - Resolve DRep IDs from key folders.
 * - Seed draft/live proposals directly in MongoDB for deterministic setup.
 * - Exercise permissions through API endpoints.
 */
import path from "path";
import { fileURLToPath } from "url";
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
import { Comment } from "../../schema/Comment.js";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api/v0";
const LOG = process.env.TESTKIT_LOG !== "0" && process.env.TESTKIT_LOG !== "false";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEYS_TREASURY_USER = getTreasuryDonationKeysDir();
const KEYS_OTHER_STAKE = getOtherStakeKeysDir();

const WITHDRAW_BODY = {
  category: "Other",
  comment: "permission test withdrawal attempt",
};
const TREASURY_HASH =
  process.env.TESTKIT_TREASURY_HASH?.trim() ||
  process.env.TESTKIT_TREASURY_DONATION_TX_HASH?.trim() ||
  "";

function log(step, message, detail) {
  if (!LOG) return;
  const prefix = `[${step}]`;
  console.log(prefix, message);
  if (detail !== undefined) console.log(prefix, " ", detail);
}

function expectPermissionDeniedStatus(status) {
  expect([401, 403]).toContain(status);
}

function assertNonPublicFieldsExcluded(payload) {
  expect(payload?.metaData?.proposerDetails?.email).toBeUndefined();
  expect(payload?.metaData?.primaryContact).toBeUndefined();
  expect(payload?.metaData?.signatoryContact).toBeUndefined();
  expect(payload?.metaData?.kycInfo).toBeUndefined();
  expect(payload?.metaData?.legalDeclarations).toBeUndefined();

  // contractingParty should be reduced to a public-safe subset.
  expect(payload?.metaData?.contractingParty).toEqual(
    expect.objectContaining({
      legalEntityType: "company",
    })
  );
  expect(payload?.metaData?.contractingParty?.legalEntityName).toBeUndefined();
  expect(payload?.metaData?.contractingParty?.legalEntityRegistrationNumber).toBeUndefined();
}

describe("Proposal permissions", () => {
  let voteId;
  let proposerId;
  let proposerSession;
  let otherDrepSession;
  let seededDraftId;
  let seededLiveId;
  let seededCommentId;
  let liveTemplateProposal;

  beforeAll(async () => {
    // Resolve a known-good live proposal id first.
    const resolved = await resolveVoteAndLiveProposal(API_BASE_URL);

    await connect();
    // IMPORTANT: load from DB (not public GET /proposals/:id), because API responses
    // may exclude non-public fields required for live validation.
    liveTemplateProposal = await Proposal.findById(resolved.proposalId).lean();
    if (!liveTemplateProposal) {
      throw new Error("Could not resolve a live proposal template for treasury hash uniqueness test.");
    }

    const { vote } = await ensureTestkitVote();
    voteId = vote._id;

    proposerId = readDrepId(KEYS_TREASURY_USER);
    proposerSession = await login(API_BASE_URL, { keysDir: KEYS_TREASURY_USER });
    otherDrepSession = await login(API_BASE_URL, { keysDir: KEYS_OTHER_STAKE });

    const baseMetaData = {
      proposerDetails: { name: "Permission Test Proposer", email: "private@example.com" },
      strategyFramework: { pillars: [] },
      proposalDetails: { conversionRate: "", workPackages: [] },
      contractingParty: {
        legalEntityType: "company",
        legalEntityName: "Private Company Name",
        legalEntityRegistrationNumber: "REG-12345",
      },
      primaryContact: {
        name: "Private Primary Contact",
        email: "primary.private@example.com",
      },
      signatoryContact: {
        title: "Director",
        name: "Private Signatory",
        email: "signatory.private@example.com",
        authorization: true,
      },
      kycInfo: {
        submitted: "No",
        email: "kyc.private@example.com",
      },
      legalDeclarations: {
        authorizationEntity: true,
        authorizationAttestation: true,
        submitterName: "Private Submitter",
        submitterRole: "Lead",
        submitterEmail: "submitter.private@example.com",
      },
    };

    const [draftDoc, liveDoc] = await Proposal.create([
      {
        proposerId,
        voteId,
        title: `Permission test draft ${Date.now()}`,
        summary: "Draft used to validate non-proposer visibility and update permissions.",
        status: "draft",
        metaData: baseMetaData,
      },
      {
        proposerId,
        voteId,
        title: `Permission test live ${Date.now()}`,
        summary: "Live used to validate non-proposer withdrawal permission.",
        status: "live",
        submittedAt: new Date(),
        metaData: baseMetaData,
      },
    ]);

    seededDraftId = draftDoc._id.toString();
    seededLiveId = liveDoc._id.toString();

    const comment = await Comment.create({
      proposalId: liveDoc._id,
      userId: proposerId,
      content: `Permission test comment ${Date.now()}`,
      status: "live",
    });
    seededCommentId = comment._id.toString();

    log(0, "Seeded permission test proposals", { seededDraftId, seededLiveId, proposerId });
  }, 120000);

  afterAll(async () => {
    const ids = [seededDraftId, seededLiveId].filter(Boolean);
    if (seededCommentId) {
      await Comment.deleteOne({ _id: seededCommentId });
    }
    if (ids.length > 0) {
      await Proposal.deleteMany({ _id: { $in: ids } });
    }
    await disconnect();
  }, 30000);

  it("test1: public cannot view another user's draft proposal", async () => {
    const res = await fetch(`${API_BASE_URL}/proposals/${seededDraftId}`, { method: "GET" });
    expectPermissionDeniedStatus(res.status);
    const body = await res.text();
    expect(body.toLowerCase()).toMatch(/permission|unauthor|token|forbidden|access/);
  });

  it("test2: other DRep cannot view proposer's draft proposal", async () => {
    const res = await fetch(`${API_BASE_URL}/proposals/${seededDraftId}`, {
      method: "GET",
      headers: { Cookie: otherDrepSession.cookieHeader },
    });
    expectPermissionDeniedStatus(res.status);
    const body = await res.text();
    expect(body.toLowerCase()).toMatch(/permission|forbidden|access/);
  });

  it("other DRep cannot update proposer's draft proposal", async () => {
    const res = await fetch(`${API_BASE_URL}/proposals/${seededDraftId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: otherDrepSession.cookieHeader,
      },
      body: JSON.stringify({
        voteId: voteId.toString(),
        title: "Unauthorized draft update attempt",
        summary: "This should be rejected",
        status: "draft",
        metaData: {
          proposerDetails: { name: "Unauthorized" },
          strategyFramework: { pillars: [] },
          proposalDetails: { conversionRate: "", workPackages: [] },
        },
      }),
    });
    expect(res.status).toBe(403);
    const body = await res.text();
    expect(body.toLowerCase()).toMatch(/only the proposer|forbidden|permission/);
  });

  it("other DRep cannot withdraw proposer's live proposal", async () => {
    const res = await fetch(`${API_BASE_URL}/proposals/${seededLiveId}/withdraw`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: otherDrepSession.cookieHeader,
      },
      body: JSON.stringify(WITHDRAW_BODY),
    });
    expect(res.status).toBe(403);
    const body = await res.text();
    expect(body.toLowerCase()).toMatch(/only the proposer or a vote admin|forbidden|permission/);
  });

  it("live proposal excludes non-public fields for public and non-owner authenticated responses", async () => {
    const publicRes = await fetch(`${API_BASE_URL}/proposals/${seededLiveId}`, {
      method: "GET",
    });
    expect(publicRes.status).toBe(200);
    const publicBody = await publicRes.json();
    assertNonPublicFieldsExcluded(publicBody);

    const otherDrepRes = await fetch(`${API_BASE_URL}/proposals/${seededLiveId}`, {
      method: "GET",
      headers: { Cookie: otherDrepSession.cookieHeader },
    });
    expect(otherDrepRes.status).toBe(200);
    const otherDrepBody = await otherDrepRes.json();
    assertNonPublicFieldsExcluded(otherDrepBody);
  });

  it("other DRep cannot edit proposer's live comment", async () => {
    const res = await fetch(`${API_BASE_URL}/comments/${seededCommentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: otherDrepSession.cookieHeader,
      },
      body: JSON.stringify({
        content: "Unauthorized comment edit attempt",
      }),
    });
    expect(res.status).toBe(403);
    const body = await res.text();
    expect(body.toLowerCase()).toMatch(/do not have permission|forbidden|permission/);
  });

  it("other DRep cannot withdraw proposer's live comment", async () => {
    const res = await fetch(`${API_BASE_URL}/comments/${seededCommentId}/withdraw`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: otherDrepSession.cookieHeader,
      },
      body: JSON.stringify({
        category: "Other",
        comment: "Unauthorized comment withdrawal attempt",
      }),
    });
    expect(res.status).toBe(403);
    const body = await res.text();
    expect(body.toLowerCase()).toMatch(/do not have permission|forbidden|permission/);
  });

  it("rejects second live submit when another non-draft proposal already uses the same treasury hash", async () => {
    if (!TREASURY_HASH) {
      throw new Error(
        "Missing TESTKIT_TREASURY_HASH (or TESTKIT_TREASURY_DONATION_TX_HASH) in __testkit/.env"
      );
    }

    const createdIds = [];
    try {
      const makeDraft = async (label) => {
        const doc = await Proposal.create({
          proposerId,
          voteId,
          title: `Treasury hash uniqueness ${label} ${Date.now()}`,
          summary: liveTemplateProposal.summary ?? "",
          status: "draft",
          metaData: liveTemplateProposal.metaData ?? {},
        });
        createdIds.push(doc._id);
        return doc;
      };

      const firstDraft = await makeDraft("A");
      const secondDraft = await makeDraft("B");

      const buildLiveBody = (draft) => {
        const metaData = sanitizeMetaDataForLiveSubmit(liveTemplateProposal.metaData);
        metaData.treasuryDonationTxHash = TREASURY_HASH;
        metaData.treasuryDonationConfirmed = true;
        return {
          voteId: String(voteId),
          title: draft.title,
          summary: draft.summary ?? "",
          status: "live",
          metaData,
        };
      };

      const firstRes = await fetch(`${API_BASE_URL}/proposals/${firstDraft._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: proposerSession.cookieHeader,
        },
        body: JSON.stringify(buildLiveBody(firstDraft)),
      });
      if (firstRes.status !== 200) {
        const firstErrorBody = await firstRes.text();
        const hint =
          /stake key did not contribute/i.test(firstErrorBody)
            ? ` TESTKIT_TREASURY_HASH must be a mainnet tx hash where TESTKIT_TREASURY_DONATION_USER (${getTreasuryDonationUserAddress()}) appears in transaction inputs (Koios).`
            : "";
        throw new Error(
          `First draft->live submit failed (${firstRes.status}): ${firstErrorBody}${hint}`
        );
      }
      const firstBody = await firstRes.json();
      expect(firstBody.status).toBe("live");

      const secondRes = await fetch(`${API_BASE_URL}/proposals/${secondDraft._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: proposerSession.cookieHeader,
        },
        body: JSON.stringify(buildLiveBody(secondDraft)),
      });
      expect(secondRes.status).toBe(400);
      const bodyText = await secondRes.text();
      expect(bodyText.toLowerCase()).toMatch(/already used|already.*hash|transaction hash/);
    } finally {
      if (createdIds.length > 0) {
        await Proposal.deleteMany({ _id: { $in: createdIds } });
      }
    }
  }, 120000);

  it("allows draft A revisit->live submit when only draft B shares the same treasury hash", async () => {
    if (!TREASURY_HASH) {
      throw new Error(
        "Missing TESTKIT_TREASURY_HASH (or TESTKIT_TREASURY_DONATION_TX_HASH) in __testkit/.env"
      );
    }

    const createdIds = [];
    try {
      const draftA = await Proposal.create({
        proposerId,
        voteId,
        title: `Treasury hash revisit flow A ${Date.now()}`,
        summary: liveTemplateProposal.summary ?? "",
        status: "draft",
        metaData: {
          ...(liveTemplateProposal.metaData ?? {}),
          treasuryDonationTxHash: TREASURY_HASH,
        },
      });
      createdIds.push(draftA._id);

      const draftB = await Proposal.create({
        proposerId,
        voteId,
        title: `Treasury hash revisit flow B ${Date.now()}`,
        summary: liveTemplateProposal.summary ?? "",
        status: "draft",
        metaData: {
          ...(liveTemplateProposal.metaData ?? {}),
          treasuryDonationTxHash: TREASURY_HASH,
        },
      });
      createdIds.push(draftB._id);

      // Simulate reopening/revisiting draft A before submitting it to live.
      const revisitRes = await fetch(`${API_BASE_URL}/proposals/${draftA._id}`, {
        method: "GET",
        headers: { Cookie: proposerSession.cookieHeader },
      });
      expect(revisitRes.status).toBe(200);
      const revisitedDraft = await revisitRes.json();
      expect(String(revisitedDraft?._id)).toBe(String(draftA._id));

      const metaData = sanitizeMetaDataForLiveSubmit(revisitedDraft.metaData);
      // Send hash with case-only differences to verify normalization still treats
      // this as the same proposal lineage rather than a duplicate proposal.
      metaData.treasuryDonationTxHash = String(TREASURY_HASH).toUpperCase();
      metaData.treasuryDonationConfirmed = true;

      const liveRes = await fetch(`${API_BASE_URL}/proposals/${draftA._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: proposerSession.cookieHeader,
        },
        body: JSON.stringify({
          voteId: String(voteId),
          title: revisitedDraft.title,
          summary: revisitedDraft.summary ?? "",
          status: "live",
          metaData,
        }),
      });

      if (liveRes.status !== 200) {
        const errorText = await liveRes.text();
        throw new Error(
          `Expected same-proposal draft->live submit to succeed, got ${liveRes.status}: ${errorText}`
        );
      }

      const liveBody = await liveRes.json();
      expect(liveBody.status).toBe("live");
      expect(String(liveBody._id)).toBe(String(draftA._id));
      expect(liveBody?.metaData?.treasuryDonationTxHash).toBe(
        String(TREASURY_HASH).trim().toLowerCase()
      );
    } finally {
      if (createdIds.length > 0) {
        await Proposal.deleteMany({ _id: { $in: createdIds } });
      }
    }
  }, 120000);
});

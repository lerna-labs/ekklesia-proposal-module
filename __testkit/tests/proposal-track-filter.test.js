/**
 * Verifies generic enum filtering on /proposals using vote.filterOptions.allowedValues.
 * Focus: track=individual|organisation|consortium for CC-like filtering.
 */
import { connect, disconnect } from "../helpers/testkitMongo.js";
import { ensureTestkitVote } from "../helpers/testVote.js";
import { Proposal } from "../../schema/Proposal.js";
import { Vote } from "../../schema/Vote.js";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api/v0";

describe("Proposal enum track filter", () => {
  let voteId;
  /** @type {Array<Record<string, any>>} */
  let originalFilterOptions = [];
  /** @type {string[]} */
  let createdProposalIds = [];

  beforeAll(async () => {
    await connect();
    const { vote } = await ensureTestkitVote();
    voteId = vote._id.toString();
    originalFilterOptions = Array.isArray(vote.filterOptions) ? vote.filterOptions : [];

    await Vote.findByIdAndUpdate(voteId, {
      $set: {
        filterOptions: [
          {
            param: "status",
            label: "Status",
            field: "status",
            allowedValues: ["live", "withdrawn", "draft"],
            multiple: true,
          },
          {
            param: "track",
            label: "Applicant Type",
            field: "metaData.track",
            allowedValues: ["individual", "organisation", "consortium"],
            multiple: true,
          },
        ],
      },
    });

    const now = Date.now();
    const created = await Proposal.create([
      {
        proposerId: `stake_test_track_individual_${now}`,
        voteId,
        title: `Track individual ${now}`,
        summary: "Enum filter test individual",
        status: "live",
        submittedAt: new Date(),
        metaData: { track: "individual" },
      },
      {
        proposerId: `stake_test_track_organisation_${now}`,
        voteId,
        title: `Track organisation ${now}`,
        summary: "Enum filter test organisation",
        status: "live",
        submittedAt: new Date(),
        metaData: { track: "organisation" },
      },
      {
        proposerId: `stake_test_track_consortium_${now}`,
        voteId,
        title: `Track consortium ${now}`,
        summary: "Enum filter test consortium",
        status: "live",
        submittedAt: new Date(),
        metaData: { track: "consortium" },
      },
    ]);
    createdProposalIds = created.map((doc) => doc._id.toString());
  }, 60000);

  afterAll(async () => {
    if (createdProposalIds.length > 0) {
      await Proposal.deleteMany({ _id: { $in: createdProposalIds } });
    }
    await Vote.findByIdAndUpdate(voteId, {
      $set: { filterOptions: originalFilterOptions },
    });
    await disconnect();
  }, 30000);

  it("returns only individual proposals for single track filter", async () => {
    const res = await fetch(
      `${API_BASE_URL}/proposals?vote=${voteId}&status=live&track=individual&limit=100`
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    for (const proposal of body.data) {
      expect(proposal?.metaData?.track).toBe("individual");
    }
  });

  it("returns matching proposals for multi track filter", async () => {
    const res = await fetch(
      `${API_BASE_URL}/proposals?vote=${voteId}&status=live&track=individual,organisation&limit=200`
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    for (const proposal of body.data) {
      expect(["individual", "organisation"]).toContain(proposal?.metaData?.track);
    }
    const tracks = new Set(body.data.map((proposal) => proposal?.metaData?.track));
    expect(tracks.has("individual")).toBe(true);
    expect(tracks.has("organisation")).toBe(true);
  });

  it("rejects invalid enum values for track filter", async () => {
    const res = await fetch(
      `${API_BASE_URL}/proposals?vote=${voteId}&status=live&track=not-a-valid-track`
    );
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text.toLowerCase()).toContain("invalid track parameter");
  });
});

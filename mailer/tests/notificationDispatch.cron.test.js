import test from "node:test";
import assert from "node:assert/strict";
import {
  __resetNotificationDispatchTestHooks,
  __setNotificationDispatchTestHooks,
  runCommentDigestDispatch,
  runVoteMilestoneDispatch,
} from "../notificationDispatch.js";
import { User } from "../../schema/User.js";
import { Vote } from "../../schema/Vote.js";
import { Proposal } from "../../schema/Proposal.js";
import { CommentNotificationEvent } from "../commentNotificationEvent.js";

function createQueryChain(rows) {
  let current = [...rows];
  return {
    select() {
      return this;
    },
    sort(sortSpec) {
      const [[field, direction]] = Object.entries(sortSpec);
      current.sort((a, b) => {
        const av = new Date(a[field]).getTime();
        const bv = new Date(b[field]).getTime();
        return direction >= 0 ? av - bv : bv - av;
      });
      return this;
    },
    lean: async () => [...current],
  };
}

function setPath(obj, path, value) {
  const keys = path.split(".");
  let cursor = obj;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    if (!cursor[key] || typeof cursor[key] !== "object") {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  cursor[keys[keys.length - 1]] = value;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function createHarness() {
  const users = [];
  const votes = [];
  const proposals = [];
  const commentEvents = [];
  const sentEmails = [];
  const digestFixtures = [];
  const instantFixtures = [];

  function isUserEligibleForCron(user) {
    const notification = user.notification ?? {};
    const schedule = String(notification.schedule ?? "daily").toLowerCase();
    const hasEmail = notification.email != null;
    const verified = notification.verifiedAt != null;
    const scheduleAllowed = schedule === "6h" || schedule === "daily";
    return hasEmail && verified && scheduleAllowed;
  }

  const originalUser = {
    find: User.find,
    findById: User.findById,
    updateOne: User.updateOne,
  };
  const originalVote = { find: Vote.find, updateOne: Vote.updateOne };
  const originalProposal = { find: Proposal.find };
  const originalEvent = {
    find: CommentNotificationEvent.find,
    updateMany: CommentNotificationEvent.updateMany,
  };

  User.find = function find(query) {
    if (query?.["notification.email"] && query?.["notification.verifiedAt"]) {
      return createQueryChain(users.filter(isUserEligibleForCron));
    }
    return createQueryChain(users);
  };
  User.findById = function findById(id) {
    const row = users.find((user) => String(user._id) === String(id)) ?? null;
    return {
      select() {
        return this;
      },
      lean: async () => row,
    };
  };
  User.updateOne = async function updateOne(filter, update) {
    const user = users.find((row) => String(row._id) === String(filter._id));
    if (!user) return { matchedCount: 0, modifiedCount: 0 };
    const setPatch = update.$set ?? {};
    for (const [path, value] of Object.entries(setPatch)) {
      setPath(user, path, value);
    }
    return { matchedCount: 1, modifiedCount: 1 };
  };

  Vote.find = function find(query) {
    if (query?._id?.$in) {
      const ids = new Set(query._id.$in.map((id) => String(id)));
      return createQueryChain(votes.filter((v) => ids.has(String(v._id))));
    }
    if (query?.votingStartDate && query?.["notificationDispatch.votingOpenedSentAt"] === null) {
      const now = query.votingStartDate.$lte;
      return createQueryChain(
        votes.filter(
          (v) =>
            new Date(v.votingStartDate).getTime() <= new Date(now).getTime() &&
            (!query.votingUrl || isNonEmptyString(v.votingUrl)) &&
            v.notificationDispatch?.votingOpenedSentAt == null,
        ),
      );
    }
    if (
      query?.resultsPublishedAt &&
      query?.["notificationDispatch.resultsPublishedSentAt"] === null
    ) {
      const now = query.resultsPublishedAt.$lte;
      return createQueryChain(
        votes.filter(
          (v) =>
            v.resultsPublishedAt != null &&
            new Date(v.resultsPublishedAt).getTime() <= new Date(now).getTime() &&
            (!query.resultsUrl || isNonEmptyString(v.resultsUrl)) &&
            v.notificationDispatch?.resultsPublishedSentAt == null,
        ),
      );
    }
    return createQueryChain(votes);
  };
  Vote.updateOne = async function updateOne(filter, update) {
    const vote = votes.find((row) => String(row._id) === String(filter._id));
    if (!vote) return { matchedCount: 0, modifiedCount: 0 };
    for (const [path, value] of Object.entries(update.$set ?? {})) {
      setPath(vote, path, value);
    }
    return { matchedCount: 1, modifiedCount: 1 };
  };

  Proposal.find = function find(query) {
    if (query?._id?.$in) {
      const ids = new Set(query._id.$in.map((id) => String(id)));
      return createQueryChain(proposals.filter((p) => ids.has(String(p._id))));
    }
    return createQueryChain(proposals);
  };

  CommentNotificationEvent.find = function find(query) {
    const recipient = String(query.recipientUserId);
    const maxCreatedAt = new Date(query.createdAt.$lte).getTime();
    const minCreatedAt = query.createdAt.$gt ? new Date(query.createdAt.$gt).getTime() : null;
    const filtered = commentEvents.filter((event) => {
      if (String(event.recipientUserId) !== recipient) return false;
      if (event.status !== query.status) return false;
      const createdAt = new Date(event.createdAt).getTime();
      if (createdAt > maxCreatedAt) return false;
      if (minCreatedAt != null && createdAt <= minCreatedAt) return false;
      return true;
    });
    return createQueryChain(filtered);
  };
  CommentNotificationEvent.updateMany = async function updateMany(filter, update) {
    const ids = new Set((filter._id?.$in ?? []).map((id) => String(id)));
    let modifiedCount = 0;
    for (const row of commentEvents) {
      if (!ids.has(String(row._id))) continue;
      for (const [path, value] of Object.entries(update.$set ?? {})) {
        setPath(row, path, value);
      }
      modifiedCount += 1;
    }
    return { matchedCount: modifiedCount, modifiedCount };
  };

  __setNotificationDispatchTestHooks({
    async getUnsubscribeUrlForUser(userId) {
      return `https://example.test/unsub/${userId}`;
    },
    async renderDigestFromPayload(fixture) {
      digestFixtures.push(fixture);
      return { subject: "Digest", html: "<p>Digest</p>" };
    },
    async renderInstantDigestFromPayload(fixture) {
      instantFixtures.push(fixture);
      return { subject: "Instant", html: "<p>Instant</p>" };
    },
    async sendEmail(payload) {
      sentEmails.push(payload);
      return { messageId: `msg-${sentEmails.length}` };
    },
  });

  return {
    users,
    votes,
    proposals,
    commentEvents,
    sentEmails,
    digestFixtures,
    instantFixtures,
    restore() {
      User.find = originalUser.find;
      User.findById = originalUser.findById;
      User.updateOne = originalUser.updateOne;
      Vote.find = originalVote.find;
      Vote.updateOne = originalVote.updateOne;
      Proposal.find = originalProposal.find;
      CommentNotificationEvent.find = originalEvent.find;
      CommentNotificationEvent.updateMany = originalEvent.updateMany;
      __resetNotificationDispatchTestHooks();
    },
  };
}

test("comment digest sends and marks events sent", async (t) => {
  const harness = createHarness();
  t.after(() => harness.restore());

  const now = new Date("2026-05-05T12:00:00.000Z");
  const userId = "stake_test1";
  const voteId = "507f1f77bcf86cd799439011";
  const proposalId = "507f1f77bcf86cd799439012";
  const eventId = "507f1f77bcf86cd799439013";

  harness.users.push({
    _id: userId,
    notification: {
      email: "mad@madorkestra.com",
      schedule: "daily",
      verifiedAt: new Date("2026-05-01T00:00:00.000Z"),
      lastCommentDigestSentAt: null,
    },
  });
  harness.votes.push({
    _id: voteId,
    title: "Vote A",
    slug: "vote-a",
    votingStartDate: new Date("2026-01-01T00:00:00.000Z"),
    notificationDispatch: { votingOpenedSentAt: null, resultsPublishedSentAt: null },
  });
  harness.proposals.push({
    _id: proposalId,
    voteId,
    title: "Proposal A",
  });
  harness.commentEvents.push({
    _id: eventId,
    recipientUserId: userId,
    proposalId,
    commentId: "507f1f77bcf86cd799439014",
    status: "pending",
    createdAt: new Date("2026-05-05T11:00:00.000Z"),
  });

  const sentCount = await runCommentDigestDispatch(now);

  assert.equal(sentCount, 1);
  assert.equal(harness.sentEmails.length, 1);
  assert.equal(harness.commentEvents[0].status, "sent");
  assert.deepEqual(harness.commentEvents[0].sentAt, now);
  assert.deepEqual(harness.users[0].notification.lastCommentDigestSentAt, now);
  assert.equal(harness.digestFixtures.length, 1);
  const proposalNode = harness.digestFixtures[0].votes[0].proposals[0];
  assert.equal(proposalNode.events[0].type, "new_comment");
  assert.equal(proposalNode.events[0].count, 1);
  assert.match(proposalNode.url, /#comments$/);
});

test("comment digest respects schedule window and excludes never", async (t) => {
  const harness = createHarness();
  t.after(() => harness.restore());

  const now = new Date("2026-05-05T12:00:00.000Z");
  const proposalId = "507f1f77bcf86cd799439022";
  const voteId = "507f1f77bcf86cd799439021";

  harness.users.push(
    {
      _id: "stake_daily_recent",
      notification: {
        email: "mad@madorkestra.com",
        schedule: "daily",
        verifiedAt: new Date("2026-05-05T10:00:00.000Z"),
        lastCommentDigestSentAt: new Date("2026-05-05T11:30:00.000Z"),
      },
    },
    {
      _id: "stake_never",
      notification: {
        email: "mad@madorkestra.com",
        schedule: "never",
        verifiedAt: new Date("2026-05-05T10:00:00.000Z"),
        lastCommentDigestSentAt: null,
      },
    },
  );
  harness.votes.push({
    _id: voteId,
    title: "Vote B",
    slug: "vote-b",
    votingStartDate: new Date("2026-01-01T00:00:00.000Z"),
    notificationDispatch: { votingOpenedSentAt: null, resultsPublishedSentAt: null },
  });
  harness.proposals.push({ _id: proposalId, voteId, title: "Proposal B" });
  harness.commentEvents.push(
    {
      _id: "507f1f77bcf86cd799439023",
      recipientUserId: "stake_daily_recent",
      proposalId,
      commentId: "507f1f77bcf86cd799439024",
      status: "pending",
      createdAt: new Date("2026-05-05T11:40:00.000Z"),
    },
    {
      _id: "507f1f77bcf86cd799439025",
      recipientUserId: "stake_never",
      proposalId,
      commentId: "507f1f77bcf86cd799439026",
      status: "pending",
      createdAt: new Date("2026-05-05T11:40:00.000Z"),
    },
  );

  const sentCount = await runCommentDigestDispatch(now);

  assert.equal(sentCount, 0);
  assert.equal(harness.sentEmails.length, 0);
  assert.equal(harness.commentEvents[0].status, "pending");
  assert.equal(harness.commentEvents[1].status, "pending");
});

test("voting_opened milestone dispatches once and sets sent timestamp", async (t) => {
  const harness = createHarness();
  t.after(() => harness.restore());

  const now = new Date("2026-05-05T12:00:00.000Z");
  const voteId = "507f1f77bcf86cd799439031";
  harness.users.push({
    _id: "stake_milestone_1",
    notification: {
      email: "mad@madorkestra.com",
      schedule: "daily",
      verifiedAt: new Date("2026-05-01T00:00:00.000Z"),
    },
  });
  harness.votes.push({
    _id: voteId,
    title: "Vote Open",
    slug: "vote-open",
    votingUrl: "https://example.test/votes/vote-open/voting",
    votingStartDate: new Date("2026-05-01T00:00:00.000Z"),
    resultsPublishedAt: null,
    notificationDispatch: { votingOpenedSentAt: null, resultsPublishedSentAt: null },
  });

  const firstRun = await runVoteMilestoneDispatch(now);
  const secondRun = await runVoteMilestoneDispatch(now);

  assert.equal(firstRun, 1);
  assert.equal(secondRun, 0);
  assert.deepEqual(harness.votes[0].notificationDispatch.votingOpenedSentAt, now);
  assert.equal(harness.instantFixtures.length, 1);
  const votingEv = harness.instantFixtures[0].votes[0].events[0];
  assert.equal(votingEv.type, "voting_opened");
  assert.equal(votingEv.ctaUrl, "https://example.test/votes/vote-open/voting");
});

test("results_published milestone dispatches once and uses resultsUrl", async (t) => {
  const harness = createHarness();
  t.after(() => harness.restore());

  const now = new Date("2026-05-05T12:00:00.000Z");
  const voteId = "507f1f77bcf86cd799439041";
  harness.users.push({
    _id: "stake_milestone_2",
    notification: {
      email: "mad@madorkestra.com",
      schedule: "daily",
      verifiedAt: new Date("2026-05-01T00:00:00.000Z"),
    },
  });
  harness.votes.push({
    _id: voteId,
    title: "Vote Results",
    slug: "vote-results",
    votingStartDate: new Date("2026-01-01T00:00:00.000Z"),
    resultsPublishedAt: new Date("2026-05-04T00:00:00.000Z"),
    resultsUrl: "https://results.example.test/vote-results",
    notificationDispatch: {
      votingOpenedSentAt: new Date("2026-05-01T00:00:00.000Z"),
      resultsPublishedSentAt: null,
    },
  });

  const firstRun = await runVoteMilestoneDispatch(now);
  const secondRun = await runVoteMilestoneDispatch(now);

  assert.equal(firstRun, 1);
  assert.equal(secondRun, 0);
  assert.deepEqual(harness.votes[0].notificationDispatch.resultsPublishedSentAt, now);
  assert.equal(harness.instantFixtures.length, 1);
  const event = harness.instantFixtures[0].votes[0].events[0];
  assert.equal(event.type, "results_published");
  assert.equal(event.ctaUrl, "https://results.example.test/vote-results");
});

test("voting_opened milestone skips votes without votingUrl", async (t) => {
  const harness = createHarness();
  t.after(() => harness.restore());

  const now = new Date("2026-05-05T12:00:00.000Z");
  harness.users.push({
    _id: "stake_milestone_3",
    notification: {
      email: "mad@madorkestra.com",
      schedule: "daily",
      verifiedAt: new Date("2026-05-01T00:00:00.000Z"),
    },
  });
  harness.votes.push({
    _id: "507f1f77bcf86cd799439051",
    title: "Vote Open Missing Url",
    slug: "vote-open-missing-url",
    votingUrl: "",
    votingStartDate: new Date("2026-05-01T00:00:00.000Z"),
    resultsPublishedAt: null,
    notificationDispatch: { votingOpenedSentAt: null, resultsPublishedSentAt: null },
  });

  const run = await runVoteMilestoneDispatch(now);

  assert.equal(run, 0);
  assert.equal(harness.sentEmails.length, 0);
  assert.equal(harness.votes[0].notificationDispatch.votingOpenedSentAt, null);
});

test("results_published milestone skips votes without resultsUrl", async (t) => {
  const harness = createHarness();
  t.after(() => harness.restore());

  const now = new Date("2026-05-05T12:00:00.000Z");
  harness.users.push({
    _id: "stake_milestone_4",
    notification: {
      email: "mad@madorkestra.com",
      schedule: "daily",
      verifiedAt: new Date("2026-05-01T00:00:00.000Z"),
    },
  });
  harness.votes.push({
    _id: "507f1f77bcf86cd799439061",
    title: "Vote Results Missing Url",
    slug: "vote-results-missing-url",
    votingUrl: "https://example.test/votes/vote-results-missing-url/voting",
    votingStartDate: new Date("2026-01-01T00:00:00.000Z"),
    resultsPublishedAt: new Date("2026-05-04T00:00:00.000Z"),
    resultsUrl: "",
    notificationDispatch: {
      votingOpenedSentAt: new Date("2026-05-01T00:00:00.000Z"),
      resultsPublishedSentAt: null,
    },
  });

  const run = await runVoteMilestoneDispatch(now);

  assert.equal(run, 0);
  assert.equal(harness.sentEmails.length, 0);
  assert.equal(harness.votes[0].notificationDispatch.resultsPublishedSentAt, null);
});

import mongoose from "mongoose";
import { User } from "../schema/User.js";
import { Vote } from "../schema/Vote.js";
import { Proposal } from "../schema/Proposal.js";
import { CommentNotificationEvent } from "./commentNotificationEvent.js";
import { getUnsubscribeUrlForUser } from "../helper/notificationUnsubscribe.js";
import { renderDigestFromPayload, renderInstantDigestFromPayload } from "./render.js";
import { send as sendEmail } from "./transport.js";

const COMMENT_SCHEDULES = new Set(["6h", "daily"]);
const ALL_NOTIFICATION_SCHEDULES = new Set(["6h", "daily"]);

function getFanoutDelayMs() {
  const v = Number.parseInt(process.env.EMAIL_FANOUT_DELAY_MS ?? "300", 10);
  if (Number.isNaN(v) || v < 0) return 0;
  return v;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFrontendBaseUrl() {
  return String(process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
}

function buildVoteUrl(voteSlug) {
  return `${getFrontendBaseUrl()}/votes/${encodeURIComponent(voteSlug)}`;
}

function buildProposalUrl(voteSlug, proposalId) {
  return `${buildVoteUrl(voteSlug)}/${encodeURIComponent(String(proposalId))}`;
}

function notificationSchedule(userDoc) {
  const raw = String(userDoc?.notification?.schedule ?? "daily").trim().toLowerCase();
  return raw || "daily";
}

/**
 * @param {object} [options]
 * @param {boolean} [options.bypassScheduleNever] - when true, still send if schedule is "never"
 *   (used for admin proposal withdrawal so proposers get a direct account notice).
 * @returns {string|null} block reason, or null if delivery is allowed
 */
function getInstantNotificationBlockReason(userDoc, options = {}) {
  const bypassScheduleNever = Boolean(options.bypassScheduleNever);
  if (!userDoc) return "user_not_found";
  const email = userDoc?.notification?.email;
  const verifiedAt = userDoc?.notification?.verifiedAt;
  if (!email) return "no_notification_email";
  if (!verifiedAt) return "email_not_verified";
  if (notificationSchedule(userDoc) === "never" && !bypassScheduleNever) {
    return "schedule_never";
  }
  return null;
}

function getFromIdentity() {
  return {
    email: process.env.MAIL_FROM_EMAIL || "notifications@ekklesia.example",
    name: process.env.MAIL_FROM_NAME || "Ekklesia",
  };
}

function toTimestamp(dt) {
  return new Date(dt ?? Date.now()).toISOString().replace("T", " ").replace(".000Z", " UTC");
}

function truncatePreview(text, max = 180) {
  const s = String(text ?? "").trim().replace(/\s+/g, " ");
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function shortUserId(userId) {
  const value = String(userId ?? "");
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function notificationFixture({ vote, proposal, events, period = "24h" }) {
  const voteUrl = buildVoteUrl(vote.slug);
  return {
    period,
    votes: [
      {
        name: vote.title,
        url: voteUrl,
        proposals: [
          {
            title: proposal.title,
            url: proposal.url ?? buildProposalUrl(vote.slug, proposal.id),
            events,
          },
        ],
      },
    ],
    preferencesUrl: `${getFrontendBaseUrl()}/dashboard`,
  };
}

async function sendRenderedEmail({ toEmail, renderResult, category }) {
  return sendEmail({
    from: getFromIdentity(),
    to: { email: toEmail },
    subject: renderResult.subject,
    html: renderResult.html,
    category,
  });
}

async function sendInstantToUser(userDoc, fixture, category, options = {}) {
  const blockReason = getInstantNotificationBlockReason(userDoc, options);
  if (blockReason) {
    console.warn(
      `[notifications] Skipped instant email (${category}) for user ${userDoc?._id ?? "?"}: ${blockReason}`,
    );
    return false;
  }
  const unsubscribeUrl = await getUnsubscribeUrlForUser(String(userDoc._id));
  const mergedFixture = {
    ...fixture,
    unsubscribeUrl,
    preferencesUrl:
      fixture.preferencesUrl ?? `${getFrontendBaseUrl()}/dashboard`,
  };
  const renderResult = await renderInstantDigestFromPayload(mergedFixture, {
    brand: process.env.EMAIL_BRAND || "intersect",
  });
  await sendRenderedEmail({
    toEmail: userDoc.notification.email,
    renderResult,
    category,
  });
  return true;
}

export async function sendSubmissionConfirmedNotification({
  proposerId,
  vote,
  proposal,
  timestamp = new Date(),
}) {
  const userDoc = await User.findById(proposerId).select("notification").lean();
  if (!userDoc) {
    console.warn(
      `[notifications] Skipped submission-confirmed: no User for proposerId ${proposerId}`,
    );
    return false;
  }

  const fixture = notificationFixture({
    vote,
    proposal,
    events: [{ type: "submission_confirmed", timestamp: toTimestamp(timestamp) }],
  });
  return sendInstantToUser(userDoc, fixture, "submission-confirmed");
}

export async function sendProposalWithdrawnNotification({
  proposerId,
  vote,
  proposal,
  reason,
  comment,
  timestamp = new Date(),
}) {
  const userDoc = await User.findById(proposerId).select("notification").lean();
  if (!userDoc) {
    console.warn(
      `[notifications] Skipped proposal-withdrawn: no User for proposerId ${proposerId}`,
    );
    return false;
  }

  const fixture = notificationFixture({
    vote,
    proposal,
    events: [
      {
        type: "proposal_withdrawn",
        reason: String(reason ?? "").trim(),
        comment: String(comment ?? "").trim(),
        timestamp: toTimestamp(timestamp),
      },
    ],
  });
  return sendInstantToUser(userDoc, fixture, "proposal-withdrawn", {
    bypassScheduleNever: true,
  });
}

export async function queueCommentNotificationEvent({
  recipientUserId,
  proposalId,
  commentId,
  commenterId,
  commenterName,
  commentContent,
}) {
  if (String(recipientUserId) === String(commenterId)) {
    return false;
  }

  await CommentNotificationEvent.updateOne(
    { commentId: new mongoose.Types.ObjectId(commentId) },
    {
      $setOnInsert: {
        recipientUserId: String(recipientUserId),
        proposalId: new mongoose.Types.ObjectId(proposalId),
        commentId: new mongoose.Types.ObjectId(commentId),
        commenterId: String(commenterId),
        commenterName: commenterName ? String(commenterName) : null,
        preview: truncatePreview(commentContent),
        status: "pending",
      },
    },
    { upsert: true }
  );
  return true;
}

function scheduleMs(schedule) {
  if (schedule === "6h") return 6 * 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

function groupCommentEvents(events, proposalMap, voteMap) {
  const groupedByVote = new Map();

  for (const event of events) {
    const proposal = proposalMap.get(String(event.proposalId));
    if (!proposal) continue;
    const vote = voteMap.get(String(proposal.voteId));
    if (!vote) continue;

    const voteKey = String(vote._id);
    const proposalKey = String(proposal._id);
    if (!groupedByVote.has(voteKey)) {
      groupedByVote.set(voteKey, {
        name: vote.title,
        url: buildVoteUrl(vote.slug),
        proposals: new Map(),
      });
    }
    const voteBucket = groupedByVote.get(voteKey);
    if (!voteBucket.proposals.has(proposalKey)) {
      voteBucket.proposals.set(proposalKey, {
        title: proposal.title,
        url: buildProposalUrl(vote.slug, proposal._id),
        events: [],
      });
    }

    const proposalBucket = voteBucket.proposals.get(proposalKey);
    proposalBucket.events.push({
      type: "new_comment",
      commenter: event.commenterName || shortUserId(event.commenterId),
      preview: event.preview || "",
      timestamp: toTimestamp(event.createdAt),
    });
  }

  const votes = [];
  for (const voteBucket of groupedByVote.values()) {
    votes.push({
      name: voteBucket.name,
      url: voteBucket.url,
      proposals: Array.from(voteBucket.proposals.values()),
    });
  }
  return votes;
}

export async function runCommentDigestDispatch(now = new Date()) {
  const eligibleUsers = await User.find({
    "notification.email": { $ne: null },
    "notification.verifiedAt": { $ne: null },
    $or: [
      { "notification.schedule": { $in: Array.from(COMMENT_SCHEDULES) } },
      { "notification.schedule": { $exists: false } },
      { "notification.schedule": null },
    ],
  })
    .select("_id notification")
    .lean();

  let sentCount = 0;

  for (const userDoc of eligibleUsers) {
    const schedule = notificationSchedule(userDoc);
    const lastSentAt = userDoc?.notification?.lastCommentDigestSentAt
      ? new Date(userDoc.notification.lastCommentDigestSentAt)
      : null;
    if (lastSentAt && now.getTime() - lastSentAt.getTime() < scheduleMs(schedule)) {
      continue;
    }

    const eventQuery = {
      recipientUserId: String(userDoc._id),
      status: "pending",
      createdAt: { $lte: now },
    };
    if (lastSentAt) {
      eventQuery.createdAt.$gt = lastSentAt;
    }
    const events = await CommentNotificationEvent.find(eventQuery)
      .sort({ createdAt: 1 })
      .lean();

    if (events.length === 0) continue;

    const proposalIds = [...new Set(events.map((e) => String(e.proposalId)))].map(
      (id) => new mongoose.Types.ObjectId(id)
    );
    const proposals = await Proposal.find({ _id: { $in: proposalIds } })
      .select("_id voteId title")
      .lean();
    const proposalMap = new Map(proposals.map((p) => [String(p._id), p]));
    const voteIds = [...new Set(proposals.map((p) => String(p.voteId)))].map(
      (id) => new mongoose.Types.ObjectId(id)
    );
    const votes = await Vote.find({ _id: { $in: voteIds } })
      .select("_id title slug")
      .lean();
    const voteMap = new Map(votes.map((v) => [String(v._id), v]));

    const groupedVotes = groupCommentEvents(events, proposalMap, voteMap);
    if (groupedVotes.length === 0) continue;

    const unsubscribeUrl = await getUnsubscribeUrlForUser(String(userDoc._id));
    const fixture = {
      period: schedule === "6h" ? "6h" : "24h",
      votes: groupedVotes,
      preferencesUrl: `${getFrontendBaseUrl()}/dashboard`,
      unsubscribeUrl,
    };
    const renderResult = await renderDigestFromPayload(fixture, {
      brand: process.env.EMAIL_BRAND || "intersect",
    });

    const fanoutMs = getFanoutDelayMs();
    try {
      await sendRenderedEmail({
        toEmail: userDoc.notification.email,
        renderResult,
        category: "comment-digest",
      });

      const eventIds = events.map((e) => e._id);
      await Promise.all([
        CommentNotificationEvent.updateMany(
          { _id: { $in: eventIds } },
          { $set: { status: "sent", sentAt: now } }
        ),
        User.updateOne(
          { _id: userDoc._id },
          { $set: { "notification.lastCommentDigestSentAt": now } }
        ),
      ]);
      sentCount += 1;
      if (fanoutMs > 0) await sleep(fanoutMs);
    } catch (error) {
      if (fanoutMs > 0) await sleep(fanoutMs);
      console.error("Failed sending comment digest:", error);
    }
  }

  return sentCount;
}

async function listEligibleUsersForMilestones() {
  return User.find({
    "notification.email": { $ne: null },
    "notification.verifiedAt": { $ne: null },
    $or: [
      { "notification.schedule": { $in: Array.from(ALL_NOTIFICATION_SCHEDULES) } },
      { "notification.schedule": { $exists: false } },
      { "notification.schedule": null },
    ],
  })
    .select("_id notification")
    .lean();
}

async function dispatchVoteMilestone(voteDoc, eventType, now = new Date()) {
  const users = await listEligibleUsersForMilestones();
  const period = "24h";
  const voteUrl = buildVoteUrl(voteDoc.slug);
  const proposalTitle = voteDoc.title;
  let event = {
    type: eventType,
    timestamp: toTimestamp(now),
  };
  if (eventType === "results_published") {
    event = {
      ...event,
      resultsUrl: voteDoc.resultsUrl || voteDoc.votingUrl || voteUrl,
    };
  }

  let sentAny = false;
  const fanoutMs = getFanoutDelayMs();
  for (const userDoc of users) {
    const fixture = {
      period,
      votes: [
        {
          name: voteDoc.title,
          url: voteUrl,
          proposals: [
            {
              title: proposalTitle,
              id: String(voteDoc._id),
              url: voteUrl,
              events: [event],
            },
          ],
        },
      ],
      preferencesUrl: `${getFrontendBaseUrl()}/dashboard`,
      unsubscribeUrl: `${getFrontendBaseUrl()}/dashboard`,
    };

    try {
      const sent = await sendInstantToUser(
        userDoc,
        fixture,
        eventType === "voting_opened" ? "voting-opened" : "results-published"
      );
      sentAny = sentAny || sent;
      if (sent && fanoutMs > 0) await sleep(fanoutMs);
    } catch (error) {
      if (fanoutMs > 0) await sleep(fanoutMs);
      console.error(`Failed milestone send (${eventType}) for user ${userDoc._id}:`, error);
    }
  }

  return sentAny;
}

export async function runVoteMilestoneDispatch(now = new Date()) {
  const votingOpenVotes = await Vote.find({
    votingStartDate: { $lte: now },
    "notificationDispatch.votingOpenedSentAt": null,
  }).lean();

  const resultsVotes = await Vote.find({
    resultsPublishedAt: { $ne: null, $lte: now },
    "notificationDispatch.resultsPublishedSentAt": null,
  }).lean();

  let milestoneCount = 0;
  for (const voteDoc of votingOpenVotes) {
    await dispatchVoteMilestone(voteDoc, "voting_opened", now);
    await Vote.updateOne(
      { _id: voteDoc._id },
      { $set: { "notificationDispatch.votingOpenedSentAt": now } }
    );
    milestoneCount += 1;
  }

  for (const voteDoc of resultsVotes) {
    await dispatchVoteMilestone(voteDoc, "results_published", now);
    await Vote.updateOne(
      { _id: voteDoc._id },
      { $set: { "notificationDispatch.resultsPublishedSentAt": now } }
    );
    milestoneCount += 1;
  }

  return milestoneCount;
}

export async function runNotificationDispatch(now = new Date()) {
  const [milestones, commentDigests] = await Promise.all([
    runVoteMilestoneDispatch(now),
    runCommentDigestDispatch(now),
  ]);
  return { milestones, commentDigests };
}

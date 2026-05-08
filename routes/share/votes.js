import { Router } from "express";
import mongoose from "mongoose";
import { Vote } from "../../schema/Vote.js";
import { Proposal } from "../../schema/Proposal.js";

const router = Router();

const OG_IMAGE_URL = "https://hydra-voting.intersectmbo.org/images/social.png";
const PUBLIC_PROPOSAL_STATUSES = new Set([
  "live",
  "withdrawnByProposer",
  "withdrawnByAdmin",
  "archived",
]);

function toText(value) {
  return String(value ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_~]+/g, " ")
    .replace(/^\s*-\s+/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value, max = 160) {
  const normalized = toText(value);
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 3).trim()}...`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getFrontendBaseUrl() {
  return String(process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
}

function absoluteUrl(path) {
  return `${getFrontendBaseUrl()}${path}`;
}

function pickCcDescription(proposal) {
  const track = String(proposal?.metaData?.track ?? "").trim();
  const byTrack = proposal?.metaData?.[track] ?? {};
  return String(byTrack?.motivation ?? "").trim();
}

function buildMeta(vote, proposal) {
  const proposalTitle = String(
    proposal?.title ?? proposal?.name ?? "Untitled Proposal",
  ).trim();
  const withPrefix = (prefix, value) => {
    const clean = String(value ?? "").trim();
    return clean ? `${prefix} - ${clean}` : prefix;
  };

  if (vote?.form === "ccVote2026") {
    const track = String(proposal?.metaData?.track ?? "").trim();
    const candidateName = String(
      proposal?.metaData?.[track]?.applicantName ?? proposalTitle,
    ).trim();
    return {
      title: withPrefix("CC Elections 2026", candidateName),
      description: pickCcDescription(proposal),
    };
  }

  if (vote?.form === "budget2026") {
    return {
      title: withPrefix("Budget Process 2026", proposalTitle),
      description: String(proposal?.summary ?? "").trim(),
    };
  }

  return {
    title: proposalTitle,
    description: String(proposal?.summary ?? "").trim(),
  };
}

function shareHtml({ title, description, canonicalUrl, redirectUrl }) {
  const safeTitle = escapeHtml(toText(title));
  const safeDescription = escapeHtml(truncate(description));
  const safeCanonical = escapeHtml(canonicalUrl);
  const safeRedirect = escapeHtml(redirectUrl);
  const safeImage = escapeHtml(OG_IMAGE_URL);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}" />
  <link rel="canonical" href="${safeCanonical}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:url" content="${safeCanonical}" />
  <meta property="og:image" content="${safeImage}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${safeImage}" />
  <meta http-equiv="refresh" content="0;url=${safeRedirect}" />
</head>
<body>
  <script>window.location.replace(${JSON.stringify(redirectUrl)});</script>
</body>
</html>`;
}

router.get("/:voteSlug/:proposalId", async (req, res) => {
  try {
    const { voteSlug, proposalId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(proposalId) || proposalId.length !== 24) {
      return res.status(400).type("text/html").send("Invalid proposal ID");
    }

    const vote = await Vote.findOne({ slug: voteSlug }).lean();
    if (!vote) {
      return res.status(404).type("text/html").send("Vote not found");
    }

    const proposal = await Proposal.findById(proposalId).lean();
    if (!proposal || String(proposal.voteId) !== String(vote._id)) {
      return res.status(404).type("text/html").send("Proposal not found");
    }

    if (!PUBLIC_PROPOSAL_STATUSES.has(String(proposal.status ?? ""))) {
      return res.status(404).type("text/html").send("Proposal not found");
    }

    const meta = buildMeta(vote, proposal);
    const proposalPath = `/votes/${encodeURIComponent(voteSlug)}/${proposalId}`;
    const canonicalUrl = absoluteUrl(proposalPath);
    const redirectUrl = canonicalUrl;

    res.set("Cache-Control", "public, max-age=300, s-maxage=300");
    return res
      .status(200)
      .type("text/html")
      .send(
        shareHtml({
          title: meta.title,
          description: meta.description,
          canonicalUrl,
          redirectUrl,
        }),
      );
  } catch (error) {
    console.error("Error generating share page:", error);
    return res.status(500).type("text/html").send("Unable to render share page");
  }
});

export default router;

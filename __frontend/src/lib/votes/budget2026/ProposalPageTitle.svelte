<script>
  import ProposalRevisionHistory from "$lib/ProposalRevisionHistory.svelte";
  import { Button } from "$lib/components/ui/button";
  import VoteIcon from "@lucide/svelte/icons/vote";
  import { buildProposalVotingUrl, canShowVotingUi } from "$lib/voteWindowPolicy.js";

  let {
    proposal,
    vote,
    commentCount = null,
    commentsHref = "",
    showComments = false,
    policyNow = new Date(),
  } = $props();

  let revisionDrawerOpen = $state(false);

  const showVersionBadge = $derived(
    (proposal?.version != null && proposal.version > 1) ||
      (Array.isArray(proposal?.versions) && proposal.versions.length > 0),
  );
  const resolvedCommentCount = $derived.by(() => {
    if (commentCount != null) {
      const fromProp = Number(commentCount);
      if (Number.isFinite(fromProp)) return fromProp;
    }
    if (proposal?.commentCount != null) {
      const fromProposal = Number(proposal.commentCount);
      if (Number.isFinite(fromProposal)) return fromProposal;
    }
    return null;
  });

  const voteNowHref = $derived.by(() => {
    if (proposal?.status !== "live") return null;
    if (!canShowVotingUi(vote, policyNow)) return null;
    return buildProposalVotingUrl(vote, proposal._id ?? proposal.id);
  });
</script>

<h1 class="min-w-0">
  {proposal?.title || proposal?.name || "Untitled Proposal"}
</h1>

<div class="flex items-center gap-2 flex-wrap">
  {#if voteNowHref}
    <Button
      href={voteNowHref}
      target="_blank"
      rel="noopener noreferrer"
      variant="secondary"
      size="sm"
      class="text-xs shrink-0 animate-pulse bg-(--mbo-electric-blue) text-white hover:bg-(--mbo-cardano-blue) hover:border-(--mbo-cardano-blue) align-baseline ml-0 -top-1 relative"
    >
      <VoteIcon class="size-4 mr-1" aria-hidden="true" />
      Vote Now!
    </Button>
  {/if}
  <Button
    variant="outline"
    size="sm"
    type="button"
    onclick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      revisionDrawerOpen = true;
    }}
    class="text-xs font-normal shrink-0 align-baseline ml-0 -top-1 relative"
    aria-label="View revision history"
    title="View revision history"
  >
    View previous versions
  </Button>
  {#if showComments && commentsHref}
    <Button
      variant="outline"
      size="sm"
      href={commentsHref}
      class="text-xs font-normal shrink-0 align-baseline ml-0 -top-1 relative"
      aria-label={commentCount != null
        ? `Jump to comments (${resolvedCommentCount ?? commentCount})`
        : "Jump to comments"}
      title="Jump to comments"
    >
      {#if resolvedCommentCount == null}
        Comments
      {:else if resolvedCommentCount <= 0}
        No comments yet (0)
      {:else if resolvedCommentCount === 1}
        1 Comment
      {:else}
        {resolvedCommentCount} Comments
      {/if}
    </Button>
  {/if}
</div>

<ProposalRevisionHistory {proposal} {vote} bind:open={revisionDrawerOpen} />

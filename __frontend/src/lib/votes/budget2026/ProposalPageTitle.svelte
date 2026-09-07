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

<div class="flex flex-wrap items-center gap-2">
  {#if voteNowHref}
    <Button
      href={voteNowHref}
      target="_blank"
      rel="noopener noreferrer"
      variant="secondary"
      size="sm"
      class="relative -top-1 ml-0 shrink-0 animate-pulse bg-(--mbo-electric-blue) align-baseline text-xs text-white hover:border-(--mbo-cardano-blue) hover:bg-(--mbo-cardano-blue)"
    >
      <VoteIcon class="mr-1 size-4" aria-hidden="true" />
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
    class="relative -top-1 ml-0 shrink-0 align-baseline text-xs font-normal"
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
      class="relative -top-1 ml-0 shrink-0 align-baseline text-xs font-normal"
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

<script>
  import ProposalRevisionHistory from "$lib/ProposalRevisionHistory.svelte";
  import { Button } from "$lib/components/ui/button";
  let { proposal, vote, commentCount = null, commentsHref = "", showComments = false } = $props();

  let revisionDrawerOpen = $state(false);

  const showVersionBadge = $derived(
    (proposal?.version != null && proposal.version > 1) ||
      (Array.isArray(proposal?.versions) && proposal.versions.length > 0),
  );
  const resolvedCommentCount = $derived.by(() => {
    const fromProp = Number(commentCount);
    if (Number.isFinite(fromProp)) return fromProp;
    const fromProposal = Number(proposal?.commentCount);
    return Number.isFinite(fromProposal) ? fromProposal : null;
  });
</script>

<h1 class="min-w-0">
  {proposal?.title || proposal?.name || "Untitled Proposal"}
</h1>

<div class="flex items-center gap-2">
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

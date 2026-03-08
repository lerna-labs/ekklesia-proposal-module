<script>
  import { Button } from "$lib/components/ui/button";
  import Comments from "$lib/comments/Comments.svelte";

  let {
    proposal,
    vote,
    pillars = [],
    commentCount,
    backToVoteUrl = "",
    voteUrl = "",
    currentVersionHref = null,
    showComments = false,
    commentsHref = "",
  } = $props();
</script>

<div class="mb-6">
  {#if currentVersionHref}
    <Button href={currentVersionHref} variant="ghost" size="sm">
      See current version of this proposal
    </Button>
  {:else if backToVoteUrl}
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onclick={() => history.back()}
    >
      ← Back to vote
    </Button>
  {:else}
    <Button href={voteUrl} variant="ghost" size="sm">
      ← Back to vote
    </Button>
  {/if}
</div>

{#if showComments && proposal}
  <Comments proposalId={proposal._id} {proposal} {vote} />
{/if}

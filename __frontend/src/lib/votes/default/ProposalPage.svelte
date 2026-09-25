<script>
  import { goto } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import Comments from "$lib/comments/Comments.svelte";

  let {
    proposal,
    vote,
    backToVoteUrl = "",
    voteUrl = "",
    currentVersionHref = null,
    showComments = false,
    isWithdrawn = false,
  } = $props();

  function goBackToList() {
    if (backToVoteUrl) {
      window.history.back();
    } else {
      goto(voteUrl);
    }
  }
</script>

{#if !currentVersionHref}
  <!-- Back to list (above title): history.back() when coming from list, else goto vote -->
  <div class="mb-6">
    <Button type="button" variant="ghost" size="sm" onclick={goBackToList}>
      ← Back to {vote?.title ?? vote?.name ?? "vote"}
    </Button>
  </div>
{/if}

{#if showComments && proposal}
  <Comments proposalId={proposal._id} {proposal} {vote} readOnly={isWithdrawn} />
{/if}

<script>
  import Comments from "$lib/comments/Comments.svelte";
  let { proposal, vote, showComments = false } = $props();
</script>

{#if showComments && proposal}
  <div id="comments" class="mt-8 w-full bg-slate-100">
    <div class="container mx-auto max-w-4xl py-8 px-4">
      <Comments proposalId={proposal._id} {proposal} {vote} />
    </div>
  </div>
{/if}

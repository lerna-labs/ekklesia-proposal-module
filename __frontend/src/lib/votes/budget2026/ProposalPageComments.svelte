<script>
  import Comments from "$lib/comments/Comments.svelte";
  let { proposal, vote, showComments = false, readOnly = false } = $props();
</script>

{#if showComments && proposal}
  <div id="comments" class="w-full bg-slate-100">
    <div class="container mx-auto max-w-4xl px-4 py-8 pb-5">
      <Comments proposalId={proposal._id} {proposal} {vote} {readOnly} />
    </div>
  </div>
{/if}

<script>
  import { Button } from "$lib/components/ui/button";
  import ProposalCard from "$lib/ProposalCard.svelte";
  import Comments from "$lib/comments/Comments.svelte";
  let { data } = $props();

  let { vote, proposal, categories = [], commentCount } = $derived(data);

  const isWithdrawn = $derived(
    proposal?.status === "withdrawnByAdmin" ||
      proposal?.status === "withdrawnByProposer",
  );
  const showComments = $derived(
    proposal &&
      proposal.status !== "draft" &&
      (!isWithdrawn || (commentCount ?? 0) > 0),
  );
</script>

<div class="container mx-auto max-w-4xl py-8 px-4">
  <div class="mb-6">
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onclick={() => history.back()}
    >
      ← Back to vote
    </Button>
  </div>

  <ProposalCard {proposal} {vote} {categories} showLink={false} />

  {#if showComments}
    <Comments proposalId={proposal._id} {proposal} {vote} />
  {/if}
</div>

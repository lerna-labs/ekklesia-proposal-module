<script>
  import { Button } from "$lib/components/ui/button";
  import ProposalCard from "$lib/ProposalCard.svelte";
  import Comments from "$lib/Comments.svelte";
  let { data } = $props();

  let { vote, proposal, categories = [] } = $derived(data);
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

  {#if proposal && proposal.status !== "draft"}
    <Comments proposalId={proposal._id} {proposal} {vote} />
  {/if}
</div>

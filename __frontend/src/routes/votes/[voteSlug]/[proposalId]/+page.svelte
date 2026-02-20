<script>
  import * as Button from "$lib/components/ui/button";
  import ProposalCard from "$lib/ProposalCard.svelte";
  import PillarInfo from "$lib/PillarInfo.svelte";
  let { data } = $props();

  let { vote, proposal, categories = [] } = $derived(data);
  const categoryForPillar = $derived(
    proposal?.metaData?.strategicFocusArea && Array.isArray(categories)
      ? categories.find(
          (c) => String(c._id) === String(proposal.metaData.strategicFocusArea),
        )
      : null,
  );
</script>

<div class="container mx-auto max-w-4xl py-8 px-4">
  <div class="mb-6">
    <Button.Root
      type="button"
      variant="ghost"
      size="sm"
      onclick={() => history.back()}
    >
      ← Back to vote
    </Button.Root>
  </div>

  <ProposalCard {proposal} {vote} {categories} showLink={false} />

  {#if categoryForPillar?.metaData}
    <section class="mt-4">
      <PillarInfo category={categoryForPillar} />
    </section>
  {/if}

  <!-- Comments section commented out for now
  <section class="mt-8" id="comments">
    <Comments {comments} />
  </section>
  -->
</div>

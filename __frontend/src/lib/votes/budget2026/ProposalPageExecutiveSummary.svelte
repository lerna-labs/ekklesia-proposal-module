<script>
  import Markdown from "$lib/base/Markdown.svelte";
  import ItemContainer from "./ItemContainer.svelte";
  import CollapsibleCard from "$lib/components/CollapsibleCard.svelte";
  let { proposal } = $props();
  let expandedSummary = $state(true);
  let expandedTrackRecord = $state(true);
</script>

<section id="executive-summary">
  <h2 class="text-2xl font-medium mb-4 mt-8">Proposal Overview</h2>

  <CollapsibleCard
    class="mt-4"
    expanded={expandedSummary}
    onToggle={() => (expandedSummary = !expandedSummary)}
    expandLabel="Expand proposal overview"
    collapseLabel="Collapse proposal overview"
    titleClass="text-lg font-medium leading-6"
  >
    {#snippet title()}
      Please describe your whole proposal at high level
    {/snippet}
    <ItemContainer>
      <Markdown content={proposal?.summary} class="text-sm" />
    </ItemContainer>
  </CollapsibleCard>

  {#if proposal?.metaData?.trackRecord}
    <CollapsibleCard
      id="track-record"
      class="mt-2"
      expanded={expandedTrackRecord}
      onToggle={() => (expandedTrackRecord = !expandedTrackRecord)}
      expandLabel="Expand track record"
      collapseLabel="Collapse track record"
      titleClass="text-lg font-medium leading-6"
    >
      {#snippet title()}
        Why are you the best suited to deliver this work?
      {/snippet}
      {#snippet popover()}
        Describe what previous experience and expertise you or your team have
        which is relevant for your proposal. Focus on proven history of
        delivery, mention previous successful proposals, mainnet deployments, or
        relevant enterprise experience.
      {/snippet}
      <ItemContainer>
        <Markdown content={proposal?.metaData?.trackRecord} class="text-sm" />
      </ItemContainer>
    </CollapsibleCard>
  {/if}
</section>

<script>
  import CollapsibleCard from "$lib/components/CollapsibleCard.svelte";
  import FormPillarCard from "$lib/forms/budget2026/FormPillarCard.svelte";
  import ItemContainer from "./ItemContainer.svelte";
  import Markdown from "$lib/base/Markdown.svelte";

  let { proposal, pillars = [] } = $props();

  let expandedPillars = $state(true);
  let expandedRationale = $state(true);
  let expandedKpi = $state(true);

  const selectedPillarIds = $derived(
    proposal?.metaData?.strategyFramework?.pillars ?? [],
  );
  const selectedPillars = $derived.by(() => {
    const ids = Array.isArray(selectedPillarIds) ? selectedPillarIds : [];
    const options = Array.isArray(pillars) ? pillars : [];
    return ids.map((id) => options.find((p) => p?._id === id)).filter(Boolean);
  });

  const pillarRationale = $derived(
    proposal?.metaData?.strategyFramework?.pillarRationale ?? "",
  );
  const kpiAlignment = $derived(
    proposal?.metaData?.strategyFramework?.kpiAlignment ?? "",
  );
  const hasContent = $derived(
    selectedPillars.length > 0 ||
      pillarRationale.trim().length > 0 ||
      kpiAlignment.trim().length > 0,
  );
</script>

{#if hasContent}
  <section class="text-sm space-y-2 mt-8" id="strategy-framework">
    <h2 class="text-2xl font-medium mb-2">
      Alignment to Cardano 2030 Strategy framework
    </h2>

    {#if selectedPillars.length > 0}
      <CollapsibleCard
        expanded={expandedPillars}
        onToggle={() => (expandedPillars = !expandedPillars)}
        expandLabel="Expand selected strategic pillars"
        collapseLabel="Collapse selected strategic pillars"
      >
        {#snippet title()}
          To which strategic pillar does your proposal align the most?
        {/snippet}
        <div class="space-y-2 rounded-md">
          {#each selectedPillars as pillar (pillar?._id)}
            <FormPillarCard {pillar} selected={false} readOnly={true} class="bg-white" />
          {/each}
        </div>
      </CollapsibleCard>
    {/if}

    {#if pillarRationale.trim()}
      <CollapsibleCard
        expanded={expandedRationale}
        onToggle={() => (expandedRationale = !expandedRationale)}
        expandLabel="Expand pillar rationale"
        collapseLabel="Collapse pillar rationale"
      >
        {#snippet title()}
          Why have you selected those pillars?
        {/snippet}
        <ItemContainer>
          <Markdown content={pillarRationale} />
        </ItemContainer>
      </CollapsibleCard>
    {/if}

    {#if kpiAlignment.trim()}
      <CollapsibleCard
        expanded={expandedKpi}
        onToggle={() => (expandedKpi = !expandedKpi)}
        expandLabel="Expand KPI alignment"
        collapseLabel="Collapse KPI alignment"
      >
        {#snippet title()}
          Does your proposal support any of the KPIs of the strategy framework?
        {/snippet}
        <ItemContainer>
          <Markdown content={kpiAlignment} />
        </ItemContainer>
      </CollapsibleCard>
    {/if}
  </section>
{/if}

<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import FormPillarCard from "$lib/forms/budget2026/FormPillarCard.svelte";
  import ItemContainer from "./ItemContainer.svelte";
  import Markdown from "$lib/base/Markdown.svelte";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import ChevronUpIcon from "@lucide/svelte/icons/chevron-up";

  let { proposal, pillars = [] } = $props();

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
  <section class="text-sm space-y-4 mt-8" id="strategy-framework">
    <h2 class="text-2xl font-medium mb-2"
      >Alignment to Cardano 2030 Strategy framework</h2
    >

    <h3 class="text-lg font-medium mb-2 mt-4">
      To which strategic pillar does your proposal align the most?
    </h3>

    {#if selectedPillars.length > 0}
      <div class="space-y-2 rounded-md border mb-4">
        {#each selectedPillars as pillar (pillar?._id)}
          <FormPillarCard {pillar} selected={true} readOnly={true} />
        {/each}
      </div>
    {/if}

    {#if pillarRationale.trim()}
      <Card.Root
        class="py-2 {expandedRationale
          ? 'pb-0'
          : 'pb-2'} bg-slate-50 rounded-md border"
      >
        <Card.Header
          class="flex flex-row items-center gap-1 py-1 pl-4 pr-3 text-sm"
        >
          <button
            type="button"
            class="min-w-0 flex-1 font-medium truncate text-left cursor-pointer focus:outline-none text-lg flex items-center gap-2"
            title="Pillar rationale"
            onclick={() => (expandedRationale = !expandedRationale)}
          >
            <h3 class="text-lg font-medium"
              >Why have you selected those pillars?</h3
            >
          </button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            class="shrink-0 size-8 cursor-pointer"
            title={expandedRationale ? "Collapse" : "Expand"}
            aria-expanded={expandedRationale}
            aria-label={expandedRationale ? "Collapse" : "Expand"}
            onclick={() => (expandedRationale = !expandedRationale)}
          >
            {#if expandedRationale}
              <ChevronUpIcon class="size-4" aria-hidden="true" />
            {:else}
              <ChevronDownIcon class="size-4" aria-hidden="true" />
            {/if}
          </Button>
        </Card.Header>
        {#if expandedRationale}
          <Card.Content class="pl-4 pr-3 pt-0 pb-4 **:first:mt-0">
            <ItemContainer>
              <Markdown content={pillarRationale} />
            </ItemContainer>
          </Card.Content>
        {/if}
      </Card.Root>
    {/if}

    {#if kpiAlignment.trim()}
      <Card.Root
        class="py-2 {expandedKpi
          ? 'pb-0'
          : 'pb-2'} bg-slate-50 rounded-md border"
      >
        <Card.Header
          class="flex flex-row items-center gap-1 py-1 pl-4 pr-3 text-sm"
        >
          <button
            type="button"
            class="min-w-0 flex-1 font-medium truncate text-left cursor-pointer focus:outline-none text-lg flex items-center gap-2"
            title="KPI alignment"
            onclick={() => (expandedKpi = !expandedKpi)}
          >
            <h3 class="text-lg font-medium"
              >Does your proposal support any of the KPIs of the strategy
              framework?</h3
            >
          </button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            class="shrink-0 size-8 cursor-pointer"
            title={expandedKpi ? "Collapse" : "Expand"}
            aria-expanded={expandedKpi}
            aria-label={expandedKpi ? "Collapse" : "Expand"}
            onclick={() => (expandedKpi = !expandedKpi)}
          >
            {#if expandedKpi}
              <ChevronUpIcon class="size-4" aria-hidden="true" />
            {:else}
              <ChevronDownIcon class="size-4" aria-hidden="true" />
            {/if}
          </Button>
        </Card.Header>
        {#if expandedKpi}
          <Card.Content class="pl-4 pr-3 pt-0 pb-4 **:first:mt-0">
            <ItemContainer>
              <Markdown content={kpiAlignment} />
            </ItemContainer>
          </Card.Content>
        {/if}
      </Card.Root>
    {/if}
  </section>
{/if}

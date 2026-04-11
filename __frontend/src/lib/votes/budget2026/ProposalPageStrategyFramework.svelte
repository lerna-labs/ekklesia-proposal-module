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
        titleHeadingLevel={3}
      >
        {#snippet title()}
          To which strategic pillar does your proposal align the most?
        {/snippet}
        {#snippet popover()}
          Looking at the <a
            href="https://product-committee.mypinata.cloud/ipfs/bafkreiewgqs6c25nk7gtzlf5udrqumpiqnbxhix7tu4yvssr2lgxgs3k2m"
            target="_blank"
            class="link"
          >
            strategy pillars
          </a>
          supported by DReps in this
          <a
            href="https://gov.tools/outcomes/governance_actions/3a5be93bafd26d0dbb9bfe19f4acecaa38cef75e50201d19199e6cc856db6601#0"
            target="_blank"
            class="link"
          >
            info action
          </a>
          , which one does your proposal support or relate to the most. Before selecting
          read the whole
          <a
            href="https://product-committee.mypinata.cloud/ipfs/bafkreiewgqs6c25nk7gtzlf5udrqumpiqnbxhix7tu4yvssr2lgxgs3k2m"
            target="_blank"
            class="link"
          >
            strategy framework
          </a>
          and review the pillars details. Select one or more
        {/snippet}
        <div class="space-y-2 rounded-md">
          {#each selectedPillars as pillar (pillar?._id)}
            <FormPillarCard
              {pillar}
              selected={false}
              readOnly={true}
              class="bg-white"
            />
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
        titleHeadingLevel={3}
      >
        {#snippet title()}
          Why have you selected those pillars?
        {/snippet}
        {#snippet popover()}
          Provide a rationale about why those pillars align the most to your
          proposal and how your proposal supports them. Look also at the <a
            href="https://product-committee.mypinata.cloud/ipfs/bafkreiewgqs6c25nk7gtzlf5udrqumpiqnbxhix7tu4yvssr2lgxgs3k2m"
            target="_blank"
            class="link"
          >
            focus areas
          </a>
          provided as example for each pillar.
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
        titleHeadingLevel={3}
      >
        {#snippet title()}
          Does your proposal support any of the KPIs of the strategy framework?
        {/snippet}
        {#snippet popover()}
          Looking at the <a
            href="https://product-committee.mypinata.cloud/ipfs/bafkreiewgqs6c25nk7gtzlf5udrqumpiqnbxhix7tu4yvssr2lgxgs3k2m"
            target="_blank"
            class="link"
          >
            KPIs
          </a>
          provided in the strategy framwork, explain:
          <ul class="list-disc list-outside pl-4 mb-2 mt-2">
            <li>if your proposal directly supports any of those and how</li>
            <li>
              AND / OR propose other additional to the existing list, describe
              why they are relevant and how your proposal relates to them.
            </li>
          </ul>
          <p>
            For each selected KPI, explain the specific actions, methods, or
            approaches you will use to drive meaningful impact.
          </p>
        {/snippet}
        <ItemContainer>
          <Markdown content={kpiAlignment} />
        </ItemContainer>
      </CollapsibleCard>
    {/if}
  </section>
{/if}

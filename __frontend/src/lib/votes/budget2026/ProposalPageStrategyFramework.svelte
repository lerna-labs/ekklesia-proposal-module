<script>
  import Markdown from "$lib/base/Markdown.svelte";

  let { proposal } = $props();

  const pillarRationale = $derived(
    proposal?.metaData?.strategyFramework?.pillarRationale ?? "",
  );
  const kpiAlignment = $derived(
    proposal?.metaData?.strategyFramework?.kpiAlignment ?? "",
  );
  const hasContent = $derived(
    pillarRationale.trim().length > 0 || kpiAlignment.trim().length > 0,
  );
</script>

{#if hasContent}
  <section class="text-sm space-y-4">
    <h2 class="text-2xl font-medium mb-2">Strategy framework</h2>

    {#if pillarRationale.trim()}
      <div>
        <h3 class="font-medium text-muted-foreground mb-1">Pillar rationale</h3>
        <div class="**:first:mt-0">
          <Markdown content={pillarRationale} />
        </div>
      </div>
    {/if}

    {#if kpiAlignment.trim()}
      <div>
        <h3 class="font-medium text-muted-foreground mb-1">KPI alignment</h3>
        <div class="**:first:mt-0">
          <Markdown content={kpiAlignment} />
        </div>
      </div>
    {/if}
  </section>
{/if}

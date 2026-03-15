<script>
  /**
   * Collapsible budget cards for one work package: one card per budget row
   * (header = item name + chevron; expanded = Cost category, ADA + USD, Description), plus total row.
   */
  import CollapsibleCard from "./CollapsibleCard.svelte";
  import { formatAda, formatUsd } from "$lib/utils.js";
  import Markdown from "$lib/base/Markdown.svelte";

  let { breakdown = [], totalAda = 0, conversionRateNum = null } = $props();

  /** Which budget row cards are expanded. rowIdx -> boolean. Default collapsed. */
  let expanded = $state({});

  function toggle(rowIdx) {
    expanded = { ...expanded, [rowIdx]: !expanded[rowIdx] };
  }

  function rowTotal(row) {
    return row.total ?? Number(row.quantity || 0) * Number(row.unitPrice || 0);
  }

  const totalUsd = $derived(
    conversionRateNum != null && Number.isFinite(totalAda)
      ? totalAda * conversionRateNum
      : null,
  );
</script>

<section class="space-y-2">
  <h4 class="text-normal font-medium mb-2">
    What's the budget estimated for this Work Package?
  </h4>
  <p class="text-sm text-muted-foreground mb-4">
    Budget breakdown by category and item.
  </p>

  <ul class="space-y-2 list-none p-0 m-0 mb-1!">
    {#each breakdown as row, rowIdx}
      {@const total = rowTotal(row)}
      {@const isExpanded = expanded[rowIdx] === true}
      {@const itemName =
        (row.name ?? row.itemName) || row.costCategory || `Item ${rowIdx + 1}`}
      <li>
        <CollapsibleCard
          title={itemName}
          expanded={isExpanded}
          onToggle={() => toggle(rowIdx)}
          expandLabel="Expand budget item"
          collapseLabel="Collapse budget item"
        >
          <div class="text-sm text-muted-foreground mt-0 mb-1">
            <span class="font-medium text-foreground">Cost category:</span>
            <span>{row.costCategory ?? "—"}</span>
          </div>
          <div class="text-sm text-muted-foreground mt-3">
            <span class="font-medium text-foreground">ADA costs:</span>
            <span>
              {formatAda(total)} ADA
              {#if conversionRateNum != null && Number.isFinite(total)}
                <br />
                <span class="text-muted-foreground">
                  USD equivalent ${formatUsd(total * conversionRateNum)} (ADA/USD
                  {conversionRateNum})
                </span>
              {/if}
            </span>
          </div>
          {#if (row.description ?? "").trim()}
            <div class="text-sm text-muted-foreground mt-3">
              <span class="font-medium text-foreground block mb-1"
                >Item description:</span
              >
              <Markdown content={row.description ?? ""} class="mt-0.5" />
            </div>
          {/if}
        </CollapsibleCard>
      </li>
    {/each}
  </ul>

  <div
    class="flex flex-wrap items-center justify-between gap-2 py-3 px-4 rounded-md border bg-(--mbo-cardano-blue) text-white font-medium mt-4"
  >
    <span>Total work package budget</span>
    <div class="flex items-center gap-4 tabular-nums">
      <span>{formatAda(totalAda)} ADA</span>
      {#if totalUsd != null}
        <span>${formatUsd(totalUsd)} (ADA/USD {conversionRateNum})</span>
      {/if}
    </div>
  </div>
</section>

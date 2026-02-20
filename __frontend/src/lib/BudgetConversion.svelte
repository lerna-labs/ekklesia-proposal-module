<script>
  import * as Popover from "$lib/components/ui/popover";
  import { formatAda, formatUsd } from "$lib/utils.js";

  /** @type {{ totalBudget: number, conversionRate?: number | null, class?: string }} */
  let { totalBudget, conversionRate, class: className } = $props();

  const rate = $derived(conversionRate != null ? Number(conversionRate) : null);
  const adaAmount = $derived(totalBudget ?? 0);
  const hasRate = $derived(rate != null && rate !== 0);
  const usdAmount = $derived(hasRate ? adaAmount * rate : 0);

  const formatRate = (r) =>
    r.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
</script>

<Popover.Root class={className ?? ""}>
  <Popover.Trigger
    type="button"
    class="inline-flex items-center gap-1 rounded-md hover:bg-accent hover:text-accent-foreground px-1 -mx-1 text-sm font-semibold cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
    aria-label="View amount in ADA and USD"
  >
    {formatAda(adaAmount)} ADA
  </Popover.Trigger>
  <Popover.Content class="w-auto min-w-48" align="start">
    <div class="grid gap-2 text-sm">
      <div class="flex justify-between gap-4">
        <span class="text-muted-foreground">ADA</span>
        <span class="font-semibold tabular-nums">{formatAda(adaAmount)}</span>
      </div>
      {#if hasRate}
        <div class="flex justify-between gap-4">
          <span class="text-muted-foreground">USD</span>
          <span class="font-semibold tabular-nums">{formatUsd(usdAmount)}</span>
        </div>
        <div class="flex justify-between gap-4 border-t pt-2 mt-1">
          <span class="text-muted-foreground">Rate</span>
          <span class="font-medium tabular-nums">
            {formatRate(rate)} USD/ADA
          </span>
        </div>
      {:else}
        <p
          class="text-destructive font-medium pt-2 mt-1 border-t text-xs"
          role="alert"
        >
          USD conversion rate not set
        </p>
      {/if}
    </div>
  </Popover.Content>
</Popover.Root>

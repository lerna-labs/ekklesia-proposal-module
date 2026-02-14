<script>
  import * as Popover from "$lib/components/ui/popover";
  import * as Button from "$lib/components/ui/button";
  import { formatAda, formatUsd } from "$lib/utils.js";

  /** Default when proposal has no conversionRate. */
  const DEFAULT_ADA_USD = 0.5;

  /** @type {{ totalBudget: number, conversionRate?: number, class?: string }} */
  let { totalBudget, conversionRate = DEFAULT_ADA_USD, class: className } =
    $props();

  const rate = $derived(conversionRate ?? DEFAULT_ADA_USD);
  const adaAmount = $derived(totalBudget ?? 0);
  const usdAmount = $derived(adaAmount * rate);

  const formatRate = (r) =>
    r.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
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
      <div class="flex justify-between gap-4">
        <span class="text-muted-foreground">USD</span>
        <span class="font-semibold tabular-nums">{formatUsd(usdAmount)}</span>
      </div>
      <div class="flex justify-between gap-4 border-t pt-2 mt-1">
        <span class="text-muted-foreground">Rate</span>
        <span class="font-medium tabular-nums">{formatRate(rate)} USD/ADA</span>
      </div>
    </div>
  </Popover.Content>
</Popover.Root>

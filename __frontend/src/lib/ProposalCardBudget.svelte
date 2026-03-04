<script>
  import * as Popover from "$lib/components/ui/popover";
  import { formatAda, formatUsd } from "$lib/utils.js";

  /** @type {{ totalBudget: number, conversionRate?: number | null, class?: string }} */
  let { totalBudget, conversionRate, class: className = "" } = $props();

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

<Popover.Root class={className}>
  <Popover.Trigger
    type="button"
    class="w-fit rounded-md border border-border px-2 py-1.5 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 hover:bg-muted/50 transition-colors bg-white"
    title="View budget in USD equivalent"
    aria-label="View USD equivalent"
  >
    <div class="flex items-center divide-x divide-border text-xs">
      <span class="pr-2 text-muted-foreground">Requested Budget</span>
      <span class="pl-2 font-semibold tabular-nums">
        {formatAda(adaAmount)} ADA
      </span>
    </div>
  </Popover.Trigger>
  <Popover.Content class="w-auto max-w-[16rem] p-2" align="end" side="bottom">
    <table class="text-xs w-full border-collapse table-fixed">
      <tbody>
        <tr>
          <td class="text-black pr-2 py-0.5">USD Equivalent:</td>
          <td class="font-medium tabular-nums text-right">
            {#if hasRate}
              ${formatUsd(usdAmount)}
            {:else}
              —
            {/if}
          </td>
        </tr>
        {#if hasRate}
          <tr>
            <td class="text-black pr-2 py-0.5 pb-2">Conversion Rate:</td>
            <td class="font-medium tabular-nums text-right">
              {formatRate(rate)} ADA/USD
            </td>
          </tr>
        {/if}
      </tbody>
      <tfoot>
        <tr>
          <td
            colspan="2"
            class="text-muted-foreground pt-2 border-t border-border"
          >
            <span class="font-medium">Note:</span>
            The USD equivalent is calculated using the individual conversion rate
            set by the proposer for this proposal.
          </td>
        </tr>
      </tfoot>
    </table>
  </Popover.Content>
</Popover.Root>

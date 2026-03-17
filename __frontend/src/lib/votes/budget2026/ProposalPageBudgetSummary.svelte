<script>
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import ItemContainer from "./ItemContainer.svelte";
  import Markdown from "$lib/base/Markdown.svelte";
  import { formatAda, formatUsd } from "$lib/utils.js";

  let { proposal } = $props();

  const treasuryRepayment = $derived(
    proposal?.metaData?.treasuryRepayment ?? "",
  );
  const treasuryRepaymentCircumstances = $derived(
    proposal?.metaData?.treasuryRepaymentCircumstances ?? "",
  );
  const priorFunding = $derived(proposal?.metaData?.priorFunding ?? "");

  const workPackages = $derived(
    proposal?.metaData?.proposalDetails?.workPackages ?? [],
  );

  /** Per–work package total ADA from budgetBreakdown. */
  const wpTotals = $derived.by(() => {
    const list = Array.isArray(workPackages) ? workPackages : [];
    return list.map((wp) => {
      const rows = Array.isArray(wp?.budgetBreakdown) ? wp.budgetBreakdown : [];
      let total = 0;
      for (const row of rows) {
        const t =
          row.total ?? Number(row.quantity || 0) * Number(row.unitPrice || 0);
        if (Number.isFinite(t)) total += t;
      }
      return total;
    });
  });

  const conversionRateNum = $derived.by(() => {
    const v =
      proposal?.metaData?.proposalDetails?.conversionRate ??
      proposal?.metaData?.conversionRate ??
      proposal?.metaData?.financialAndAdministrative?.conversionRate;
    if (v == null || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  });

  /** Summary rows for budget summary table (same as form). */
  const summaryRows = $derived.by(() => {
    const list = Array.isArray(workPackages) ? workPackages : [];
    const rate = conversionRateNum;
    return list.map((wp, idx) => {
      const totalAda = wpTotals[idx] ?? 0;
      const totalUsd = rate != null ? totalAda * rate : null;
      return {
        title: (wp?.name ?? "").toString() || "—",
        totalAda,
        totalUsd,
      };
    });
  });

  const hasContent = $derived(workPackages.length > 0);

  const grandTotalAda = $derived(
    wpTotals.reduce((sum, t) => sum + (t ?? 0), 0),
  );
  const administrator = $derived(proposal?.metaData?.administrator ?? "");
  const isIntersect = $derived(
    administrator === "Intersect" || administrator === "Yes",
  );
  const adminFeeAda = $derived(Math.round(grandTotalAda * 0.03));
  const totalWithFeeAda = $derived(Math.round(grandTotalAda * 1.03));
  const adminFeeUsd = $derived(
    conversionRateNum != null ? adminFeeAda * conversionRateNum : null,
  );
  const totalWithFeeUsd = $derived(
    conversionRateNum != null ? totalWithFeeAda * conversionRateNum : null,
  );
  const totalDisplayAda = $derived(
    isIntersect ? totalWithFeeAda : Math.round(grandTotalAda),
  );
  const totalDisplayUsd = $derived(
    isIntersect
      ? totalWithFeeUsd
      : conversionRateNum != null
        ? totalDisplayAda * conversionRateNum
        : null,
  );
</script>

<section id="budget-summary" class="mt-12">
  <div class="flex items-center gap-2 flex-wrap mb-4">
    <h2 class="text-2xl font-medium">Budget Summary</h2>
  </div>
  {#if hasContent}
    <Card.Root class="bg-slate-50 py-0">
      <Card.Content class="p-4">
        <div class="rounded-md border overflow-x-auto bg-white">
          <table class="w-full caption-bottom text-sm border-collapse">
            <thead class="text-xs">
              <tr class="border-b transition-colors hover:bg-muted/50">
                <th class="h-9 px-3 text-left align-middle font-medium">
                  Work Package
                </th>
                <th
                  class="h-9 px-3 text-right align-middle font-medium tabular-nums whitespace-nowrap"
                >
                  ADA Cost
                </th>
                <th
                  class="h-9 px-3 text-right align-middle font-medium tabular-nums whitespace-nowrap"
                >
                  USD Equiv.*
                </th>
              </tr>
            </thead>
            <tbody>
              {#each summaryRows as row}
                <tr class="border-b transition-colors hover:bg-muted/50">
                  <td class="p-3 align-top font-medium">{row.title}</td>
                  <td class="p-3 text-right align-top tabular-nums">
                    {formatAda(row.totalAda)}
                  </td>
                  <td class="p-3 text-right align-top tabular-nums">
                    {row.totalUsd != null ? "$" + formatUsd(row.totalUsd) : "—"} (ADA/USD
                    {conversionRateNum})
                  </td>
                </tr>
              {/each}
            </tbody>
            <tfoot>
              {#if isIntersect}
                <tr class="bg-(--mbo-tangy-blue) text-white font-medium">
                  <td class="p-3 font-medium"
                    >Intersect Budget Administration fee</td
                  >
                  <td class="p-3 text-right tabular-nums">
                    {formatAda(adminFeeAda)}
                  </td>
                  <td class="p-3 text-right tabular-nums">
                    {adminFeeUsd != null ? "$" + formatUsd(adminFeeUsd) : "—"} (ADA/USD
                    {conversionRateNum})
                  </td>
                </tr>
              {/if}
              <tr class="bg-(--mbo-cardano-blue) text-white font-medium">
                <td class="p-3 font-medium">Total budget</td>
                <td class="p-3 text-right tabular-nums">
                  {formatAda(totalDisplayAda)}
                </td>
                <td class="p-3 text-right tabular-nums">
                  {totalDisplayUsd != null
                    ? "$" + formatUsd(totalDisplayUsd)
                    : "—"} (ADA/USD {conversionRateNum})
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- <div class="text-xs text-muted-foreground mt-2">
          *This proposer has specified a {conversionRateNum != null
            ? "$" + formatUsd(conversionRateNum)
            : "—"} USD/ADA currency conversion rate (for estimate purposes only)
        </div> -->

        {#if treasuryRepayment === "Yes"}
          <section class="mt-4 space-y-4">
            <h3 class="text-lg font-medium text-(--mbo-cardano-blue)">
              Repayment Circumstances
            </h3>
            <ItemContainer>
              <div class="text-sm">
                <Markdown
                  content={treasuryRepaymentCircumstances.trim() || "—"}
                />
              </div>
            </ItemContainer>
          </section>
        {/if}

        <section class="mt-6 space-y-2">
          <h3 class="text-lg font-medium text-(--mbo-cardano-blue)">
            Prior Funding
          </h3>
          <ItemContainer>
            <div class="text-sm">
              <Markdown content={priorFunding.trim() || "—"} />
            </div>
          </ItemContainer>
        </section>
      </Card.Content>
    </Card.Root>
  {/if}
</section>

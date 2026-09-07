<script>
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import CollapsibleCard from "$lib/components/CollapsibleCard.svelte";
  import ItemContainer from "./ItemContainer.svelte";
  import Markdown from "$lib/base/Markdown.svelte";
  import { formatAda, formatUsd } from "$lib/utils.js";

  let { proposal } = $props();
  let expandedPriorFunding = $state(true);
  let expandedTreasuryRepayment = $state(true);

  const treasuryRepayment = $derived(proposal?.metaData?.treasuryRepayment ?? "");
  const treasuryRepaymentCircumstances = $derived(
    proposal?.metaData?.treasuryRepaymentCircumstances ?? "",
  );
  const priorFunding = $derived(proposal?.metaData?.priorFunding ?? "");

  const workPackages = $derived(proposal?.metaData?.proposalDetails?.workPackages ?? []);

  /** Per–work package total ADA from budgetBreakdown. */
  const wpTotals = $derived.by(() => {
    const list = Array.isArray(workPackages) ? workPackages : [];
    return list.map((wp) => {
      const rows = Array.isArray(wp?.budgetBreakdown) ? wp.budgetBreakdown : [];
      let total = 0;
      for (const row of rows) {
        const t = row.total ?? Number(row.quantity || 0) * Number(row.unitPrice || 0);
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

  /** Detailed budget items per work package. */
  const workPackageBudgetItems = $derived.by(() => {
    const list = Array.isArray(workPackages) ? workPackages : [];
    const rate = conversionRateNum;
    return list.map((wp, idx) => {
      const rows = Array.isArray(wp?.budgetBreakdown) ? wp.budgetBreakdown : [];
      const title = (wp?.name ?? "").toString() || `Work package ${idx + 1}`;
      const items = rows.map((row) => {
        const quantity = Number(row?.quantity || 0);
        const unitPrice = Number(row?.unitPrice || 0);
        const rawTotal =
          row?.total ??
          (Number.isFinite(quantity) && Number.isFinite(unitPrice) ? quantity * unitPrice : 0);
        const totalAda = Number.isFinite(rawTotal) ? rawTotal : 0;
        const totalUsd = rate != null ? totalAda * rate : null;
        return {
          name: (row?.name ?? "").toString() || "—",
          category: (row?.costCategory ?? "").toString() || "—",
          totalAda,
          totalUsd,
        };
      });

      return {
        title,
        items,
      };
    });
  });

  const hasContent = $derived(workPackages.length > 0);

  const grandTotalAda = $derived(wpTotals.reduce((sum, t) => sum + (t ?? 0), 0));
  const administrator = $derived(proposal?.metaData?.administrator ?? "");
  const isIntersect = $derived(administrator === "Intersect" || administrator === "Yes");
  const adminFeeAda = $derived(Math.round(grandTotalAda * 0.03));
  const totalWithFeeAda = $derived(Math.round(grandTotalAda * 1.03));
  const adminFeeUsd = $derived(conversionRateNum != null ? adminFeeAda * conversionRateNum : null);
  const totalWithFeeUsd = $derived(
    conversionRateNum != null ? totalWithFeeAda * conversionRateNum : null,
  );
  const totalDisplayAda = $derived(isIntersect ? totalWithFeeAda : Math.round(grandTotalAda));
  const totalDisplayUsd = $derived(
    isIntersect
      ? totalWithFeeUsd
      : conversionRateNum != null
        ? totalDisplayAda * conversionRateNum
        : null,
  );
</script>

<section id="budget-summary" class="mt-12">
  <div class="mb-4 flex flex-wrap items-center gap-2">
    <h2>Budget Summary</h2>
  </div>
  {#if hasContent}
    <Card.Root class="bg-slate-50 py-0">
      <Card.Content class="p-4">
        <div class="overflow-x-auto rounded-md border bg-white">
          <table class="w-full caption-bottom border-collapse text-sm">
            <thead class="text-xs">
              <tr class="text-muted-foreground hover:bg-muted/50 transition-colors">
                <th class="h-9 px-3 text-left align-middle font-medium"> Work Package / Item </th>
                <th class="h-9 px-3 text-left align-middle font-medium whitespace-nowrap">
                  Cost Category
                </th>
                <th
                  class="h-9 px-3 text-right align-middle font-medium whitespace-nowrap tabular-nums"
                >
                  Total Cost
                </th>
              </tr>
            </thead>
            <tbody>
              {#each summaryRows as row, idx}
                {@const wp = workPackageBudgetItems[idx]}
                <tr class="border-t-2 border-b border-t-(--mbo-cardano-blue) bg-slate-200">
                  <td class="p-3 align-top font-medium" colspan="2">
                    <a href={`#work-package-${idx + 1}`} class="cursor-pointer underline">
                      {row.title}
                    </a>
                  </td>
                  <td class="p-3 text-right align-top whitespace-nowrap tabular-nums">
                    <span class="font-medium">
                      {formatAda(row.totalAda)} ADA
                    </span>
                    <br />
                    <span class="text-muted-foreground text-xs">
                      {row.totalUsd != null ? "$" + formatUsd(row.totalUsd) : "—"} (ADA/USD
                      {conversionRateNum})
                    </span>
                  </td>
                </tr>
                {#if wp && wp.items.length}
                  {#each wp.items as item}
                    <tr class="border-b last:border-b-0">
                      <td class="px-3 py-2 align-top text-xs">
                        <span class="inline-flex items-start gap-1">
                          <span class="mt-1.5 mr-0.5 h-1 w-1 shrink-0 bg-black" aria-hidden="true"
                          ></span>
                          <span class="leading-snug font-medium">
                            {item.name}
                          </span>
                        </span>
                      </td>
                      <td class="px-3 py-2 align-top text-xs">
                        {item.category}
                      </td>
                      <td class="px-3 py-2 text-right align-top text-xs tabular-nums">
                        {formatAda(item.totalAda)} ADA
                        <br />
                        <span class="text-muted-foreground text-[11px]">
                          {item.totalUsd != null ? "$" + formatUsd(item.totalUsd) : "—"}
                          (ADA/USD
                          {conversionRateNum})
                        </span>
                      </td>
                    </tr>
                  {/each}
                {/if}
              {/each}
            </tbody>
            <tfoot>
              {#if isIntersect}
                <tr
                  class="border-t-2 border-t-(--mbo-cardano-blue) bg-[#B5C0FF] font-medium text-(--mbo-cardano-blue)"
                >
                  <td class="p-3" colspan="3">
                    <div class="flex items-baseline justify-between gap-2">
                      <span class="font-medium"> Intersect Budget Administration fee </span>
                      <span class="text-right tabular-nums">
                        {formatAda(adminFeeAda)} ADA
                        <br />
                        <span class="text-xs text-(--mbo-cardano-blue)/60">
                          {adminFeeUsd != null ? "$" + formatUsd(adminFeeUsd) : "—"} (ADA/USD {conversionRateNum})
                        </span>
                      </span>
                    </div>
                  </td>
                </tr>
              {/if}
              <tr class="bg-(--mbo-cardano-blue) font-medium text-white">
                <td class="p-3" colspan="3">
                  <div class="flex items-baseline justify-between gap-2">
                    <span class="font-medium">Total budget</span>
                    <span class="text-right tabular-nums">
                      {formatAda(totalDisplayAda)} ADA
                      <br />
                      <span class="text-xs text-white/50">
                        {totalDisplayUsd != null ? "$" + formatUsd(totalDisplayUsd) : "—"} (ADA/USD {conversionRateNum})
                      </span>
                    </span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card.Content>
    </Card.Root>

    <CollapsibleCard
      class="mt-2"
      expanded={expandedTreasuryRepayment}
      onToggle={() => (expandedTreasuryRepayment = !expandedTreasuryRepayment)}
      expandLabel="Expand treasury repayment details"
      collapseLabel="Collapse treasury repayment details"
      titleClass="text-lg font-medium leading-6"
      titleHeadingLevel={3}
    >
      {#snippet title()}
        Will any portion of the requested funds be returned to the Cardano Treasury?
      {/snippet}
      {#snippet popover()}
        If yes: Describe the specific conditions or triggers that would result in funds being
        returned to the Treasury (e.g. surplus funds, revenue thresholds, loan, project
        cancellation).
      {/snippet}
      {#if treasuryRepayment === "Yes"}
        <Badge
          class="mb-4 shrink-0 border-0 bg-(--mbo-cardano-blue) text-xs font-normal text-white"
        >
          Yes
        </Badge>

        <h4 class="mb-4">Under what circumstances would a repayment occur?</h4>

        <Markdown content={treasuryRepaymentCircumstances.trim() || "—"} class="text-sm" />
      {:else}
        <Badge
          class="mb-4 shrink-0 border-0 bg-(--mbo-cardano-blue) text-xs font-normal text-white"
        >
          No
        </Badge>
      {/if}
    </CollapsibleCard>

    <CollapsibleCard
      class="mt-2"
      expanded={expandedPriorFunding}
      onToggle={() => (expandedPriorFunding = !expandedPriorFunding)}
      expandLabel="Expand prior funding details"
      collapseLabel="Collapse prior funding details"
      titleClass="text-lg font-medium leading-6"
      titleHeadingLevel={3}
    >
      {#snippet title()}
        Have you previously received funding from Cardano or related ecosystem programs?
      {/snippet}
      {#snippet popover()}
        List any prior funding received from Catalyst, Treasury withdrawals, Intersect programs, or
        other Cardano ecosystem grants. If not applicable, you may enter “N/A”.
      {/snippet}
      <ItemContainer>
        <div class="text-sm">
          <Markdown content={priorFunding.trim() || "—"} />
        </div>
      </ItemContainer>
    </CollapsibleCard>
  {/if}
</section>

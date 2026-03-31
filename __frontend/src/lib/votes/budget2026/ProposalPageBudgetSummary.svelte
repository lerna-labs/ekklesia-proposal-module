<script>
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import ItemContainer from "./ItemContainer.svelte";
  import Markdown from "$lib/base/Markdown.svelte";
  import { formatAda, formatUsd } from "$lib/utils.js";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";

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
          (Number.isFinite(quantity) && Number.isFinite(unitPrice)
            ? quantity * unitPrice
            : 0);
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
              <tr
                class="text-muted-foreground transition-colors hover:bg-muted/50"
              >
                <th class="h-9 px-3 text-left align-middle font-medium">
                  Work Package / Item
                </th>
                <th
                  class="h-9 px-3 text-left align-middle font-medium whitespace-nowrap"
                >
                  Cost Category
                </th>
                <th
                  class="h-9 px-3 text-right align-middle font-medium tabular-nums whitespace-nowrap"
                >
                  Total Cost
                </th>
              </tr>
            </thead>
            <tbody>
              {#each summaryRows as row, idx}
                {@const wp = workPackageBudgetItems[idx]}
                <tr
                  class="border-b bg-[#E7E9F5] border-t-2 border-t-(--mbo-cardano-blue)"
                >
                  <td class="p-3 align-top font-medium" colspan="2">
                    <a
                      href={`#work-package-${idx + 1}`}
                      class="underline cursor-pointer"
                    >
                      {row.title}
                    </a>
                  </td>
                  <td class="p-3 text-right align-top tabular-nums">
                    <span class="font-medium">
                      {formatAda(row.totalAda)} ADA
                    </span>
                    <br />
                    <span class="text-xs text-muted-foreground">
                      {row.totalUsd != null
                        ? "$" + formatUsd(row.totalUsd)
                        : "—"} (ADA/USD
                      {conversionRateNum})
                    </span>
                  </td>
                </tr>
                {#if wp && wp.items.length}
                  {#each wp.items as item}
                    <tr class="border-b last:border-b-0">
                      <td class="px-3 py-2 align-top text-xs">
                        <span class="inline-flex items-start gap-1">
                          <span
                            class="w-1 h-1 bg-black shrink-0 mt-1.5 mr-0.5"
                            aria-hidden="true"
                          ></span>
                          <span class="font-medium leading-snug">
                            {item.name}
                          </span>
                        </span>
                      </td>
                      <td class="px-3 py-2 align-top text-xs">
                        {item.category}
                      </td>
                      <td
                        class="px-3 py-2 text-right align-top tabular-nums text-xs"
                      >
                        {formatAda(item.totalAda)} ADA
                        <br />
                        <span class="text-[11px] text-muted-foreground">
                          {item.totalUsd != null
                            ? "$" + formatUsd(item.totalUsd)
                            : "—"}
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
                  class="bg-[#B5C0FF] text-(--mbo-cardano-blue) font-medium border-t-2 border-t-(--mbo-cardano-blue)"
                >
                  <td class="p-3" colspan="3">
                    <div class="flex items-baseline justify-between gap-2">
                      <span class="font-medium">
                        Intersect Budget Administration fee
                      </span>
                      <span class="text-right tabular-nums">
                        {formatAda(adminFeeAda)} ADA
                        <br />
                        <span class="text-xs text-(--mbo-cardano-blue)/60">
                          {adminFeeUsd != null
                            ? "$" + formatUsd(adminFeeUsd)
                            : "—"} (ADA/USD {conversionRateNum})
                        </span>
                      </span>
                    </div>
                  </td>
                </tr>
              {/if}
              <tr class="bg-(--mbo-cardano-blue) text-white font-medium">
                <td class="p-3" colspan="3">
                  <div class="flex items-baseline justify-between gap-2">
                    <span class="font-medium">Total budget</span>
                    <span class="text-right tabular-nums">
                      {formatAda(totalDisplayAda)} ADA
                      <br />
                      <span class="text-xs text-white/50">
                        {totalDisplayUsd != null
                          ? "$" + formatUsd(totalDisplayUsd)
                          : "—"} (ADA/USD {conversionRateNum})
                      </span>
                    </span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <section class="space-y-4 mt-8">
          <h3 class="text-lg font-medium text-(--mbo-cardano-blue)">
            Will any portion of the requested funds be returned to the Cardano
            Treasury?
          </h3>

          {#if treasuryRepayment === "Yes"}
            <Badge
              class="shrink-0 font-normal text-xs bg-(--mbo-cardano-blue) text-white border-0 mb-4"
            >
              Yes
            </Badge>

            <h3 class="text-lg font-medium text-(--mbo-cardano-blue)">
              Under what circumstances would a repayment occur?
            </h3>

            <Markdown
              content={treasuryRepaymentCircumstances.trim() || "—"}
              class="text-sm"
            />
          {:else}
            <Badge
              class="shrink-0 font-normal text-xs bg-(--mbo-cardano-blue) text-white border-0 mb-4"
            >
              No
            </Badge>
          {/if}
        </section>

        <section class="mt-6 space-y-2">
          <h3 class="text-lg font-medium text-(--mbo-cardano-blue)">
            Have you previously received funding from Cardano or related
            ecosystem programs?
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

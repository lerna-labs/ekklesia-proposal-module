<script>
  /** @see __frontend/docs/budget2026/form-budget-summary.md Version: 1.0.0 */
  import RadioGroup from "$lib/components/form/RadioGroup.svelte";
  import Textarea from "$lib/components/form/Textarea.svelte";
  import { formatAda, formatUsd } from "$lib/utils.js";
  let { formData = $bindable(), vote, proposal, validationErrors } = $props();

  const workPackages = $derived(
    formData.metaData?.proposalDetails?.workPackages ?? [],
  );
  const conversionRateNum = $derived.by(() => {
    const v = formData.metaData?.proposalDetails?.conversionRate;
    if (v == null || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  });
  const summaryRows = $derived.by(() => {
    const list = Array.isArray(workPackages) ? workPackages : [];
    const rate = conversionRateNum;
    return list.map((wp) => {
      const rows = Array.isArray(wp?.budgetBreakdown) ? wp.budgetBreakdown : [];
      let totalAda = 0;
      for (const row of rows) {
        const t = row.total ?? Number(row.quantity) * Number(row.unitPrice);
        if (Number.isFinite(t)) totalAda += t;
      }
      const totalUsd = rate != null ? totalAda * rate : null;
      return {
        title: (wp?.name ?? "").toString() || "—",
        totalAda,
        totalUsd,
      };
    });
  });
  const grandTotalAda = $derived(
    summaryRows.reduce((sum, r) => sum + r.totalAda, 0),
  );
  const grandTotalUsd = $derived(
    conversionRateNum != null ? grandTotalAda * conversionRateNum : null,
  );

  const administrator = $derived(formData.metaData?.administrator ?? "");
  const isIntersect = $derived(administrator === "Intersect");
  // When Intersect: 3% admin fee and total with fee (whole ADA)
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

  const metaErrors = $derived(
    validationErrors?.properties?.metaData?.properties ?? {},
  );
  const treasuryRepaymentErrors = $derived({
    properties: { treasuryRepayment: metaErrors.treasuryRepayment },
  });
  const treasuryRepaymentCircumstancesErrors = $derived({
    properties: {
      treasuryRepaymentCircumstances: metaErrors.treasuryRepaymentCircumstances,
    },
  });
  const priorFundingErrors = $derived({
    properties: { priorFunding: metaErrors.priorFunding },
  });
</script>

{#if workPackages.length > 0}
  <p class="mb-4 text-muted-foreground">
    Please review if all the details in the summary of your budget are correct
    before going to the next step.
  </p>
  <div class="rounded-md border overflow-x-auto mb-8 bg-white">
    <table class="w-full caption-bottom text-xs border-collapse">
      <thead>
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
            USD Equiv.
          </th>
        </tr>
      </thead>
      <tbody>
        {#each summaryRows as row, i (i)}
          <tr class="border-b transition-colors hover:bg-muted/50">
            <td class="p-3 align-top font-medium">{row.title}</td>
            <td class="p-3 text-right align-top tabular-nums">
              {formatAda(row.totalAda)}
            </td>
            <td class="p-3 text-right align-top tabular-nums">
              {row.totalUsd != null ? "$" + formatUsd(row.totalUsd) : "—"}
            </td>
          </tr>
        {/each}
      </tbody>
      <tfoot>
        {#if isIntersect}
          <tr class="bg-(--mbo-tangy-blue) text-white font-medium">
            <td class="p-3 font-medium">Intersect Budget Administration fee</td>
            <td class="p-3 text-right tabular-nums">
              {formatAda(adminFeeAda)}
            </td>
            <td class="p-3 text-right tabular-nums">
              {adminFeeUsd != null ? "$" + formatUsd(adminFeeUsd) : "—"}
            </td>
          </tr>
        {/if}
        <tr class="bg-(--mbo-cardano-blue) text-white font-medium">
          <td class="p-3 font-medium">Total budget</td>
          <td class="p-3 text-right tabular-nums">
            {formatAda(totalDisplayAda)}
          </td>
          <td class="p-3 text-right tabular-nums">
            {totalDisplayUsd != null ? "$" + formatUsd(totalDisplayUsd) : "—"}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
{/if}

<h3>
  Will any portion of the requested funds be returned to the Cardano Treasury?
</h3>

<p class="text-muted-foreground">
  Select whether your proposal includes any form of treasury repayment (for
  example, unused funds, profit-sharing, or conditional returns).
</p>

<RadioGroup
  id="treasuryRepayment"
  bind:value={formData.metaData.treasuryRepayment}
  label="Treasury Repayment"
  description="Indicate whether any portion of the requested funds may be returned to the Cardano Treasury under any circumstances."
  required
  options={[
    { value: "Yes", label: "Yes" },
    { value: "No", label: "No" },
  ]}
  validationErrors={treasuryRepaymentErrors}
  class="mb-8"
/>

{#if formData.metaData.treasuryRepayment === "Yes"}
  <h3>Under what circumstances would a repayment occur?</h3>

  <p class="text-muted-foreground">
    Describe the specific conditions or triggers that would result in funds
    being returned to the Treasury (e.g. surplus funds, revenue thresholds,
    loan, project cancellation).
  </p>

  <Textarea
    id="treasuryRepaymentCircumstances"
    bind:value={formData.metaData.treasuryRepaymentCircumstances}
    label="Repayment Circumstances"
    description="If repayment applies, describe the specific conditions under which funds would be returned to the Treasury."
    placeholder="Enter Explanation"
    maxLength={10000}
    required
    validationErrors={treasuryRepaymentCircumstancesErrors}
    class="mb-8"
  />
{/if}

<h3>
  Have you previously received funding from Cardano or related ecosystem
  programs?
</h3>

<p class="text-muted-foreground">
  List any prior funding received from Catalyst, Treasury withdrawals, Intersect
  programs, or other Cardano ecosystem grants. If not applicable, you may enter
  “N/A”.
</p>

<Textarea
  id="priorFunding"
  bind:value={formData.metaData.priorFunding}
  label="Prior Funding"
  description="List any funds previously received from Catalyst, Treasury, or other ecosystem grants."
  placeholder="Enter Details or N/A"
  required
  maxLength={10000}
  validationErrors={priorFundingErrors}
  class="mb-8"
/>

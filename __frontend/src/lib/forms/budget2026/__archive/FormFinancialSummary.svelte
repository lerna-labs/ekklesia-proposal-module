<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import AmountInput from "$lib/form/AmountInput.svelte";
  import ToolTip from "$lib/form/ToolTip.svelte";
  import { formatAda, formatUsd } from "$lib/utils.js";

  const id = "conversionRate";
  let { validationErrors, formData } = $props();

  let schemaError = $derived(validationErrors?.properties?.[id]?.errors?.[0]);

  const rate = $derived(
    Number(formData?.financialAndAdministrative?.conversionRate) || 0,
  );

  /** All budget positions from all work packages (category, budget position description, total). */
  const budgetPositions = $derived.by(() => {
    const out = [];
    const packages = Array.isArray(formData?.executionRoadmap?.workPackages)
      ? formData.executionRoadmap.workPackages
      : [];
    for (const pkg of packages) {
      const rows = Array.isArray(pkg?.budgetBreakdown)
        ? pkg.budgetBreakdown
        : [];
      for (const row of rows) {
        const ada = Number(row?.total ?? row?.quantity * row?.unitPrice);
        if (!Number.isFinite(ada) || ada <= 0) continue;
        out.push({
          category: row?.costCategory ?? "Other",
          description: (row?.description ?? "").trim() || "—",
          totalAda: ada,
        });
      }
    }
    return out;
  });

  const grandTotalAda = $derived(
    budgetPositions.reduce((s, r) => s + r.totalAda, 0),
  );
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Financial Summary: Cost Category Breakdown</Card.Title>
  </Card.Header>
  <Card.Content>
    <Field.Field class="gap-4">
      <div class="flex flex-wrap items-end gap-4">
        <div class="flex flex-col gap-2 min-w-[200px] w-full max-w-sm">
          <div class="flex items-center gap-1 w-full">
            <Field.Label
              for={id}
              class="flex gap-0 mb-0 pb-0 text-sm shrink-0 w-fit"
            >
              ADA/USD conversion rate
              <span class="text-(--mbo-electric-blue)">*</span>
            </Field.Label>
            <ToolTip
              content="Rate used to convert ADA amounts to USD in the financial summary. Must be greater than 0."
            />
            <span class="flex-1 min-w-0" aria-hidden="true"></span>
          </div>
          <AmountInput
            {id}
            prefix="$"
            suffix="/ ADA"
            bind:value={formData.financialAndAdministrative.conversionRate}
            placeholder="0.25"
            decimalComma={true}
            invalid={!!schemaError}
            min="0"
            step="any"
            class="bg-white"
          />
          {#if schemaError}
            <Field.Error class="text-xs">{schemaError}</Field.Error>
          {/if}
        </div>
      </div>

      {#if budgetPositions.length > 0}
        <div class="overflow-x-auto rounded-md border border-input mt-2">
          <table
            class="w-full text-left text-sm [&_th]:align-top [&_td]:align-top"
          >
            <thead class="bg-muted">
              <tr class="border-b border-input">
                <th class="p-2 font-medium whitespace-nowrap">Cost category</th>
                <th class="p-2 font-medium whitespace-nowrap">Description</th>
                <th class="p-2 font-medium text-right whitespace-nowrap">
                  Total (ADA)
                </th>
                <th class="p-2 font-medium text-right whitespace-nowrap">
                  Total (USD)
                </th>
              </tr>
            </thead>
            <tbody>
              {#each budgetPositions as pos, i (i)}
                <tr class="border-b border-input last:border-0">
                  <td class="p-2">{pos.category}</td>
                  <td class="p-2 text-muted-foreground text-xs max-w-xs">
                    {pos.description}
                  </td>
                  <td class="p-2 text-right tabular-nums">
                    {formatAda(pos.totalAda)}
                  </td>
                  <td class="p-2 text-right tabular-nums">
                    {formatUsd(pos.totalAda * rate)}
                  </td>
                </tr>
              {/each}
              <tr
                class="border-t-0 border-input font-medium bg-(--mbo-tangy-blue) text-white uppercase"
              >
                <td class="p-2" colspan="2">Total Project Requirement</td>
                <td class="p-2 text-right tabular-nums">
                  {formatAda(grandTotalAda)}
                </td>
                <td class="p-2 text-right tabular-nums">
                  {formatUsd(grandTotalAda * rate)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      {:else}
        <p class="text-sm text-muted-foreground mt-2">
          Add budget positions in work packages above to see the accumulated
          financial summary here.
        </p>
      {/if}
    </Field.Field>
  </Card.Content>
</Card.Root>

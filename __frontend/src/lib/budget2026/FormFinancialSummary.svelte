<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import AmountInput from "$lib/form/AmountInput.svelte";
  import ToolTip from "$lib/form/ToolTip.svelte";
  import { COST_CATEGORIES, COST_CATEGORIES_LIST } from "./Schema.js";
  import { formatAda, formatUsd } from "$lib/utils.js";

  const id = "conversionRate";
  let { formSchema, validationErrors, formData } = $props();

  let label = $derived(formSchema?.shape?.[id]?.meta()?.label);
  let schemaMeta = $derived(formSchema?.shape?.[id]?.meta());
  let schemaRequired = $derived(
    formSchema?.shape?.[id]?.meta()?.required ?? false,
  );
  let schemaError = $derived(validationErrors?.properties?.[id]?.errors?.[0]);

  const rate = $derived(Number(formData?.financialAndAdministrative?.conversionRate) || 0);

  /** Aggregate total by cost category from all work packages (metaData.executionRoadmap.workPackages). */
  const byCategory = $derived.by(() => {
    const map = /** @type {Record<string, number>} */ ({});
    const packages = Array.isArray(formData?.executionRoadmap?.workPackages)
      ? formData.executionRoadmap.workPackages
      : [];
    for (const pkg of packages) {
      const rows = Array.isArray(pkg?.budgetBreakdown) ? pkg.budgetBreakdown : [];
      for (const row of rows) {
        const cat = row?.costCategory ?? "Other";
        const ada = Number(row?.total ?? row?.quantity * row?.unitPrice);
        if (!Number.isFinite(ada)) continue;
        map[cat] = (map[cat] ?? 0) + ada;
      }
    }
    return map;
  });

  /** Sorted categories: COST_CATEGORIES order, then any extra keys. */
  const categoriesWithTotals = $derived.by(() => {
    const seen = new Set(Object.keys(byCategory));
    const ordered = [
      ...COST_CATEGORIES.filter((c) => seen.has(c)),
      ...Object.keys(byCategory).filter((c) => !COST_CATEGORIES.includes(c)),
    ];
    return ordered
      .filter((c) => (byCategory[c] ?? 0) > 0)
      .map((cat) => ({ category: cat, totalAda: byCategory[cat] ?? 0 }));
  });

  const grandTotalAda = $derived(
    categoriesWithTotals.reduce((s, r) => s + r.totalAda, 0),
  );

  /** Lookup category name -> description from costCategories.json */
  const categoryDescription = $derived.by(() => {
    const map = /** @type {Record<string, string>} */ ({});
    for (const { name, description } of COST_CATEGORIES_LIST) {
      map[name] = description ?? "";
    }
    return map;
  });

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
              {label}
              {#if schemaRequired}
                <span class="text-(--mbo-electric-blue)">*</span>
              {/if}
            </Field.Label>
            {#if schemaMeta?.description}
              <ToolTip content={schemaMeta.description} />
            {/if}
            <span class="flex-1 min-w-0" aria-hidden="true"></span>
          </div>
          <AmountInput
            {id}
            prefix="$"
            suffix="/ ADA"
            bind:value={formData.financialAndAdministrative.conversionRate}
            placeholder={schemaMeta?.placeholder ?? "0.25"}
            decimalComma={true}
            invalid={!!schemaError}
            min="0"
            step="any"
            class="bg-white"
          />
          {#if schemaMeta?.description}
            <Field.Description class="text-xs text-muted-foreground">
              {schemaMeta.description}
            </Field.Description>
          {/if}
          {#if schemaError}
            <Field.Error class="text-xs">{schemaError}</Field.Error>
          {/if}
        </div>
      </div>

      {#if categoriesWithTotals.length > 0}
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
              {#each categoriesWithTotals as { category, totalAda } (category)}
                <tr class="border-b border-input last:border-0">
                  <td class="p-2">{category}</td>
                  <td class="p-2 text-muted-foreground text-xs max-w-xs">
                    {categoryDescription[category] || "—"}
                  </td>
                  <td class="p-2 text-right tabular-nums">
                    {formatAda(totalAda)}
                  </td>
                  <td class="p-2 text-right tabular-nums">
                    {formatUsd(totalAda * rate)}
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

<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import ToolTip from "$lib/form/ToolTip.svelte";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import Editor from "$lib/editor/Editor.svelte";

  let {
    id,
    category,
    categories,
    formSchema,
    validationErrors,
    description,
    onUpdate,
    value = $bindable(),
    class: className,
  } = $props();

  const target = [
    {
      title: "Total Value Locked (TVL)",
      description: "2030 Target: $3B",
    },
    {
      title: "Monthly transactions",
      description: "2030 Target: ≥ 27M tx/month",
    },
    {
      title: "Monthly Active Users (MAU)",
      description: "2030 Target: 1M unique wallets",
    },
    {
      title: "Monthly (6 epochs) UpTime",
      description: "2030 Target: 99.98% Uptime",
    },
    {
      title: "Voting Power distribution",
      description: "2030 Target: 50%+1 power controlled by > 22 DReps",
    },
    {
      title: "Alternative full node clients",
      description: "2030 Target: ≥ 2 live clients",
    },
    {
      title: "Annual Protocol Revenue",
      description: "2030 Target: ≥ 16M ADA",
    },
    {
      title: "DRep participation rate",
      description: "2030 Target: > 70% active vote rate",
    },
    {
      title: "Throughput capacity per day",
      description: "2030 Target: 3x current capacity",
    },
  ];

  let label = $derived(formSchema.shape[id]?.meta()?.label);
  let schemaMeta = $derived(formSchema.shape[id]?.meta());
  let schemaRequired = $derived(
    formSchema.shape[id]?.meta()?.required ? true : false,
  );
  let schemaError = $derived(
    validationErrors?.properties?.[id]?.errors?.[0],
  );
  function getContributionError(index) {
    return validationErrors?.properties?.kpis?.items?.[index]?.properties
      ?.contributionStrategy?.errors?.[0];
  }
  const categoryData = $derived(categories.find((c) => c._id === category));
  const kpis = $derived(categoryData?.metaData?.kpis ?? []);

  // TODO: Alert if a KPI with already filled out text is removed
  function toggleKpi(kpiTitle) {
    const list = Array.isArray(value) ? [...value] : [];
    const i = list.findIndex((item) => item?.title === kpiTitle);
    if (i === -1) list.push({ title: kpiTitle, contributionStrategy: "" });
    else list.splice(i, 1);
    value = list;
    onUpdate(value);
  }

  function isSelected(kpiTitle) {
    return (
      Array.isArray(value) && value.some((item) => item?.title === kpiTitle)
    );
  }

  // TODO: Validate custom KPI and make sure no duplicates are created
  let customKpi = $state("");
  function addCustomKpi() {
    const trimmed = customKpi.trim();
    if (!trimmed) return;
    const list = Array.isArray(value) ? [...value] : [];
    if (list.some((item) => item?.title === trimmed)) return;
    list.push({ title: trimmed, contributionStrategy: "" });
    value = list;
    onUpdate(value);
    customKpi = "";
  }
</script>

<Field.Set>
  <Field.Group class="gap-4">
    <Field.Field class={className}>
      <div class="flex items-center gap-1">
        <Field.Label
          for={id}
          class="flex gap-0 mb-0 pb-0 text-sm shrink-0 w-fit"
        >
          {label}
          {#if schemaRequired}
            <span>*</span>
          {/if}
        </Field.Label>
        <div class="flex items-center gap-1 justify-between w-full">
          {#if schemaMeta?.description}
            <ToolTip content={schemaMeta.description} />
          {/if}
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        {#each kpis as kpi}
          {@const selected = isSelected(kpi)}
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="text-xs cursor-pointer no-select {selected ? 'active' : ''}"
            onclick={() => toggleKpi(kpi)}
          >
            {kpi}
          </Button>
        {/each}
        <!-- add custom kpis from the value array -->
        {#each (Array.isArray(value) ? value : []).filter((item) => item?.title && !kpis.includes(item.title)) as kpiItem (kpiItem.title)}
          {@const selected = isSelected(kpiItem.title)}
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="text-xs cursor-pointer no-select {selected ? 'active' : ''}"
            onclick={() => toggleKpi(kpiItem.title)}
          >
            {kpiItem.title}
          </Button>
        {/each}
      </div>

      {#if description}
        <Field.Description>{description}</Field.Description>
      {/if}
      {#if schemaError}
        <Field.Error class="text-xs">{schemaError}</Field.Error>
      {/if}
    </Field.Field>
    <Field.Field>
      <div class="flex items-center gap-1">
        <Field.Label
          for="custom-kpi"
          class="flex gap-0 mb-0 pb-0 text-sm shrink-0 w-fit"
        >
          Add Custom KPI
        </Field.Label>
        <div class="flex items-center gap-1 justify-between w-full">
          <ToolTip content="Add additional custom KPIs you intend to impact." />
        </div>
      </div>
      <div class="flex items-center gap-1">
        <Input
          id="custom-kpi"
          bind:value={customKpi}
          placeholder="Add Custom KPI..."
        />
        <Button
          variant="outline"
          class="text-xs cursor-pointer no-select"
          onclick={addCustomKpi}
        >
          Add
        </Button>
      </div>
    </Field.Field>

    <!-- CARDS -->
    {#each value as kpi, index}
      <Field.Field>
        <Card.Root
          class="bg-slate-200/50 {getContributionError(index)
            ? 'border-destructive ring-destructive/20 ring-[3px]'
            : ''}"
        >
          <Card.Header>
            <Card.Title class="flex w-full justify-between items-center gap-2">
              {kpi.title}
              {#if target.find((t) => t.title === kpi.title)}
                <Badge
                  class="text-[0.6rem] bg-(--mbo-sky-blue) text-(--mbo-dark-blue) px-2 py-1"
                >
                  {target.find((t) => t.title === kpi.title)?.description}
                </Badge>
              {/if}
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <Field.Field class="gap-2">
              <div class="flex items-center gap-1">
                <Field.Label
                  for={`contributionStrategy-${index}`}
                  class="flex gap-0 mb-0 pb-0 text-sm shrink-0 w-fit"
                >
                  Contribution Strategy
                  <span>*</span>
                </Field.Label>
                <div class="flex items-center gap-1 justify-between w-full">
                  <ToolTip
                    content="Specific actions and methodologies you will employ to hit the selected KPI targets."
                  />
                </div>
              </div>
              <Editor
                id={`contributionStrategy-${index}`}
                bind:value={kpi.contributionStrategy}
              />
              {#if getContributionError(index)}
                <Field.Error class="text-xs">
                  {getContributionError(index)}
                </Field.Error>
              {/if}
            </Field.Field>
          </Card.Content>
          <Card.Footer>
            <Button
              variant="outline"
              size="sm"
              class="text-xs cursor-pointer no-select"
              onclick={() => toggleKpi(kpi.title)}
            >
              Remove
            </Button>
          </Card.Footer>
        </Card.Root>
      </Field.Field>
    {/each}
  </Field.Group>
</Field.Set>

<style>
  :global(.active) {
    background-color: var(--mbo-tangy-blue);
    color: var(--primary-foreground);
  }
</style>

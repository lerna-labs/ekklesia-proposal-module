<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import ToolTip from "$lib/form/ToolTip.svelte";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import Editor from "$lib/editor/Editor.svelte";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import TrashIcon from "@lucide/svelte/icons/trash-2";
  import target from "./targets.json";

  let {
    id,
    category,
    categories,
    validationErrors,
    description,
    onUpdate,
    value = $bindable(),
    class: className,
  } = $props();

  let schemaError = $derived(validationErrors?.properties?.[id]?.errors?.[0]);
  function getContributionError(index) {
    return validationErrors?.properties?.[id]?.items?.[index]?.properties
      ?.contributionStrategy?.errors?.[0];
  }
  const categoryData = $derived(categories.find((c) => c._id === category));
  const kpis = $derived(categoryData?.metaData?.kpis ?? []);

  let removeKpiDialogOpen = $state(false);
  let kpiToRemove = $state(/** @type {string | null} */ (null));
  function requestRemoveKpi(kpi) {
    const hasContent =
      (kpi.contributionStrategy ?? "").toString().trim().length > 0;
    if (hasContent) {
      kpiToRemove = kpi.kpi;
      removeKpiDialogOpen = true;
    } else {
      toggleKpi(kpi.kpi);
    }
  }
  function confirmRemoveKpi() {
    if (kpiToRemove) toggleKpi(kpiToRemove);
    kpiToRemove = null;
    removeKpiDialogOpen = false;
  }
  function toggleKpi(kpiName) {
    const list = Array.isArray(value) ? [...value] : [];
    const i = list.findIndex((item) => item?.kpi === kpiName);
    if (i === -1) list.push({ kpi: kpiName, contributionStrategy: "" });
    else list.splice(i, 1);
    value = list;
    onUpdate(value);
  }

  function isSelected(kpiName) {
    return (
      Array.isArray(value) && value.some((item) => item?.kpi === kpiName)
    );
  }

  // TODO: Validate custom KPI and make sure no duplicates are created
  let customKpi = $state("");
  let addKpiDialogOpen = $state(false);
  function addCustomKpi() {
    const trimmed = customKpi.trim();
    if (!trimmed) return;
    const list = Array.isArray(value) ? [...value] : [];
    if (list.some((item) => item?.kpi === trimmed)) return;
    list.push({ kpi: trimmed, contributionStrategy: "" });
    value = list;
    onUpdate(value);
    customKpi = "";
    addKpiDialogOpen = false;
  }
</script>

<Field.Set>
  <Field.Group class="gap-4">
    <Field.Field class={className}>
      <div class="flex items-center gap-1 w-full">
        <Field.Label
          for={id}
          class="flex gap-0 mb-0 pb-0 text-sm shrink-0 w-fit"
        >
          Key Performance Indicators
          <span class="text-(--mbo-electric-blue)">*</span>
        </Field.Label>
        <ToolTip content="Select at least one KPI from the focus area and describe how your proposal contributes. Add a contribution strategy for each." />
        <span class="flex-1 min-w-0" aria-hidden="true"></span>
      </div>

      <div class="flex flex-wrap gap-1">
        {#each kpis as kpi}
          {@const selected = isSelected(kpi)}
          <Button
            type="button"
            title={selected ? `Remove: ${kpi}` : `Add: ${kpi}`}
            variant="outline"
            size="sm"
            class="text-xs cursor-pointer no-select {selected ? 'active' : ''}"
            onclick={() =>
              selected
                ? requestRemoveKpi(
                    value.find((x) => x?.kpi === kpi) ?? {
                      kpi: kpi,
                      contributionStrategy: "",
                    },
                  )
                : toggleKpi(kpi)}
          >
            {kpi}
          </Button>
        {/each}
        <!-- add custom kpis from the value array -->
        {#each (Array.isArray(value) ? value : []).filter((item) => item?.kpi && !kpis.includes(item.kpi)) as kpiItem (kpiItem.kpi)}
          {@const selected = isSelected(kpiItem.kpi)}
          <Button
            type="button"
            title={selected
              ? `Remove KPI: ${kpiItem.kpi}`
              : `Add KPI: ${kpiItem.kpi}`}
            variant="outline"
            size="sm"
            class="text-xs cursor-pointer no-select {selected ? 'active' : ''}"
            onclick={() =>
              selected ? requestRemoveKpi(kpiItem) : toggleKpi(kpiItem.kpi)}
          >
            {kpiItem.kpi}
          </Button>
        {/each}
        <Button
          type="button"
          title="Add Custom KPI"
          variant="outline"
          size="sm"
          class="text-xs cursor-pointer no-select inline-flex items-center gap-1"
          onclick={() => (addKpiDialogOpen = true)}
        >
          <PlusIcon class="size-3.5" />
          Add Custom KPI
        </Button>
      </div>

      {#if description}
        <Field.Description>{description}</Field.Description>
      {/if}
      {#if schemaError}
        <Field.Error class="text-xs">{schemaError}</Field.Error>
      {/if}
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
              {kpi.kpi}
              {#if target.find((t) => t.title === kpi.kpi)}
                <Badge
                  class="text-[0.6rem] bg-(--mbo-sky-blue) text-(--mbo-dark-blue) px-2 py-1"
                >
                  {target.find((t) => t.title === kpi.kpi)?.description}
                </Badge>
              {/if}
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <Field.Field class="gap-2">
              <div class="flex items-center gap-1 w-full">
                <Field.Label
                  for={`contributionStrategy-${index}`}
                  class="flex gap-0 mb-0 pb-0 text-sm shrink-0 w-fit"
                >
                  Contribution Strategy
                  <span class="text-(--mbo-electric-blue)">*</span>
                </Field.Label>
                <ToolTip
                  content="Specific actions and methodologies you will employ to hit the selected KPI targets."
                />
                <span class="flex-1 min-w-0" aria-hidden="true"></span>
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
          <Card.Footer clas="mt-0">
            <Button
              title="Remove KPI: {kpi.kpi}"
              variant="outline"
              size="sm"
              class="text-xs cursor-pointer no-select inline-flex items-center gap-1"
              onclick={() => requestRemoveKpi(kpi)}
            >
              <TrashIcon class="size-3.5" />
              Remove KPI
            </Button>
          </Card.Footer>
        </Card.Root>
      </Field.Field>
    {/each}
  </Field.Group>
</Field.Set>

<Dialog.Root bind:open={addKpiDialogOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Add Custom KPI</Dialog.Title>
      <Dialog.Description>
        Add additional custom KPIs you intend to impact.
      </Dialog.Description>
    </Dialog.Header>
    <div class="grid gap-4 py-4">
      <div class="grid gap-2">
        <Field.Field>
          <Field.Label for="custom-kpi-dialog">Custom KPI name</Field.Label>
          <Input
            id="custom-kpi-dialog"
            bind:value={customKpi}
            placeholder="Add Custom KPI..."
            class="bg-white"
          />
        </Field.Field>
      </div>
    </div>
    <Dialog.Footer class="flex gap-2">
      <Button
        type="button"
        variant="outline"
        class="cursor-pointer"
        onclick={() => (addKpiDialogOpen = false)}
      >
        Cancel
      </Button>
      <Button type="button" class="cursor-pointer" onclick={addCustomKpi}>
        Add
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={removeKpiDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Remove KPI</AlertDialog.Title>
      <AlertDialog.Description>
        This KPI has contribution strategy text. Removing it will permanently
        delete that text. Are you sure you want to remove it?
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer class="flex gap-2">
      <AlertDialog.Cancel class="cursor-pointer">Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        class="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
        onclick={confirmRemoveKpi}
      >
        Remove
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<style>
  :global(.active) {
    background-color: var(--mbo-tangy-blue);
    color: var(--primary-foreground);
  }
</style>

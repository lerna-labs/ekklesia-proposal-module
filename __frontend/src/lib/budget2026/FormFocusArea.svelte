<script>
  import { tick } from "svelte";
  import * as Field from "$lib/components/ui/field/index.js";
  import ToolTip from "$lib/form/ToolTip.svelte";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import PillarInfo from "$lib/PillarInfo.svelte";
  let {
    id,
    description,
    value = $bindable(),
    formSchema,
    validationErrors,
    class: className,
    categories,
    onUpdate,
    /** When true, show a confirmation dialog before changing focus area (KPIs will be cleared). */
    hasKpis = false,
  } = $props();

  let confirmChangeOpen = $state(false);
  let pendingCategory = $state(null);
  /** Prevents trigger onfocus from reopening the select after confirm dialog closes. */
  let justClosedConfirm = $state(false);

  function handleValueChange(newValue) {
    if (newValue === value) return;
    open = false;
    if (hasKpis) {
      pendingCategory = newValue;
      confirmChangeOpen = true;
    } else {
      onUpdate?.(newValue);
    }
  }

  async function confirmChangeFocusArea() {
    if (pendingCategory != null) {
      onUpdate?.(pendingCategory);
      pendingCategory = null;
    }
    confirmChangeOpen = false;
    justClosedConfirm = true;
    await tick();
    open = false;
  }

  function cancelChangeFocusArea() {
    pendingCategory = null;
    confirmChangeOpen = false;
  }

  let label = $derived(formSchema?.shape?.[id]?.meta()?.label);
  let schemaMeta = $derived(formSchema?.shape?.[id]?.meta());
  let schemaRequired = $derived(
    formSchema?.shape?.[id]?.meta()?.required ? true : false,
  );
  let schemaError = $derived(validationErrors?.properties?.[id]?.errors?.[0]);

  let items = $derived(
    categories.map((category) => ({
      value: category._id,
      label: category.title,
      pillar: category.metaData.pillar,
    })),
  );

  let pillars = $derived(
    [
      ...new Set(
        categories
          .map((category) => category.metaData.pillar)
          .filter((pillar) => pillar !== null),
      ),
    ].sort((a, b) => a.localeCompare(b)),
  );

  let open = $state(false);
  let searchQuery = $state("");

  const selectedLabel = $derived(
    items.find((item) => item.value === value)?.label ?? "",
  );

  const placeholder = $derived(
    schemaMeta?.placeholder ?? "Select a focus area...",
  );

  const displayValue = $derived(open ? searchQuery : selectedLabel);

  const q = $derived(searchQuery.trim().toLowerCase());
  const filteredPillars = $derived(
    q === ""
      ? pillars
      : pillars.filter((pillar) => {
          const pillarItems = items.filter((item) => item.pillar === pillar);
          return pillarItems.some(
            (item) =>
              item.label.toLowerCase().includes(q) ||
              (item.pillar ?? "").toLowerCase().includes(q),
          );
        }),
  );

  $effect(() => {
    if (!open) searchQuery = "";
  });
</script>

<Field.Field class="gap-2 {className}">
  <div class="flex items-center gap-1 w-full">
    <Field.Label for={id} class="flex gap-0 mb-0 pb-0 text-sm shrink-0 w-fit">
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
  <div
    class="rounded-md border border-input aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:ring-[3px]"
    aria-invalid={schemaError ? true : false}
  >
    {#snippet triggerChild({ props })}
      <div
        {...props}
        class="flex h-9 w-full items-center gap-2 rounded-md border-0 bg-white px-3 py-1 text-base shadow-none outline-none focus-within:ring-[3px] focus-within:ring-ring/50 md:text-sm"
      >
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="category-list"
          aria-autocomplete="list"
          {placeholder}
          value={displayValue}
          oninput={(e) => (searchQuery = e.currentTarget.value)}
          onfocus={() => {
          if (justClosedConfirm) justClosedConfirm = false;
          else open = true;
        }}
          class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 font-medium"
        />
        <ChevronDownIcon class="size-4 shrink-0 opacity-50" />
      </div>
    {/snippet}
    <Select.Root
      type="single"
      value={value}
      onValueChange={handleValueChange}
      bind:open
    >
      <Select.Trigger
        class="w-full justify-between data-placeholder:text-muted-foreground"
        child={triggerChild}
      />
      <Select.Content
        id="category-list"
        class="max-h-60 bg-white"
        onOpenAutoFocus={(e) => e?.preventDefault?.()}
      >
        {#each filteredPillars as pillar (pillar)}
          {@const pillarItems = items.filter(
            (item) =>
              item.pillar === pillar &&
              (q === "" ||
                item.label.toLowerCase().includes(q) ||
                (item.pillar ?? "").toLowerCase().includes(q)),
          )}
          {#if pillarItems.length > 0}
            <Select.Group>
              <Select.GroupHeading>{pillar}</Select.GroupHeading>
              {#each pillarItems as item (item.value)}
                <Select.Item value={item.value} label={item.label} class="pl-6">
                  {item.label}
                </Select.Item>
              {/each}
            </Select.Group>
          {/if}
        {/each}
      </Select.Content>
    </Select.Root>
  </div>
  {#if description}
    <Field.Description>{description}</Field.Description>
  {/if}
  {#if schemaError}
    <Field.Error class="text-xs">{schemaError}</Field.Error>
  {/if}
</Field.Field>

<AlertDialog.Root bind:open={confirmChangeOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Change focus area?</AlertDialog.Title>
      <AlertDialog.Description>
        You have already added KPIs for the current focus area. Changing the
        focus area will clear your KPI selections. Do you want to continue?
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer class="flex gap-2">
      <AlertDialog.Cancel class="cursor-pointer" onclick={cancelChangeFocusArea}>
        Cancel
      </AlertDialog.Cancel>
      <AlertDialog.Action
        class="cursor-pointer"
        onclick={confirmChangeFocusArea}
      >
        Change focus area
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<!-- preview -->
{#if value}
  <PillarInfo category={categories.find((item) => item._id === value)} />
{/if}

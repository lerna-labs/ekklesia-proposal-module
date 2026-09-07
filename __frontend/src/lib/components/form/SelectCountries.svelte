<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import ToolTip from "$lib/components/form/ToolTip.svelte";
  import PrivateFieldIndicator from "$lib/components/form/PrivateFieldIndicator.svelte";
  import * as Select from "$lib/components/ui/select/index.js";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";

  let {
    id,
    label = "",
    description: descriptionProp,
    placeholder = "Select country...",
    value = $bindable(),
    validationErrors,
    notPublic = false,
    required = false,
    class: className,
  } = $props();

  const apiUrl =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL
      ? import.meta.env.VITE_API_URL
      : "/api/v0";

  let schemaError = $derived(validationErrors?.properties?.[id]?.errors?.[0]);

  let items = $state([]);
  let loading = $state(true);
  let loadError = $state(null);

  $effect(() => {
    let cancelled = false;
    loading = true;
    loadError = null;
    fetch(`${apiUrl}/countries`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText || "Failed to load countries");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const raw = Array.isArray(data) ? data : (data?.data ?? data?.countries ?? []);
        items = raw
          .map((c) => {
            if (typeof c === "string") return { value: c, label: c };
            const code = c.code ?? c.alpha2 ?? c.iso2 ?? c.id ?? "";
            const name = c.name ?? c.country ?? c.label ?? String(c);
            return { value: code, label: name || code };
          })
          .filter((c) => c.value && c.label);
        loading = false;
      })
      .catch((err) => {
        if (!cancelled) {
          loadError = err.message ?? "Failed to load countries";
          loading = false;
        }
      });
    return () => {
      cancelled = true;
    };
  });

  let open = $state(false);
  let searchQuery = $state("");

  const selectedLabel = $derived(items.find((item) => item.value === value)?.label ?? "");

  const displayValue = $derived(open ? searchQuery : selectedLabel);

  const q = $derived(searchQuery.trim().toLowerCase());
  const filteredItems = $derived(
    q === ""
      ? items
      : items.filter(
          (item) => item.label.toLowerCase().includes(q) || item.value.toLowerCase().includes(q),
        ),
  );

  $effect(() => {
    if (!open) searchQuery = "";
  });
</script>

<Field.Field class="gap-2 {className}">
  <div class="flex w-full items-center gap-1">
    <Field.Label for={id} class="mb-0 flex w-fit shrink-0 gap-0 pb-0 text-sm">
      {label}
      {#if required}
        <span class="text-(--mbo-electric-blue)">*</span>
      {/if}
    </Field.Label>
    {#if notPublic}
      <PrivateFieldIndicator />
    {/if}
    {#if descriptionProp}
      <ToolTip content={descriptionProp} fieldLabel={label} />
    {/if}
    <span class="min-w-0 flex-1" aria-hidden="true"></span>
  </div>
  <div
    class="border-input aria-invalid:border-destructive aria-invalid:ring-destructive/20 rounded-md border aria-invalid:ring-[3px]"
    aria-invalid={schemaError ? true : false}
  >
    {#snippet triggerChild({ props })}
      <div
        {...props}
        class="focus-within:ring-ring/50 flex h-9 w-full items-center gap-2 rounded-md border-0 bg-transparent px-3 py-1 text-base shadow-none outline-none focus-within:ring-[3px] md:text-sm"
      >
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="country-list"
          aria-autocomplete="list"
          {placeholder}
          value={displayValue}
          oninput={(e) => (searchQuery = e.currentTarget.value)}
          onfocus={() => (open = true)}
          disabled={loading}
          class="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        <ChevronDownIcon class="size-4 shrink-0 opacity-50" />
      </div>
    {/snippet}
    <Select.Root type="single" bind:value bind:open>
      <Select.Trigger
        class="data-placeholder:text-muted-foreground w-full justify-between"
        child={triggerChild}
      />
      <Select.Content
        id="country-list"
        class="max-h-60"
        onOpenAutoFocus={(e) => e?.preventDefault?.()}
      >
        {#if loading}
          <div class="text-muted-foreground py-4 text-center text-sm">Loading…</div>
        {:else if loadError}
          <div class="text-destructive py-4 text-center text-sm">
            {loadError}
          </div>
        {:else}
          {#each filteredItems as item (item.value)}
            <Select.Item value={item.value} label={item.label}>
              {item.label}
            </Select.Item>
          {/each}
        {/if}
      </Select.Content>
    </Select.Root>
  </div>
  {#if schemaError}
    <Field.Error class="text-xs">{schemaError}</Field.Error>
  {/if}
</Field.Field>

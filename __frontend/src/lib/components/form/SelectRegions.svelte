<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import ToolTip from "$lib/components/form/ToolTip.svelte";
  import PrivateFieldIndicator from "$lib/components/form/PrivateFieldIndicator.svelte";
  import * as Select from "$lib/components/ui/select/index.js";

  let {
    id,
    label = "",
    description: descriptionProp,
    placeholder = "Select region (optional)",
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

  /** Sentinel for “no region”; persisted value is always `""`. */
  const NONE = "__none__";

  let schemaError = $derived(validationErrors?.properties?.[id]?.errors?.[0]);

  let items = $state([]);
  let loading = $state(true);
  let loadError = $state(null);

  $effect(() => {
    let cancelled = false;
    loading = true;
    loadError = null;
    fetch(`${apiUrl}/regions`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText || "Failed to load regions");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const raw = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        const mapped = raw
          .map((r) => {
            const oid = r._id != null ? String(r._id) : "";
            const name = r.name != null ? String(r.name) : "";
            return { id: oid, name: name || oid };
          })
          .filter((r) => r.id && r.name);
        /** Keep API order; "Other / Global" always last (see regions seed). */
        const otherGlobal = [];
        const rest = [];
        for (const r of mapped) {
          if (r.name.trim().toLowerCase() === "other / global") {
            otherGlobal.push(r);
          } else {
            rest.push(r);
          }
        }
        items = [...rest, ...otherGlobal];
        loading = false;
      })
      .catch((err) => {
        if (!cancelled) {
          loadError = err.message ?? "Failed to load regions";
          loading = false;
        }
      });
    return () => {
      cancelled = true;
    };
  });

  const selectValue = $derived(value && String(value).length === 24 ? String(value) : NONE);

  const selectedLabel = $derived(
    selectValue === NONE ? "" : (items.find((r) => r.id === selectValue)?.name ?? ""),
  );

  let open = $state(false);

  /** @param {string | undefined} v */
  function onValueChange(v) {
    value = v === NONE || v == null || v === "" ? "" : String(v);
  }
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
    <Select.Root type="single" value={selectValue} {onValueChange} bind:open>
      <Select.Trigger
        {id}
        class="data-placeholder:text-muted-foreground aria-invalid:border-destructive h-9 w-full justify-between bg-white px-3 py-1 text-base md:text-sm"
        aria-invalid={schemaError ? true : false}
      >
        <span class="line-clamp-1 truncate text-left">
          {#if loading}
            Loading…
          {:else if loadError}
            <span class="text-destructive">{loadError}</span>
          {:else if selectValue === NONE}
            {placeholder}
          {:else}
            {selectedLabel || placeholder}
          {/if}
        </span>
      </Select.Trigger>
      <Select.Content class="max-h-60">
        {#if loading}
          <div class="text-muted-foreground px-2 py-3 text-sm">Loading…</div>
        {:else if loadError}
          <div class="text-destructive px-2 py-3 text-sm">{loadError}</div>
        {:else}
          <Select.Item value={NONE} label={placeholder}>
            {placeholder}
          </Select.Item>
          {#each items as r (r.id)}
            <Select.Item value={r.id} label={r.name}>
              {r.name}
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

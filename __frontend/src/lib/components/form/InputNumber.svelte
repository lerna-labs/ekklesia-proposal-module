<script>
  /**
   * Number input with optional prefix/suffix, full field wrapper (label, description tooltip, helper text).
   * Value can be string or number; use decimalComma to show/store comma as decimal separator.
   * Prop naming aligned with Input.svelte (label, required, description, class).
   */
  import * as Field from "$lib/components/ui/field/index.js";
  import ToolTip from "$lib/components/form/ToolTip.svelte";

  let {
    id,
    label,
    required = false,
    description,
    prefix = "",
    suffix = "",
    value = $bindable(""),
    placeholder = "",
    disabled = false,
    invalid = false,
    decimalComma = false,
    type = "text",
    validationErrors,
    class: className = "",
    containerClass = "",
    helperText,
    ...rest
  } = $props();

  let inputEl = $state(null);
  let schemaError = $derived(
    id && validationErrors
      ? validationErrors?.properties?.[id]?.errors?.[0]
      : undefined,
  );
  let isInvalid = $derived(invalid || !!schemaError);

  function formatForDisplay(val) {
    if (val == null || val === "") return "";
    if (!decimalComma) return String(val);
    return String(val).replace(".", ",");
  }

  function onInput(e) {
    const raw = e.target.value;
    value = decimalComma ? raw.replace(",", ".") : raw;
  }

  let displayValue = $derived(
    value == null || value === ""
      ? ""
      : decimalComma
        ? formatForDisplay(value)
        : value,
  );
</script>

<Field.Field class="gap-4 mb-4 {className}">
  <div class="flex flex-wrap items-end gap-4">
    <div class="flex flex-col gap-2 min-w-[200px] w-full max-w-sm {containerClass}">
      <div class="flex items-center gap-1 w-full">
        <Field.Label for={id} class="flex gap-0 mb-0 pb-0 text-sm shrink-0 w-fit">
          {label}
          {#if required}
            <span class="text-(--mbo-electric-blue)">*</span>
          {/if}
        </Field.Label>
        {#if description}
          <ToolTip content={description} />
        {/if}
        <span class="flex-1 min-w-0" aria-hidden="true"></span>
      </div>
      <div class="flex flex-col gap-0">
        <div
          class="amount-input flex h-9 w-full items-center rounded-md border border-input bg-transparent shadow-xs transition-colors focus-within:outline-none focus-within:ring-[3px] focus-within:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:ring-[3px]"
          class:opacity-50={disabled}
          class:cursor-not-allowed={disabled}
          aria-invalid={isInvalid || undefined}
        >
          {#if prefix}
            <span
              class="prefix shrink-0 pl-3 text-muted-foreground text-base md:text-sm font-normal"
              aria-hidden="true"
            >
              {prefix}
            </span>
          {/if}
          <input
            bind:this={inputEl}
            {id}
            {type}
            {placeholder}
            {disabled}
            value={displayValue}
            oninput={onInput}
            class="value flex-1 min-w-0 border-0 bg-transparent px-0 py-1 text-base text-foreground outline-none placeholder:text-muted-foreground md:text-sm focus:outline-none focus:ring-0"
            class:pl-2={!!prefix}
            class:pr-2={!!suffix}
            class:pl-3={!prefix}
            class:pr-3={!suffix}
            aria-invalid={isInvalid || undefined}
            {...rest}
          />
          {#if suffix}
            <span
              class="suffix shrink-0 pr-3 text-muted-foreground text-base md:text-sm font-normal"
              aria-hidden="true"
            >
              {suffix}
            </span>
          {/if}
        </div>
        {#if schemaError}
          <Field.Error class="text-xs mt-2">{schemaError}</Field.Error>
        {/if}
      </div>
      {#if helperText}
        <p class="text-xs text-muted-foreground mt-0">{helperText}</p>
      {/if}
    </div>
  </div>
</Field.Field>

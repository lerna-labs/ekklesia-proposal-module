<script>
  /**
   * Number input with optional prefix/suffix, full field wrapper (label, description tooltip, helper text).
   * Always normalizes comma to dot on input. When type="number", value is dot-form so step/spinner work.
   * Use decimalComma only with type="text" for comma display. maxDecimals caps decimal places (default 2).
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
    maxDecimals = 2,
    validationErrors,
    class: className = "",
    containerClass = "",
    helperText,
    ...rest
  } = $props();

  let inputEl = $state(null);
  let schemaError = $derived(
    id && validationErrors ? validationErrors?.properties?.[id]?.errors?.[0] : undefined,
  );
  let isInvalid = $derived(invalid || !!schemaError);

  function formatForDisplay(val) {
    if (val == null || val === "") return "";
    if (!decimalComma) return String(val);
    return String(val).replace(".", ",");
  }

  function onInput(e) {
    const raw = e.target.value;
    const normalized = raw.replace(",", ".");
    let nextValue = normalized;
    if (maxDecimals != null && normalized.includes(".")) {
      const num = parseFloat(normalized);
      if (!Number.isNaN(num)) {
        const decimals = (normalized.split(".")[1] ?? "").length;
        if (decimals > maxDecimals) {
          const factor = 10 ** maxDecimals;
          nextValue = Math.round(num * factor) / factor;
        }
      }
    }
    value = nextValue;
  }

  let displayValue = $derived(
    value == null || value === ""
      ? ""
      : type === "number"
        ? String(value)
        : decimalComma
          ? formatForDisplay(value)
          : value,
  );
</script>

<Field.Field class="mb-4 gap-4 {className}">
  <div class="flex flex-wrap items-end gap-4">
    <div class="flex w-full max-w-sm min-w-[200px] flex-col gap-2 {containerClass}">
      <div class="flex w-full items-center gap-1">
        <Field.Label for={id} class="mb-0 flex w-fit shrink-0 gap-0 pb-0 text-sm">
          {label}
          {#if required}
            <span class="text-(--mbo-electric-blue)">*</span>
          {/if}
        </Field.Label>
        {#if description}
          <ToolTip content={description} fieldLabel={label} />
        {/if}
        <span class="min-w-0 flex-1" aria-hidden="true"></span>
      </div>
      <div class="flex flex-col gap-0">
        <div
          class="amount-input border-input focus-within:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 flex h-9 w-full items-center rounded-md border bg-transparent shadow-xs transition-colors focus-within:ring-[3px] focus-within:outline-none aria-invalid:ring-[3px]"
          class:opacity-50={disabled}
          class:cursor-not-allowed={disabled}
          aria-invalid={isInvalid || undefined}
        >
          {#if prefix}
            <span
              class="prefix text-muted-foreground shrink-0 pl-3 text-base font-normal md:text-sm"
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
            class="value text-foreground placeholder:text-muted-foreground min-w-0 flex-1 border-0 bg-transparent px-0 py-1 text-base outline-none focus:ring-0 focus:outline-none md:text-sm"
            class:pl-2={!!prefix}
            class:pr-2={!!suffix}
            class:pl-3={!prefix}
            class:pr-3={!suffix}
            aria-invalid={isInvalid || undefined}
            {...rest}
          />
          {#if suffix}
            <span
              class="suffix text-muted-foreground shrink-0 pr-3 text-base font-normal md:text-sm"
              aria-hidden="true"
            >
              {suffix}
            </span>
          {/if}
        </div>
        {#if schemaError}
          <Field.Error class="mt-2 text-xs">{schemaError}</Field.Error>
        {/if}
      </div>
      {#if helperText}
        <p class="text-muted-foreground mt-0 text-xs">{helperText}</p>
      {/if}
    </div>
  </div>
</Field.Field>

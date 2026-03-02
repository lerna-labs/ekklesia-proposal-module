<script>
  /**
   * Pill-style input with optional prefix and suffix (e.g. "$" and "/ ADA").
   * Value can be string or number; use decimalComma to show/store comma as decimal separator.
   */
  let {
    prefix = "",
    suffix = "",
    value = $bindable(""),
    placeholder = "",
    disabled = false,
    invalid = false,
    decimalComma = false,
    type = "text",
    class: className = "",
    ...rest
  } = $props();

  let inputEl = $state(null);

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
        : value
  );
</script>

<div
  class="amount-input flex h-9 w-full items-center rounded-md border border-input bg-transparent shadow-xs transition-colors focus-within:outline-none focus-within:ring-[3px] focus-within:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:ring-[3px] {className}"
  class:opacity-50={disabled}
  class:cursor-not-allowed={disabled}
  aria-invalid={invalid || undefined}
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
    type={type}
    {placeholder}
    {disabled}
    value={displayValue}
    oninput={onInput}
    class="value flex-1 min-w-0 border-0 bg-transparent px-0 py-1 text-base text-foreground outline-none placeholder:text-muted-foreground md:text-sm focus:outline-none focus:ring-0"
    class:pl-2={prefix}
    class:pr-2={suffix}
    class:pl-3={!prefix}
    class:pr-3={!suffix}
    aria-invalid={invalid || undefined}
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

<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import ToolTip from "./ToolTip.svelte";
  import PrivateFieldIndicator from "./PrivateFieldIndicator.svelte";

  let EditorComponent = $state(null);
  $effect(() => {
    if (EditorComponent) return;
    import("$lib/editor/Editor.svelte").then((m) => {
      EditorComponent = m.default;
    });
  });

  let {
    id,
    label = "",
    description: descriptionProp,
    placeholder,
    value = $bindable(),
    validationErrors,
    notPublic = false,
    required = false,
    maxLength,
    class: className,
  } = $props();

  let schemaError = $derived(validationErrors?.properties?.[id]?.errors?.[0]);
  let displayError = $derived(schemaError);

  // Count raw stored characters to match backend validation behavior.
  let visibleLength = $derived(String(value ?? "").length);
  let isOverMaxLength = $derived(maxLength != null && maxLength > 0 && visibleLength > maxLength);

  /** Stable id for the visible label when pairing with the Lexical root via aria-labelledby. */
  let labelElementId = $derived(
    id && String(label ?? "").trim() !== "" ? `${id}-label` : undefined,
  );
  let editorAriaLabelledBy = $derived(labelElementId);
  let editorAriaLabel = $derived(
    labelElementId
      ? undefined
      : String(label ?? "").trim() !== ""
        ? String(label).trim()
        : placeholder?.trim()
          ? placeholder.trim()
          : "Rich text",
  );
</script>

<Field.Field class="gap-2 {className}">
  <div class="flex w-full items-center gap-1">
    <Field.Label id={labelElementId} for={id} class="mb-0 flex w-fit shrink-0 gap-0 pb-0 text-sm">
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
    {#if maxLength}
      <span
        class="shrink-0 text-xs"
        class:text-destructive={isOverMaxLength}
        class:text-muted-foreground={!isOverMaxLength}
      >
        {visibleLength}/{maxLength}
      </span>
    {/if}
  </div>
  <div
    class="border-input bg-background focus-within:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 relative w-full rounded-md border shadow-xs transition-colors focus-within:ring-[3px] focus-within:outline-none aria-invalid:ring-[3px]"
    aria-invalid={displayError ? true : false}
  >
    {#if EditorComponent}
      <EditorComponent
        {id}
        ariaLabel={editorAriaLabel}
        ariaLabelledBy={editorAriaLabelledBy}
        bind:value
      />
    {:else}
      <div class="text-muted-foreground flex min-h-[120px] items-center justify-center p-4 text-sm">
        Loading editor…
      </div>
    {/if}
    {#if EditorComponent && placeholder && (value == null || String(value).trim() === "")}
      <span
        class="text-muted-foreground pointer-events-none absolute inset-0 z-10 flex items-start pt-13 pr-3 pl-2 text-sm"
        aria-hidden="true"
      >
        {placeholder}
      </span>
    {/if}
  </div>
  {#if displayError}
    <Field.Error class="text-xs">{displayError}</Field.Error>
  {/if}
</Field.Field>

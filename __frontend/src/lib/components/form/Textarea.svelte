<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import Editor from "$lib/editor/Editor.svelte";
  import ToolTip from "$lib/form/ToolTip.svelte";
  import PrivateFieldIndicator from "$lib/form/PrivateFieldIndicator.svelte";
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

  /** Strip markdown syntax to get visible character count (for limit display). */
  function stripMarkdownForCount(text) {
    if (typeof text !== "string") return "";
    return text
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/(\*\*|__)(.*?)\1/g, "$2")
      .replace(/(\*|_)(.*?)\1/g, "$2")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^>\s*/gm, "")
      .replace(/^[-*+]\s+/gm, "")
      .replace(/^\d+\.\s+/gm, "")
      .replace(/```[\s\S]*?```/g, "")
      .trim();
  }

  let visibleLength = $derived(stripMarkdownForCount(value).length);
</script>

<Field.Field class="gap-2 {className}">
  <div class="flex items-center gap-1 w-full">
    <Field.Label for={id} class="flex gap-0 mb-0 pb-0 text-sm shrink-0 w-fit">
      {label}
      {#if required}
        <span class="text-(--mbo-electric-blue)">*</span>
      {/if}
    </Field.Label>
    {#if notPublic}
      <PrivateFieldIndicator />
    {/if}
    {#if descriptionProp}
      <ToolTip content={descriptionProp} />
    {/if}
    <span class="flex-1 min-w-0" aria-hidden="true"></span>
    {#if maxLength}
      <span class="text-xs text-muted-foreground shrink-0">
        {visibleLength}/{maxLength}
      </span>
    {/if}
  </div>
  <div
    class="relative rounded-md border border-input aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:ring-[3px]"
    aria-invalid={schemaError ? true : false}
  >
    <Editor bind:value />
    {#if placeholder && (value == null || String(value).trim() === "")}
      <span
        class="absolute inset-0 flex items-start pt-12 pl-3 pr-3 text-muted-foreground pointer-events-none text-sm z-10"
        aria-hidden="true"
      >
        {placeholder}
      </span>
    {/if}
  </div>
  {#if schemaError}
    <Field.Error class="text-xs">{schemaError}</Field.Error>
  {/if}
</Field.Field>

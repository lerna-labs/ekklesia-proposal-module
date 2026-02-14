<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import Editor from "$lib/editor/Editor.svelte";
  import ToolTip from "$lib/form/ToolTip.svelte";
  import PrivateFieldIndicator from "$lib/form/PrivateFieldIndicator.svelte";
  let {
    id,
    description,
    placeholder,
    value = $bindable(),
    formSchema,
    validationErrors,
    notPublic = false,
    class: className,
  } = $props();

  let label = $derived(formSchema.shape[id]?.meta()?.label);
  let schemaMeta = $derived(formSchema.shape[id]?.meta());
  let schemaRequired = $derived(
    formSchema.shape[id]?.meta()?.required ? true : false,
  );
  let schemaError = $derived(
    validationErrors?.properties?.[id]?.errors?.[0],
  );
  let showNotPublic = $derived(
    notPublic ?? formSchema?.shape?.[id]?.meta()?.notPublic ?? false,
  );
  /** Read max length from schema validation (e.g. z.string().max(n)); unwrap optional/default. Fall back to meta. */
  let maxLength = $derived.by(() => {
    let schema = formSchema?.shape?.[id];
    if (!schema) return undefined;
    while (schema?._zod?.def?.innerType) schema = schema._zod.def.innerType;
    const fromBag = schema?._zod?.bag?.maximum;
    if (typeof fromBag === "number") return fromBag;
    return schemaMeta?.maxLength;
  });

  /** Strip markdown syntax to get visible character count (for limit display). */
  function stripMarkdownForCount(text) {
    if (typeof text !== "string") return "";
    return text
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1") // ![alt](url) -> alt
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [text](url) -> text
      .replace(/(\*\*|__)(.*?)\1/g, "$2") // **bold** __bold__
      .replace(/(\*|_)(.*?)\1/g, "$2") // *italic* _italic_
      .replace(/`([^`]+)`/g, "$1") // `code`
      .replace(/^#{1,6}\s+/gm, "") // # headers
      .replace(/^>\s*/gm, "") // blockquote
      .replace(/^[-*+]\s+/gm, "") // unordered list
      .replace(/^\d+\.\s+/gm, "") // ordered list
      .replace(/```[\s\S]*?```/g, "") // fenced code blocks
      .trim();
  }

  let visibleLength = $derived(stripMarkdownForCount(value).length);
</script>

<Field.Field class="gap-2 {className}">
  <div class="flex items-center gap-1 w-full">
    <Field.Label for={id} class="flex gap-0 mb-0 pb-0 text-sm shrink-0 w-fit">
      {label}
      {#if schemaRequired}
        <span>*</span>
      {/if}
    </Field.Label>
    {#if showNotPublic}
      <PrivateFieldIndicator />
    {/if}
    {#if schemaMeta?.description}
      <ToolTip content={schemaMeta.description} />
    {/if}
    <span class="flex-1 min-w-0" aria-hidden="true"></span>
    {#if maxLength}
      <span class="text-xs text-muted-foreground shrink-0">
        {visibleLength}/{maxLength}
      </span>
    {/if}
  </div>
  <div
    class="rounded-md border border-input aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:ring-[3px]"
    aria-invalid={schemaError ? true : false}
  >
    <Editor bind:value />
  </div>
  {#if description}
    <Field.Description>{description}</Field.Description>
  {/if}
  {#if schemaError}
    <Field.Error class="text-xs">{schemaError}</Field.Error>
  {/if}
</Field.Field>

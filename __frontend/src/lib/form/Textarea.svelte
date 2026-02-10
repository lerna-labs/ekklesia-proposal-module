<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import Editor from "$lib/editor/Editor.svelte";
  import ToolTip from "$lib/form/ToolTip.svelte";
  let {
    id,
    description,
    placeholder,
    value = $bindable(),
    formSchema,
    validationErrors,
    class: className,
  } = $props();

  let label = $derived(formSchema.shape[id]?.meta()?.label);
  let schemaMeta = $derived(formSchema.shape[id]?.meta());
  let schemaRequired = $derived(
    formSchema.shape[id]?.meta()?.required ? true : false,
  );
  let schemaError = $derived(
    validationErrors?.issues?.find((issue) => issue.path[0] === id)?.message,
  );
  let maxLength = $derived(formSchema.shape[id].maxLength);

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
  <div class="flex items-center gap-1">
    <Field.Label for={id} class="flex gap-0 mb-0 pb-0 text-sm shrink-0 w-fit">
      {label}
      {#if schemaRequired}
        <span>*</span>
      {/if}
    </Field.Label>
    <div class="flex items-center gap-1 justify-between w-full">
      {#if schemaMeta?.description}
        <ToolTip content={schemaMeta.description} />
      {/if}
      {#if maxLength}
        <span class="text-xs text-muted-foreground">
          {visibleLength}/{maxLength}
        </span>
      {/if}
    </div>
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

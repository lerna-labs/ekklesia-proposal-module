<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
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
</script>

<Field.Field class="gap-2 {className}">
  <div class="flex items-center gap-1">
    <Field.Label
      for={id}
      class="flex gap-0 mb-0 pb-0 text-sm flex-shrink-0 w-fit"
    >
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
          {value.length}/{maxLength}
        </span>
      {/if}
    </div>
  </div>
  <Input
    {id}
    bind:value
    placeholder={schemaMeta?.placeholder}
    aria-invalid={schemaError ? true : false}
    class="aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:ring-[3px]"
  />
  {#if description}
    <Field.Description>{description}</Field.Description>
  {/if}
  {#if schemaError}
    <Field.Error class="text-xs">{schemaError}</Field.Error>
  {/if}
</Field.Field>

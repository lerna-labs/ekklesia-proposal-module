<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import ToolTip from "$lib/form/ToolTip.svelte";
  let {
    id,
    description,
    value = $bindable(false),
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
    validationErrors?.properties?.[id]?.errors?.[0],
  );
</script>

<Field.Field class="gap-2 {className}">
  <div class="flex items-center gap-1">
    <Field.Label
      for={id}
      class="flex gap-0 mb-0 pb-0 text-sm shrink-0 w-fit cursor-pointer"
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
    </div>
  </div>
  <div class="flex items-center gap-2">
    <Checkbox
      id={id}
      bind:checked={value}
      aria-invalid={schemaError ? true : false}
      class="aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:ring-[3px]"
    />
  </div>
  {#if description}
    <Field.Description>{description}</Field.Description>
  {/if}
  {#if schemaError}
    <Field.Error class="text-xs">{schemaError}</Field.Error>
  {/if}
</Field.Field>

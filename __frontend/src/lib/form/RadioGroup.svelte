<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import * as RadioGroup from "$lib/components/ui/radio-group/index.js";
  import ToolTip from "$lib/form/ToolTip.svelte";
  let {
    id,
    description,
    value = $bindable(""),
    options = [],
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
      class="flex gap-0 mb-0 pb-0 text-sm shrink-0 w-fit"
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
  <RadioGroup.Root
    {id}
    bind:value
    aria-invalid={schemaError ? true : false}
    class="grid gap-3 aria-invalid:**:data-[slot=radio-group-item]:border-destructive aria-invalid:**:data-[slot=radio-group-item]:ring-destructive/20 aria-invalid:**:data-[slot=radio-group-item]:ring-[3px]"
  >
    {#each options as option (option.value)}
      {@const itemId = `${id}-${option.value}`}
      <div class="flex items-center gap-2">
        <RadioGroup.Item value={option.value} id={itemId} />
        <label for={itemId} class="text-sm font-normal cursor-pointer">
          {option.label}
        </label>
      </div>
    {/each}
  </RadioGroup.Root>
  {#if description}
    <Field.Description>{description}</Field.Description>
  {/if}
  {#if schemaError}
    <Field.Error class="text-xs">{schemaError}</Field.Error>
  {/if}
</Field.Field>

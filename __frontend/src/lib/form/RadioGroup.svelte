<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import * as RadioGroup from "$lib/components/ui/radio-group/index.js";
  import ToolTip from "$lib/form/ToolTip.svelte";
  import PrivateFieldIndicator from "$lib/form/PrivateFieldIndicator.svelte";
  let {
    id,
    description,
    value = $bindable(),
    options = [],
    formSchema,
    validationErrors,
    notPublic = false,
    class: className,
    onUpdate,
  } = $props();

  let internal = $state(value ?? "");

  $effect(() => {
    value = internal;
  });
  $effect(() => {
    const v = value ?? "";
    if (v !== internal) internal = v;
  });

  let label = $derived(formSchema?.shape?.[id]?.meta()?.label);
  let schemaMeta = $derived(formSchema?.shape?.[id]?.meta());
  let schemaRequired = $derived(
    formSchema?.shape?.[id]?.meta()?.required ? true : false,
  );
  let schemaError = $derived(validationErrors?.properties?.[id]?.errors?.[0]);
  let showNotPublic = $derived(
    notPublic ?? formSchema?.shape?.[id]?.meta()?.notPublic ?? false,
  );
  $effect(() => {
    onUpdate?.(internal);
  });
</script>

<Field.Field class="gap-2 {className}">
  <div
    class="rounded-md border transition-[border-color,box-shadow] {schemaError
      ? 'border-destructive ring-[3px] ring-destructive/20'
      : 'border-transparent'}"
    aria-invalid={schemaError ? true : false}
  >
    <div class="flex items-center gap-1 w-full mb-2">
      <Field.Label for={id} class="flex gap-0 mb-0 pb-0 text-sm shrink-0 w-fit">
        {label}
        {#if schemaRequired}
          <span class="text-(--mbo-electric-blue)">*</span>
        {/if}
      </Field.Label>
      {#if showNotPublic}
        <PrivateFieldIndicator />
      {/if}
      {#if schemaMeta?.description}
        <ToolTip content={schemaMeta.description} />
      {/if}
      <span class="flex-1 min-w-0" aria-hidden="true"></span>
    </div>
    <RadioGroup.Root {id} bind:value={internal} class="grid gap-3">
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
  </div>
  {#if description}
    <Field.Description>{description}</Field.Description>
  {/if}
  {#if schemaError}
    <Field.Error class="text-xs">{schemaError}</Field.Error>
  {/if}
</Field.Field>

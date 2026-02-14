<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import ToolTip from "$lib/form/ToolTip.svelte";
  import PrivateFieldIndicator from "$lib/form/PrivateFieldIndicator.svelte";
  let {
    id,
    description,
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
  let schemaError = $derived(validationErrors?.properties?.[id]?.errors?.[0]);
  let showNotPublic = $derived(
    notPublic ?? formSchema?.shape?.[id]?.meta()?.notPublic ?? false,
  );
</script>

<Field.Field class="gap-2 {className}">
  <div
    class="flex items-center gap-2 rounded-md border transition-[border-color,box-shadow] {schemaError
      ? 'border-destructive ring-[3px] ring-destructive/20'
      : 'border-transparent'}"
    aria-invalid={schemaError ? true : false}
  >
    <Switch
      {id}
      checked={value ?? false}
      onCheckedChange={(v) => (value = v)}
      aria-invalid={schemaError ? true : false}
      class="shrink-0"
    />
    <div class="min-w-0 flex-1 space-y-1">
      <div class="flex items-center gap-1 w-full min-w-0 flex-1">
        <Field.Label
          for={id}
          class="flex gap-0 mb-0 pb-0 text-sm cursor-pointer shrink-0 w-fit"
        >
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
      </div>
    </div>
  </div>
  {#if description}
    <Field.Description>{description}</Field.Description>
  {/if}
  {#if schemaError}
    <Field.Error class="text-xs">{schemaError}</Field.Error>
  {/if}
</Field.Field>

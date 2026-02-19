<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import ToolTip from "$lib/form/ToolTip.svelte";
  import PrivateFieldIndicator from "$lib/form/PrivateFieldIndicator.svelte";
  let {
    id,
    label = "",
    description: descriptionProp,
    value = $bindable(false),
    validationErrors,
    notPublic = false,
    required = false,
    class: className,
  } = $props();

  let schemaError = $derived(validationErrors?.properties?.[id]?.errors?.[0]);
</script>

<Field.Field class="gap-2 {className}">
  <div
    class="flex items-start gap-2 rounded-md border transition-[border-color,box-shadow] {schemaError
      ? 'border-destructive ring-[3px] ring-destructive/20'
      : 'border-transparent'}"
    aria-invalid={schemaError ? true : false}
  >
    <Checkbox
      {id}
      bind:checked={value}
      aria-invalid={schemaError ? true : false}
      class="shrink-0 mt-0.5"
    />
    <div class="min-w-0 flex-1 space-y-1">
      <div class="flex items-center gap-1 w-full min-w-0 flex-1">
        <Field.Label
          for={id}
          class="flex gap-0 mb-0 pb-0 text-sm cursor-pointer shrink-0 w-fit"
        >
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
      </div>
    </div>
  </div>
  {#if schemaError}
    <Field.Error class="text-xs">{schemaError}</Field.Error>
  {/if}
</Field.Field>

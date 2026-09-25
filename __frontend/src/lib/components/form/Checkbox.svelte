<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import ToolTip from "./ToolTip.svelte";
  import PrivateFieldIndicator from "./PrivateFieldIndicator.svelte";
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
      ? 'border-destructive ring-destructive/20 ring-[3px]'
      : 'border-transparent'}"
    aria-invalid={schemaError ? true : false}
  >
    <Checkbox
      {id}
      bind:checked={value}
      aria-invalid={schemaError ? true : false}
      class="border-muted-foreground/80 aria-invalid:border-muted-foreground/80 mt-0.5 h-4 w-4 shrink-0 border aria-invalid:ring-0"
    />
    <div class="min-w-0 flex-1 space-y-1">
      <div class="flex w-full min-w-0 items-start gap-1">
        <Field.Label for={id} class="mb-0 block min-w-0 flex-1 cursor-pointer pb-0 text-sm">
          <span class="inline">{label}</span>
          {#if required}<span class="text-(--mbo-electric-blue)"> * </span>{/if}{#if notPublic}
            <span class="ml-1 inline-flex align-middle">
              <PrivateFieldIndicator />
            </span>{/if}
        </Field.Label>
        {#if descriptionProp}
          <ToolTip content={descriptionProp} class="mt-0.5 shrink-0" fieldLabel={label} />
        {/if}
      </div>
    </div>
  </div>
  {#if schemaError}
    <Field.Error class="text-xs">{schemaError}</Field.Error>
  {/if}
</Field.Field>

<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import * as RadioGroup from "$lib/components/ui/radio-group/index.js";
  import ToolTip from "./ToolTip.svelte";
  import PrivateFieldIndicator from "./PrivateFieldIndicator.svelte";
  let {
    id,
    label = "",
    description: descriptionProp,
    value = $bindable(),
    options = [],
    validationErrors,
    notPublic = false,
    required = false,
    class: className,
    onUpdate,
  } = $props();

  let schemaError = $derived(validationErrors?.properties?.[id]?.errors?.[0]);
  $effect(() => {
    onUpdate?.(value ?? "");
  });
</script>

<Field.Field class="gap-2 {className}">
  <div
    class="rounded-md border transition-[border-color,box-shadow] {schemaError
      ? 'border-destructive ring-destructive/20 ring-[3px]'
      : 'border-transparent'}"
    aria-invalid={schemaError ? true : false}
  >
    <div class="mb-2 flex w-full items-center gap-1">
      <Field.Label for={id} class="mb-0 flex w-fit shrink-0 gap-0 pb-0 text-sm">
        {label}
        {#if required}
          <span class="text-(--mbo-electric-blue)">*</span>
        {/if}
      </Field.Label>
      {#if notPublic}
        <PrivateFieldIndicator />
      {/if}
      {#if descriptionProp}
        <ToolTip content={descriptionProp} fieldLabel={label} />
      {/if}
      <span class="min-w-0 flex-1" aria-hidden="true"></span>
    </div>
    <RadioGroup.Root {id} bind:value class="grid gap-2">
      {#each options as option (option.value)}
        {@const itemId = `${id}-${option.value}`}
        <div class="flex items-center gap-2">
          <RadioGroup.Item
            value={option.value}
            id={itemId}
            class="border-muted-foreground/80 border"
          />
          <label for={itemId} class="cursor-pointer text-sm font-normal">
            {option.label}
          </label>
        </div>
      {/each}
    </RadioGroup.Root>
  </div>
  {#if schemaError}
    <Field.Error class="text-xs">{schemaError}</Field.Error>
  {/if}
</Field.Field>

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
      ? 'border-destructive ring-[3px] ring-destructive/20'
      : 'border-transparent'}"
    aria-invalid={schemaError ? true : false}
  >
    <div class="flex items-center gap-1 w-full mb-2">
      <Field.Label for={id} class="flex gap-0 mb-0 pb-0 text-sm shrink-0 w-fit">
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
    <RadioGroup.Root {id} bind:value={value} class="grid gap-2">
      {#each options as option (option.value)}
        {@const itemId = `${id}-${option.value}`}
        <div class="flex items-center gap-2">
          <RadioGroup.Item
            value={option.value}
            id={itemId}
            class="border border-muted-foreground/80"
          />
          <label for={itemId} class="text-sm font-normal cursor-pointer">
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

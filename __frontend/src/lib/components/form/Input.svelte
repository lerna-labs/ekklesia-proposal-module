<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import ToolTip from "./ToolTip.svelte";
  import PrivateFieldIndicator from "./PrivateFieldIndicator.svelte";
  let {
    id,
    label = "",
    description: descriptionProp,
    placeholder,
    value = $bindable(),
    validationErrors,
    notPublic = false,
    required = false,
    disabled = false,
    maxLength,
    minLength,
    type = "text",
    min,
    max,
    step,
    class: className,
  } = $props();

  let schemaError = $derived(validationErrors?.properties?.[id]?.errors?.[0]);
  let displayError = $derived(schemaError);
</script>

<Field.Field class="gap-2 {className}">
  <div class="flex items-center gap-1 w-full">
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
      <ToolTip content={descriptionProp} fieldLabel={label} />
    {/if}
    <span class="flex-1 min-w-0" aria-hidden="true"></span>
    {#if maxLength}
      <span class="text-xs text-muted-foreground shrink-0">
        {value?.length ?? 0}/{maxLength}
      </span>
    {/if}
  </div>
  <Input
    {id}
    {type}
    bind:value
    {placeholder}
    {disabled}
    maxlength={maxLength}
    {min}
    {max}
    {step}
    aria-invalid={displayError ? true : false}
    class="aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:ring-[3px] bg-white"
  />
  {#if displayError}
    <Field.Error class="text-xs">{displayError}</Field.Error>
  {/if}
</Field.Field>

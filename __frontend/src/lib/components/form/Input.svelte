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
    onblur,
    class: className,
  } = $props();

  let schemaError = $derived(validationErrors?.properties?.[id]?.errors?.[0]);
  let displayError = $derived(schemaError);
  let currentLength = $derived(value?.length ?? 0);
  let isOverMaxLength = $derived(maxLength != null && maxLength > 0 && currentLength > maxLength);
</script>

<Field.Field class="gap-2 {className}">
  <div
    class="flex w-full items-center gap-1"
    class:hidden={!label && !descriptionProp && !notPublic && !required && !maxLength}
  >
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
    {#if maxLength}
      <span
        class="shrink-0 text-xs"
        class:text-destructive={isOverMaxLength}
        class:text-muted-foreground={!isOverMaxLength}
      >
        {currentLength}/{maxLength}
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
    {onblur}
    aria-invalid={displayError ? true : false}
    class="aria-invalid:border-destructive aria-invalid:ring-destructive/20 bg-white aria-invalid:ring-[3px]"
  />
  {#if displayError}
    <Field.Error class="text-xs">{displayError}</Field.Error>
  {/if}
</Field.Field>

<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import ToolTip from "$lib/components/form/ToolTip.svelte";
  import PrivateFieldIndicator from "$lib/components/form/PrivateFieldIndicator.svelte";
  import GlobeIcon from "@lucide/svelte/icons/globe";

  /**
   * @typedef {"username" | "website"} SocialVariant
   */

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
    onblur,
    class: className,
    /** `username`: icon + optional URL prefix + handle. `website`: globe icon + full URL. */
    variant = "username",
    /** Brand / network icon component (username variant); e.g. Lucide or custom SVG wrapper. */
    icon: Icon = null,
    /** Shown after the network icon, e.g. `x.com/` or `linkedin.com/in/` */
    urlPrefix = "",
  } = $props();

  let schemaError = $derived(validationErrors?.properties?.[id]?.errors?.[0]);
  let displayError = $derived(schemaError);

  const inputType = $derived(variant === "website" ? "url" : "text");
  const showLabelRow = $derived(
    !!(
      label ||
      descriptionProp ||
      notPublic ||
      required ||
      (maxLength != null && variant === "username")
    ),
  );
</script>

<Field.Field class="gap-2 {className}">
  {#if showLabelRow}
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
      {#if maxLength != null && variant === "username"}
        <span class="text-xs text-muted-foreground shrink-0">
          {value?.length ?? 0}/{maxLength}
        </span>
      {/if}
    </div>
  {/if}

  <div
    class="flex min-h-9 w-full rounded-md border border-input bg-white shadow-xs overflow-hidden aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:ring-[3px]"
    aria-invalid={displayError ? true : false}
  >
    <div
      class="flex items-center justify-center px-2.5 border-r border-input bg-muted shrink-0 text-muted-foreground"
      aria-hidden="true"
    >
      {#if variant === "website"}
        <GlobeIcon class="size-4" strokeWidth={2} />
      {:else if Icon}
        <Icon class="size-4" strokeWidth={2} />
      {/if}
    </div>
    {#if variant === "username" && urlPrefix}
      <span
        class="flex items-center px-2 text-sm text-muted-foreground border-r border-input bg-muted shrink-0 select-none whitespace-nowrap"
        >{urlPrefix}</span
      >
    {/if}
    <Input
      {id}
      type={inputType}
      bind:value
      {placeholder}
      {disabled}
      maxlength={maxLength}
      {onblur}
      aria-invalid={displayError ? true : false}
      class="min-w-0 flex-1 rounded-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 h-9 text-base md:text-sm bg-transparent px-3 py-1 aria-invalid:border-0"
    />
  </div>
  {#if displayError}
    <Field.Error class="text-xs">{displayError}</Field.Error>
  {/if}
</Field.Field>

<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import ToolTip from "$lib/form/ToolTip.svelte";
  import PrivateFieldIndicator from "$lib/form/PrivateFieldIndicator.svelte";
  let {
    id,
    description,
    placeholder,
    value = $bindable(),
    formSchema,
    validationErrors,
    notPublic = false,
    class: className,
  } = $props();

  let label = $derived(formSchema?.shape?.[id]?.meta()?.label);

  let schemaMeta = $derived(formSchema?.shape?.[id]?.meta());
  let schemaRequired = $derived(
    formSchema?.shape?.[id]?.meta()?.required ? true : false,
  );
  let schemaError = $derived(validationErrors?.properties?.[id]?.errors?.[0]);
  let showNotPublic = $derived(
    notPublic ?? formSchema?.shape?.[id]?.meta()?.notPublic ?? false,
  );

  /** Read max length from schema validation (e.g. z.string().max(n)); unwrap optional/default. Fall back to meta. */
  let maxLength = $derived.by(() => {
    let schema = formSchema?.shape?.[id];
    if (!schema) return undefined;
    while (schema?._zod?.def?.innerType) schema = schema._zod.def.innerType;
    const fromBag = schema?._zod?.bag?.maximum;
    if (typeof fromBag === "number") return fromBag;
    return schemaMeta?.maxLength;
  });
</script>

<Field.Field class="gap-2 {className}">
  <div class="flex items-center gap-1 w-full">
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
    {#if maxLength}
      <span class="text-xs text-muted-foreground shrink-0">
        {value?.length ?? 0}/{maxLength}
      </span>
    {/if}
  </div>
  <Input
    {id}
    bind:value
    placeholder={schemaMeta?.placeholder}
    maxlength={maxLength}
    aria-invalid={schemaError ? true : false}
    class="aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:ring-[3px] bg-white"
  />
  {#if description}
    <Field.Description>{description}</Field.Description>
  {/if}
  {#if schemaError}
    <Field.Error class="text-xs">{schemaError}</Field.Error>
  {/if}
</Field.Field>

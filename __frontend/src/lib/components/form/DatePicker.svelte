<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import Calendar from "$lib/components/ui/calendar/calendar.svelte";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import PrivateFieldIndicator from "$lib/components/form/PrivateFieldIndicator.svelte";
  import { getLocalTimeZone } from "@internationalized/date";

  let {
    id,
    required,
    label,
    value = $bindable(),
    minValue,
    maxValue,
    validationErrors,
    errorPath,
    notPublic = false,
  } = $props();

  let open = $state(false);

  const schemaError = $derived(
    errorPath?.length
      ? errorPath.reduce((node, key) => node?.properties?.[key], validationErrors)?.errors?.[0]
      : validationErrors?.properties?.[id]?.errors?.[0],
  );
</script>

<Field.Field class="w-fit gap-1">
  <div class="flex w-fit flex-col items-start gap-1">
    <div class="flex w-full items-center gap-1">
      <Field.Label for={id} class="mb-0 flex w-fit shrink-0 gap-0 pb-0 text-sm">
        {label}
        {#if required}
          <span class="text-(--mbo-electric-blue)">*</span>
        {/if}
      </Field.Label>
      {#if notPublic}
        <PrivateFieldIndicator />
      {/if}
      <span class="min-w-0 flex-1" aria-hidden="true"></span>
    </div>
    <Field.Content>
      <Popover.Root bind:open class="w-48 border border-black">
        <Popover.Trigger {id}>
          <Button
            variant="outline"
            class="w-48 justify-between font-normal {schemaError
              ? 'border-destructive ring-destructive/20 ring-[3px]'
              : ''}"
            aria-invalid={schemaError ? true : false}
          >
            {value ? value.toDate(getLocalTimeZone()).toLocaleDateString() : "Select date"}
            <ChevronDownIcon />
          </Button>
        </Popover.Trigger>
        <Popover.Content class="w-auto overflow-hidden p-0" align="start">
          <Calendar
            type="single"
            bind:value
            captionLayout="dropdown"
            {minValue}
            {maxValue}
            onValueChange={() => {
              open = false;
            }}
          />
        </Popover.Content>
      </Popover.Root>
    </Field.Content>
  </div>
  {#if schemaError}
    <Field.Error class="text-xs">{schemaError}</Field.Error>
  {/if}
</Field.Field>

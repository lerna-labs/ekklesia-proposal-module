<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import Calendar from "$lib/components/ui/calendar/calendar.svelte";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import PrivateFieldIndicator from "$lib/form/PrivateFieldIndicator.svelte";
  import { getLocalTimeZone, today } from "@internationalized/date";

  let {
    id,
    required,
    label,
    placeholder,
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
      ? errorPath.reduce(
          (node, key) => node?.properties?.[key],
          validationErrors,
        )?.errors?.[0]
      : validationErrors?.properties?.[id]?.errors?.[0],
  );
</script>

<Field.Field class="w-fit gap-1">
  <div class="flex flex-col items-start w-fit gap-1">
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
      <span class="flex-1 min-w-0" aria-hidden="true"></span>
    </div>
    <Field.Content>
      <Popover.Root bind:open class="border border-black w-48">
        <Popover.Trigger {id}>
          <Button
            variant="outline"
            class="w-48 justify-between font-normal {schemaError
              ? 'border-destructive ring-destructive/20 ring-[3px]'
              : ''}"
            aria-invalid={schemaError ? true : false}
          >
            {value
              ? value.toDate(getLocalTimeZone()).toLocaleDateString()
              : "Select date"}
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

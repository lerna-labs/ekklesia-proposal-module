<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import Calendar from "$lib/components/ui/calendar/calendar.svelte";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
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
  } = $props();

  let open = $state(false);

  const schemaError = $derived(
    errorPath?.length
      ? validationErrors?.issues?.find(
          (issue) =>
            issue.path.length === errorPath.length &&
            issue.path.every((p, i) => p === errorPath[i]),
        )?.message
      : validationErrors?.issues?.find((issue) => issue.path[0] === id)?.message,
  );
</script>

<Field.Field class="w-fit gap-1">
  <div class="flex flex-col items-start w-fit gap-1">
    <Field.Label for={id}>
      {label}
      {#if required}
        <span>*</span>
      {/if}
    </Field.Label>
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

<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import DatePicker from "$lib/form/DatePicker.svelte";
  import ToolTip from "$lib/form/ToolTip.svelte";
  import { getLocalTimeZone, today } from "@internationalized/date";

  let {
    formSchema,
    validationErrors,
    value = $bindable({ startDate: undefined, endDate: undefined }),
  } = $props();
</script>

<Field.Set>
  <Field.Legend class="flex items-center gap-1">
    Timeline*
    <ToolTip
      content="Project duration. How long do you realistically think the project will take? Consider including some contingency here."
    />
  </Field.Legend>
  <Field.Group class="flex flex-row flex-wrap items-end gap-1 w-full md:w-1/2">
    <DatePicker
      id="startDate"
      label="Start Date"
      required
      minValue={today(getLocalTimeZone())}
      bind:value={value.startDate}
      {validationErrors}
      errorPath={["timeline", "startDate"]}
    />
    <DatePicker
      id="endDate"
      label="End Date"
      required
      minValue={value.startDate}
      bind:value={value.endDate}
      {validationErrors}
      errorPath={["timeline", "endDate"]}
    />
  </Field.Group>
</Field.Set>

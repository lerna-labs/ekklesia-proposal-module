<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import DatePicker from "$lib/form/DatePicker.svelte";
  import ToolTip from "$lib/form/ToolTip.svelte";
  import { getLocalTimeZone, today } from "@internationalized/date";

  let {
    validationErrors,
    value = $bindable({ projectStartDate: undefined, projectEndDate: undefined }),
  } = $props();
</script>

<Field.Set>
  <Field.Legend class="flex items-center gap-1">
    <div class="flex items-center gap-0">
      Timeline <span class="text-(--mbo-electric-blue)">*</span>
    </div>
    <ToolTip content="Project duration. How long do you realistically think the project will take? Consider including some contingency here." />
  </Field.Legend>
  <Field.Group class="flex flex-row flex-wrap items-end gap-1 w-full md:w-1/2">
    <DatePicker
      id="projectStartDate"
      label="Start Date"
      required
      minValue={today(getLocalTimeZone())}
      bind:value={value.projectStartDate}
      {validationErrors}
      errorPath={["executionRoadmap", "projectStartDate"]}
    />
    <DatePicker
      id="projectEndDate"
      label="End Date"
      required
      minValue={value.projectStartDate}
      bind:value={value.projectEndDate}
      {validationErrors}
      errorPath={["executionRoadmap", "projectEndDate"]}
    />
  </Field.Group>
</Field.Set>

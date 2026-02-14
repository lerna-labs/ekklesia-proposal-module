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

  const schemaMeta = $derived(formSchema?.shape?.timeline?.meta?.());
  const label = $derived(schemaMeta?.label ?? "Timeline");
  const description = $derived(
    schemaMeta?.description ??
      "Project duration. How long do you realistically think the project will take? Consider including some contingency here.",
  );
</script>

<Field.Set>
  <Field.Legend class="flex items-center gap-1">
    <div class="flex items-center gap-0">
      {label} <span class="text-(--mbo-electric-blue)">*</span>
    </div>
    <ToolTip content={description} />
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

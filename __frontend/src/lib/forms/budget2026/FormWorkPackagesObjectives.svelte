<script>
  /**
   * Core objectives list for a work package. Wraps ObjectiveListEditor with budget2026 defaults.
   */
  import ObjectiveListEditor from "$lib/components/form/ObjectiveListEditor.svelte";

  let {
    value = $bindable([]),
    validationErrors,
    class: className = "",
  } = $props();
</script>

<ObjectiveListEditor
  bind:value
  label="Core Objectives"
  description="List the main objectives this work package is intended to achieve."
  addButtonLabel="Add Core Objective"
  maxLength={1000}
  {validationErrors}
  class={className}
/>

<script>
  /** Default form placeholder. Accepts props so pages can use the same FormComponent interface for all form types. */
  let { vote, categories, proposal, onSave, validationErrors, openLegalDialog = $bindable(false), formRef } = $props();
</script>

<!-- Default form: no content yet -->

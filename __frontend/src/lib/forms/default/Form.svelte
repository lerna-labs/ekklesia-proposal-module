<script>
  /** Default form placeholder. Accepts props so pages can use the same FormComponent interface for all form types. */
  let { vote, pillars, proposal, onSave, validationErrors, openLegalDialog = $bindable(false), formRef = $bindable() } = $props();
</script>

<!-- Default form: no content yet -->

<script>
  /** Same props interface as other proposal forms (e.g. budget2026) for registry compatibility. */
  let { vote, categories, proposal, onSave, validationErrors } = $props();
</script>

<div class="max-w-4xl mx-auto px-4 py-6 text-slate-600">
  <p>Default proposal form. Configure <code>formType</code> on the vote or add the vote slug to <code>$lib/forms/registry.js</code> to use a specific form (e.g. budget2026).</p>
</div>

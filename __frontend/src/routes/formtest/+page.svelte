<script>
  import Form from "$lib/budget2026/Form.svelte";
  let { data } = $props();
  let budget = $derived(data.budget);
</script>

<Form {budget} />

<script>
  import Form from "$lib/budget2026/Form.svelte";
  let { data } = $props();
  let budget = $derived(data.budget);
  let categories = $derived(data.categories);
</script>

<Form {budget} {categories} />

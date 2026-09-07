<script>
  let { children } = $props();
</script>

<div class="outline-border rounded-md bg-white p-3 outline">
  {@render children?.()}
</div>

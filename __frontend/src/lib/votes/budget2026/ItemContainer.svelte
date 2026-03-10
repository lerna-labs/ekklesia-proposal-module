<script>
  let { children } = $props();
</script>

<div class="bg-white rounded-md p-3 outline outline-border">
  {@render children?.()}
</div>

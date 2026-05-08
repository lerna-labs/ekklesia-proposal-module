<!--
  Full-viewport-centered spinner; appears only if `active` stays true past `delayMs`
  (avoids flashing the loader for fast dynamic imports).
-->
<script>
  import FormLoader from "./FormLoader.svelte";

  let { active = false, delayMs = 2000 } = $props();
  let visible = $state(false);

  $effect(() => {
    if (!active) {
      visible = false;
      return;
    }
    const id = setTimeout(() => {
      visible = true;
    }, delayMs);
    return () => clearTimeout(id);
  });
</script>

{#if visible}
  <div
    class="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
  >
    <FormLoader />
  </div>
{/if}

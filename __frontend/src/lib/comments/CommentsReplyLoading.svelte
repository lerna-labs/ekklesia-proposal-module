<script>
  import * as Card from "$lib/components/ui/card";
  import Loader2Icon from "@lucide/svelte/icons/loader-2";

  let { loading = false, delayMs = 2000 } = $props();

  let showSpinner = $state(false);

  $effect(() => {
    if (loading) {
      const id = setTimeout(() => {
        showSpinner = true;
      }, delayMs);
      return () => {
        clearTimeout(id);
        showSpinner = false;
      };
    } else {
      showSpinner = false;
    }
  });
</script>

{#if loading && showSpinner}
  <div class="mb-4 ml-6">
    <Card.Root class="border-muted">
      <Card.Content class="flex items-center justify-center gap-2 py-6">
        <Loader2Icon class="text-muted-foreground size-5 animate-spin" />
        <span class="text-muted-foreground text-sm">Loading replies…</span>
      </Card.Content>
    </Card.Root>
  </div>
{/if}

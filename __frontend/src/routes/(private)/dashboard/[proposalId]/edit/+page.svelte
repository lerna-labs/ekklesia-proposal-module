<script>
  import { goto } from "$app/navigation";
  import Form from "$lib/budget2026/Form.svelte";
  import { api } from "$stores/sessionManager.js";

  let { data } = $props();
  let proposal = $derived(data.proposal);
  let budget = $derived(data.budget);
  let categories = $derived(data.categories ?? []);
  let saving = $state(false);
  let saveError = $state(null);

  async function onSave(payload) {
    saveError = null;
    if (!proposal?._id) return;
    saving = true;
    try {
      const res = await api.fetch(fetch, `/proposals/${proposal._id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        goto("/dashboard");
      }
    } catch (err) {
      const msg = typeof err?.body === "string" ? err.body : err?.body?.message ?? err?.message ?? "Failed to save proposal.";
      saveError = msg;
    } finally {
      saving = false;
    }
  }
</script>

<div class="container mx-auto max-w-4xl py-8 px-4">
  <h1 class="text-2xl font-semibold mb-6">Edit proposal</h1>

  {#if saveError}
    <p class="text-sm text-destructive mb-4" role="alert">{saveError}</p>
  {/if}
  <Form {budget} {categories} proposal={proposal} onSave={onSave} />
  {#if saving}
    <p class="text-sm text-muted-foreground mt-4">Saving...</p>
  {/if}
</div>

<script>
  import { goto } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import Form from "$lib/budget2026/Form.svelte";
  import { api } from "$stores/sessionManager.js";

  let { data } = $props();
  let proposal = $derived(data.proposal);
  let budget = $derived(data.budget);
  let categories = $derived(data.categories ?? []);
  let saving = $state(false);

  async function onSave(payload) {
    if (!proposal?._id) return;
    if (!proposal?.budgetId) {
      toast.error("Proposal budget is missing.");
      return;
    }
    saving = true;
    try {
      const body = { ...payload, budgetId: proposal.budgetId };
      const res = await api.fetch(fetch, `/proposals/${proposal._id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success("Proposal saved.");
        goto("/dashboard");
      } else {
        const json = await res.json().catch(() => ({}));
        const msg = json?.message ?? "Failed to save proposal.";
        toast.error(msg);
      }
    } catch (err) {
      const msg =
        typeof err?.body === "string"
          ? err.body
          : (err?.body?.message ?? err?.message ?? "Failed to save proposal.");
      toast.error(msg);
    } finally {
      saving = false;
    }
  }
</script>

<div class="container mx-auto max-w-4xl py-8 px-4">
  <h1 class="text-2xl font-semibold mb-6">Edit proposal</h1>
</div>

<Form {budget} {categories} {proposal} {onSave} />

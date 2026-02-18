<script>
  import { goto } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import Form from "$lib/budget2026/Form.svelte";
  import { api } from "$stores/sessionManager.js";

  let { data } = $props();
  let budgets = $derived(data.budgets ?? []);
  let budget = $derived(data.budget);
  let categories = $derived(data.categories ?? []);
  let saving = $state(false);

  function onBudgetChange(budgetId) {
    goto(`/dashboard/new?budget=${budgetId}`);
  }

  async function onSave(payload) {
    if (!budget?._id) {
      toast.error("Please select a budget first.");
      return;
    }
    saving = true;
    try {
      const body = { ...payload, budgetId: budget._id };
      const res = await api.fetch(fetch, "/proposals", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await res.json();
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
  <h1 class="text-2xl font-semibold mb-6">New proposal</h1>
</div>

{#if budgets.length === 0}
  <p class="text-muted-foreground">No budgets available.</p>
{:else}
  <Form {budget} {budgets} {categories} {onSave} {onBudgetChange} />
{/if}

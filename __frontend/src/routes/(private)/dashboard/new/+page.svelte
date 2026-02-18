<script>
  import { goto } from "$app/navigation";
  import Form from "$lib/budget2026/Form.svelte";
  import * as Card from "$lib/components/ui/card";
  import * as Select from "$lib/components/ui/select";
  import { api } from "$stores/sessionManager.js";

  let { data } = $props();
  let budgets = $derived(data.budgets ?? []);
  let budget = $derived(data.budget);
  let categories = $derived(data.categories ?? []);
  let saving = $state(false);
  let saveError = $state(null);

  async function onSave(payload) {
    saveError = null;
    if (!budget?._id) {
      saveError = "Please select a budget first.";
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
  <h1 class="text-2xl font-semibold mb-6">New proposal</h1>

  {#if !budget}
    <Card.Root>
      <Card.Header>
        <Card.Title>Select a budget</Card.Title>
        <Card.Description>Choose the budget cycle for this proposal.</Card.Description>
      </Card.Header>
      <Card.Content>
        {#if budgets.length === 0}
          <p class="text-muted-foreground">No budgets available.</p>
        {:else}
          <Select.Root
            type="single"
            onValueChange={(v) => v && goto(`/dashboard/new?budget=${v}`)}
          >
            <Select.Trigger class="w-full max-w-sm" aria-label="Budget">
              <span class="line-clamp-1">Select budget...</span>
            </Select.Trigger>
            <Select.Content>
              {#each budgets as b (b._id)}
                <Select.Item value={b._id}>{b.title ?? b.name ?? b._id}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        {/if}
      </Card.Content>
    </Card.Root>
  {:else}
    <p class="text-sm text-muted-foreground mb-4">
      Budget: {budget.title ?? budget.name ?? budget._id}
      <a href="/dashboard/new" class="ml-2 text-primary hover:underline">Change</a>
    </p>
    {#if saveError}
      <p class="text-sm text-destructive mt-4" role="alert">{saveError}</p>
    {/if}
    <Form {budget} {categories} onSave={onSave} />
    {#if saving}
      <p class="text-sm text-muted-foreground mt-4">Saving...</p>
    {/if}
  {/if}
</div>

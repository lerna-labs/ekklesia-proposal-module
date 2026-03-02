<script>
  import { goto } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import { getFormForVote } from "$lib/forms/registry.js";
  import { api } from "$stores/sessionManager.js";

  let { data } = $props();
  let votes = $derived(data.votes ?? []);
  let vote = $derived(data.vote);
  let categories = $derived(data.categories ?? []);
  let saving = $state(false);
  let validationErrors = $state(null);
  let FormComponent = $derived(getFormForVote(vote));
</script>

<div class="container mx-auto max-w-4xl py-8 px-4">
  <h1 class="text-2xl font-semibold mb-6">New proposal</h1>
  <p>Introduction text here...</p>
</div>

{#if vote}
  <FormComponent {vote} {categories} bind:validationErrors />
{/if}

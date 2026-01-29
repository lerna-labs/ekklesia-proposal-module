<script>
  import * as Card from "$lib/components/ui/card";
  import * as Button from "$lib/components/ui/button";
  import PillarInfo from "$lib/PillarInfo.svelte";
  import BudgetConversion from "$lib/BudgetConversion.svelte";

  /** @type {import('./$types').PageProps} */
  let { data } = $props();

  let { budget, proposal, slug } = $derived(data);
</script>

<div class="container mx-auto max-w-4xl py-8 px-4">
  <div class="mb-6">
    <Button.Root
      type="button"
      variant="ghost"
      size="sm"
      onclick={() => history.back()}
    >
      ← Back to budget
    </Button.Root>
  </div>

  <Card.Root>
    <Card.Header>
      <Card.Title class="text-2xl">
        {proposal.title}
      </Card.Title>
      {#if proposal.description}
        <Card.Description class="mt-2">
          {proposal.description}
        </Card.Description>
      {/if}
    </Card.Header>
    <Card.Content class="space-y-4">
      {#if proposal.amount !== undefined}
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-muted-foreground">Amount:</span>
          <span class="text-sm font-semibold">
            ${proposal.amount?.toLocaleString() || "0"}
          </span>
        </div>
      {/if}
      {#if proposal.totalBudget !== undefined}
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-muted-foreground">
            Total Budget:
          </span>
          <BudgetConversion
            totalBudget={proposal.totalBudget}
            conversionRate={proposal.conversionRate}
            class="text-sm"
          />
        </div>
      {/if}
      {#if proposal.category}
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-muted-foreground">
            Category:
          </span>
          <span class="text-sm">{proposal.category.title}</span>
        </div>
      {/if}
      {#if proposal.status}
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-muted-foreground">Status:</span>
          <span class="text-sm">{proposal.status}</span>
        </div>
      {/if}
    </Card.Content>
  </Card.Root>

  <section class="mt-4">
    <PillarInfo {proposal} />
  </section>
</div>

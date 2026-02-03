<script>
  import * as Card from "$lib/components/ui/card";
  import * as Button from "$lib/components/ui/button";
  import BudgetConversion from "$lib/BudgetConversion.svelte";
  let { proposal, budgetSlug, class: className } = $props();

  const proposalHref = $derived(
    budgetSlug && (proposal._id || proposal.id)
      ? `/budget/${budgetSlug}/${proposal._id || proposal.id}`
      : null,
  );
</script>

<Card.Root class="hover:shadow-md transition-shadow {className || ''}">
  <Card.Header>
    <Card.Title class="text-lg">
      {proposal.title || proposal.name || "Untitled Proposal"}
    </Card.Title>
    {#if proposal.description}
      <Card.Description class="line-clamp-2">
        {proposal.description}
      </Card.Description>
    {/if}
  </Card.Header>
  <Card.Content class="space-y-2">
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
    {#if proposal.categoryTitle}
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-muted-foreground">Category:</span>
        <span class="text-sm">{proposal.categoryTitle}</span>
      </div>
    {/if}
    {#if proposal.status}
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-muted-foreground">Status:</span>
        <span class="text-sm">{proposal.status}</span>
      </div>
    {/if}
  </Card.Content>
  {#if proposalHref}
    <Card.Footer>
      <Button.Root
        href={proposalHref}
        variant="outline"
        size="sm"
        class="text-xs"
      >
        Read Proposal
      </Button.Root>
    </Card.Footer>
  {/if}
</Card.Root>

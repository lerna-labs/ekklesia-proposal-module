<script>
  import * as Card from "$lib/components/ui/card";
  import * as Button from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import BudgetConversion from "$lib/BudgetConversion.svelte";
  import { user } from "$stores/sessionManager.js";
  let { proposal, budget, categories = [], class: className } = $props();

  const isOwnProposal = $derived(
    $user?.userId &&
    proposal?.proposerId &&
    String(proposal.proposerId).trim() === String($user.userId).trim(),
  );

  const proposalHref = $derived(
    budget && (proposal._id || proposal.id)
      ? `/budgets/${budget.slug}/${proposal._id || proposal.id}`
      : null,
  );

  const categoryId = $derived(proposal?.metaData?.strategicFocusArea ?? null);
  const categoryLabel = $derived(
    categoryId && Array.isArray(categories)
      ? (categories.find(
          (c) => String(c._id) === String(categoryId),
        )?.title ?? null)
      : null,
  );
</script>

<Card.Root class="hover:shadow-md transition-shadow {className || ''}">
  <Card.Header>
    <Card.Title class="text-lg flex flex-wrap items-center gap-1">
      <span>{proposal.title || proposal.name || "Untitled Proposal"}</span>
      {#if isOwnProposal}
        <Badge class="bg-(--mbo-electric-blue) text-white uppercase text-xs border-transparent">Your Proposal</Badge>
      {/if}
      {#if proposal.status}
        <Badge class="bg-black text-white uppercase text-xs">
          {proposal.status}
        </Badge>
      {/if}
    </Card.Title>
    {#if proposal.summary}
      <Card.Description class="line-clamp-2">
        {proposal.summary}
      </Card.Description>
    {:else if proposal.description}
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
    {#if categoryLabel}
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-muted-foreground">Category:</span>
        <span class="text-sm">{categoryLabel}</span>
      </div>
    {/if}
    {#if proposal.metaData?.proposalType}
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-muted-foreground">Proposal type:</span>
        <span class="text-sm">{proposal.metaData.proposalType}</span>
      </div>
    {/if}
    {#if proposal.metaData?.initiativeType}
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-muted-foreground">Initiative type:</span>
        <span class="text-sm">{proposal.metaData.initiativeType}</span>
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

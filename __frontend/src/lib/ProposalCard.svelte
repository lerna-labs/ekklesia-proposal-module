<script>
  import { invalidateAll } from "$app/navigation";
  import * as Card from "$lib/components/ui/card";
  import * as Button from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import BudgetConversion from "$lib/BudgetConversion.svelte";
  import ProposalWithdrawal from "$lib/ProposalWithdrawal.svelte";
  import ProposalWithdrawn from "$lib/ProposalWithdrawn.svelte";
  import { user } from "$stores/sessionManager.js";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import MessageSquareIcon from "@lucide/svelte/icons/message-square";
  import FileTextIcon from "@lucide/svelte/icons/file-text";
  import Markdown from "$lib/base/Markdown.svelte";
  import { shortenString } from "$lib/utils.js";
  let {
    proposal,
    vote,
    categories = [],
    showLink = true,
    class: className,
  } = $props();

  const isOwnProposal = $derived(
    $user?.userId &&
      proposal?.proposerId &&
      String(proposal.proposerId).trim() === String($user.userId).trim(),
  );

  const isVoteAdmin = $derived(
    vote?._id &&
      $user?.adminVoteIds &&
      Array.isArray($user.adminVoteIds) &&
      $user.adminVoteIds.includes(String(vote._id)),
  );

  const canWithdraw = $derived(
    (isOwnProposal || isVoteAdmin) && proposal?.status === "live",
  );

  let withdrawOpen = $state(false);
  let withdrawalDetailsDialogOpen = $state(false);

  const proposalHref = $derived(
    vote && (proposal._id || proposal.id)
      ? `/votes/${vote.slug}/${proposal._id || proposal.id}`
      : null,
  );
  const commentsHref = $derived(proposalHref ? `${proposalHref}#comments` : null);
  const commentCount = $derived(
    proposal?.commentCount != null ? Number(proposal.commentCount) : null,
  );
  const proposerHref = $derived(
    vote?.slug && proposal?.proposerId
      ? `/votes/${vote.slug}?proposer=${encodeURIComponent(proposal.proposerId)}&page=1`
      : null,
  );

  const categoryId = $derived(proposal?.metaData?.strategicFocusArea ?? null);
  const categoryLabel = $derived(
    categoryId && Array.isArray(categories)
      ? (categories.find((c) => String(c._id) === String(categoryId))?.title ??
          null)
      : null,
  );
</script>

<Card.Root
  class="hover:shadow-md transition-shadow {className ||
    ''} {proposal?.status === 'withdrawnByProposer' ||
  proposal?.status === 'withdrawnByAdmin'
    ? 'bg-red-100/50'
    : ''}"
>
  <Card.Header>
    <Card.Title class="text-lg flex flex-wrap items-center gap-1">
      <span>{proposal.title || proposal.name || "Untitled Proposal"}</span>
      {#if isOwnProposal}
        <Badge
          class="bg-(--mbo-electric-blue) text-white uppercase text-xs border-transparent"
        >
          Your Proposal
        </Badge>
      {/if}
      {#if proposal.status}
        {#if proposal.status === "withdrawnByAdmin" || proposal.status === "withdrawnByProposer"}
          <button
            type="button"
            class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium uppercase bg-destructive text-white cursor-pointer hover:bg-destructive/90 border-0"
            aria-label="View withdrawal details"
            onclick={() => (withdrawalDetailsDialogOpen = true)}
          >
            {proposal.status === "withdrawnByAdmin"
              ? "Withdrawn by Admin"
              : "Withdrawn"}
          </button>
        {:else}
          <Badge class="uppercase text-xs bg-black text-white">
            {proposal.status}
          </Badge>
        {/if}
      {/if}
    </Card.Title>
    {#if proposal.summary}
      <Card.Description class="line-clamp-20 pb-2">
        <Markdown content={proposal.summary} />
      </Card.Description>
    {/if}
  </Card.Header>
  <Card.Content class="space-y-2">
    {#if proposal.proposerId}
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-muted-foreground">Proposer:</span>
        {#if proposerHref}
          <a
            href={proposerHref}
            class="text-sm font-semibold text-(--mbo-electric-blue) hover:underline cursor-pointer"
            title="Show all proposals by this proposer"
          >
            {shortenString(proposal.proposerId, 24, true)}
          </a>
        {:else}
          <span class="text-sm font-semibold">
            {shortenString(proposal.proposerId, 24, true)}
          </span>
        {/if}
      </div>
    {/if}

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
          conversionRate={proposal.metaData?.financialAndAdministrative
            ?.conversionRate}
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
        <span class="text-sm font-medium text-muted-foreground">
          Proposal type:
        </span>
        <span class="text-sm">{proposal.metaData.proposalType}</span>
      </div>
    {/if}
    {#if proposal.metaData?.initiativeType}
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-muted-foreground">
          Initiative type:
        </span>
        <span class="text-sm">{proposal.metaData.initiativeType}</span>
      </div>
    {/if}

    {#if proposal.withdrawalDetails}
      {@const wd = proposal.withdrawalDetails}
      {@const withdrawalDate = wd?.date
        ? new Date(wd.date).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "—"}
      <Card.Root class="bg-white mt-8">
        <Card.Header>
          <Card.Title>
            {proposal.status === "withdrawnByAdmin"
              ? "Proposal Withdrawn by Admin"
              : "Proposal Withdrawn by Proposer"}

            <span
              class="ml-1 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-black text-white"
            >
              {wd.category}
            </span>
          </Card.Title>
          <Card.Description>
            This proposal was withdrawn on {withdrawalDate}
          </Card.Description>
        </Card.Header>
        <Card.Content class="space-y-1 text-sm">
          {#if wd.comment}
            <div>
              <span class="font-medium text-muted-foreground">Comment:</span>
              <Markdown content={wd.comment} class="text-sm mt-0.5" />
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    {/if}
  </Card.Content>
  {#if (showLink && proposalHref) || canWithdraw || commentsHref}
    <Card.Footer class="flex flex-wrap items-center gap-2 justify-between">
      <div class="flex flex-wrap items-center gap-2">
        {#if showLink && proposalHref}
          <Button.Root
            href={proposalHref}
            variant="secondary"
            size="sm"
            class="text-xs bg-(--mbo-electric-blue) text-white hover:bg-(--mbo-cardano-blue) hover:border-(--mbo-cardano-blue)"
          >
            <FileTextIcon class="size-4 mr-1" />
            Read Proposal
          </Button.Root>
        {/if}
        {#if commentsHref}
          <Button.Root
            href={commentsHref}
            variant="secondary"
            size="sm"
            class="text-xs bg-(--mbo-electric-blue) text-white hover:bg-(--mbo-cardano-blue) hover:border-(--mbo-cardano-blue)"
            aria-label={commentCount != null
              ? `${commentCount} comment${commentCount === 1 ? "" : "s"}`
              : "View comments"}
          >
            <MessageSquareIcon class="size-4 mr-1" />
            {commentCount != null ? commentCount : "—"} comment{commentCount === 1 ? "" : "s"}
          </Button.Root>
        {/if}
      </div>
      {#if canWithdraw}
        <Button.Root
          variant="destructive"
          size="sm"
          class="ml-auto text-xs bg-destructive text-white hover:bg-destructive/90"
          aria-label="Withdraw proposal"
          title="Withdraw proposal"
          onclick={() => (withdrawOpen = true)}
        >
          <Trash2Icon class="size-4 mr-1" />
          Withdraw Proposal
        </Button.Root>
      {/if}
    </Card.Footer>
  {/if}
</Card.Root>

<ProposalWithdrawal
  bind:open={withdrawOpen}
  {proposal}
  onSuccess={() => invalidateAll()}
/>

{#if proposal?.status === "withdrawnByAdmin" || proposal?.status === "withdrawnByProposer"}
  <ProposalWithdrawn bind:open={withdrawalDetailsDialogOpen} {proposal} />
{/if}

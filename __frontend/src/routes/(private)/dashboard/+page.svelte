<script>
  import { goto, invalidateAll } from "$app/navigation";
  import { page } from "$app/state";
  import ProposalDelete from "$lib/ProposalDelete.svelte";
  import ProposalWithdrawal from "$lib/ProposalWithdrawal.svelte";
  import * as Card from "$lib/components/ui/card";
  import * as Pagination from "$lib/components/ui/pagination";
  import { formatUtcInstant } from "$lib/formatUtc.js";
  import { Button } from "$lib/components/ui/button";
  import ProposalWithdrawn from "$lib/ProposalWithdrawn.svelte";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import EyeIcon from "@lucide/svelte/icons/eye";
  import {
    draftSubmissionOpen,
    liveResubmitOpen,
    proposerWithdrawOpen,
    voteForProposalRow,
  } from "$lib/voteWindowPolicy.js";

  let { data } = $props();
  let user = $derived(data.user ?? null);
  let proposals = $derived(data.proposals.data);
  let proposalPagination = $derived(data.proposals.pagination);
  let voteSlugs = $derived(data.voteSlugs ?? {});
  let voteTitles = $derived(data.voteTitles ?? {});
  let votes = $derived(data.votes ?? []);
  /** Single instant for all policy checks (UTC timeline via Date). */
  let policyNow = $derived(new Date(data.policyNowMs ?? Date.now()));
  let primaryVote = $derived(votes[0] ?? null);
  let canCreateDraft = $derived(
    primaryVote ? draftSubmissionOpen(primaryVote, policyNow) : false,
  );

  const closedSubmissionTitle =
    "The submission period for this vote has ended (submission end date in UTC).";
  const closedReviewTitle =
    "The review period for this vote has ended; editing is not available (review end date in UTC).";
  const closedWithdrawTitle =
    "Proposer withdrawal is not allowed after the vote review period has ended.";

  let deleteDialogOpen = $state(false);
  let deleteProposal = $state(null);
  let withdrawDialogOpen = $state(false);
  let withdrawProposal = $state(null);
  let withdrawalDetailsDialogProposal = $state(null);
  let withdrawalDetailsDialogOpen = $state(false);

  function openWithdrawalDetailsDialog(proposal) {
    withdrawalDetailsDialogProposal = proposal;
    withdrawalDetailsDialogOpen = true;
  }

  function openDeleteDialog(proposal) {
    deleteProposal = proposal;
    deleteDialogOpen = true;
  }

  function openWithdrawDialog(proposal) {
    withdrawProposal = proposal;
    withdrawDialogOpen = true;
  }

  function navigatePage(pageNum) {
    const searchParams = new URLSearchParams(page.url.searchParams);
    searchParams.set("page", String(pageNum));
    goto(`${page.url.pathname}?${searchParams.toString()}`);
  }

  function formatStatus(status) {
    if (!status) return "";
    return status
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }

  function formatUpdatedAt(updatedAt) {
    return formatUtcInstant(updatedAt, { dateStyle: "short", timeStyle: "short" });
  }

  function displayTitle(proposal) {
    if (proposal.status === "draft" && !proposal.title?.trim()) return "Untitled Draft";
    return proposal.title ?? proposal._id;
  }

  function viewHref(proposal) {
    const slug = voteSlugs[proposal.voteId];
    if (!slug) return null;
    return `/votes/${slug}/${proposal._id}`;
  }
</script>

<div class="container mx-auto max-w-4xl py-8 px-4">
  <h1 class="mb-6">Dashboard</h1>

  <div class="space-y-6">
    {#if user}
      <Card.Root>
        <Card.Header>
          <Card.Title>Account</Card.Title>
        </Card.Header>
        <Card.Content class="flex flex-col gap-2">
          {#if user.name}
            <p class="text-sm">
              <span class="text-muted-foreground">Name/Handle:</span>
              <span class="ml-2 font-medium">{user.name}</span>
            </p>
          {/if}
          <p class="text-sm">
            <span class="text-muted-foreground">User ID:</span>
            <span class="ml-2 font-mono text-xs break-all">{user.userId}</span>
          </p>
        </Card.Content>
      </Card.Root>
    {/if}

    <Card.Root>
      <Card.Header
        class="flex flex-row flex-wrap items-center justify-between gap-3"
      >
        <Card.Title>
          My Proposals
          <span class="text-muted-foreground font-normal">
            ({proposalPagination.totalItems})
          </span>
        </Card.Title>
        {#if votes.length === 1}
          {#if canCreateDraft}
            <Button
              variant="outline"
              class="add-item-btn w-fit cursor-pointer gap-1 text-xs text-white"
              href="/dashboard/{votes[0].slug}/new"
              aria-label="New proposal"
              size="sm"
            >
              <PlusIcon class="size-4" />
              New proposal
            </Button>
          {:else}
            <Button
              variant="outline"
              class="add-item-btn w-fit gap-1 text-xs opacity-60"
              disabled
              aria-label="New proposal unavailable — submission period ended"
              title={closedSubmissionTitle}
              size="sm"
            >
              <PlusIcon class="size-4" />
              New proposal
            </Button>
          {/if}
        {:else if votes.length > 1}
          <div class="flex items-center gap-1">
            {#if canCreateDraft}
              <Button
                variant="outline"
                class="add-item-btn w-fit cursor-pointer gap-1 text-xs text-white"
                href="/dashboard/{votes[0].slug}/new"
                aria-label="New proposal"
                size="sm"
              >
                <PlusIcon class="size-4" />
                New proposal
              </Button>
            {:else}
              <Button
                variant="outline"
                class="add-item-btn w-fit gap-1 text-xs opacity-60"
                disabled
                aria-label="New proposal unavailable — submission period ended"
                title={closedSubmissionTitle}
                size="sm"
              >
                <PlusIcon class="size-4" />
                New proposal
              </Button>
            {/if}
            <!-- TODO: dropdown for other votes -->
          </div>
        {/if}
      </Card.Header>
      <Card.Content>
        {#if proposalPagination.totalItems === 0}
          <p class="text-center text-muted-foreground">
            You have not created any proposals yet.
          </p>
        {:else}
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border">
                  <th class="text-left font-medium py-3 pl-0 pr-4 align-top min-w-0">
                    Title
                  </th>
                  <th
                    class="text-left font-medium py-3 px-4 w-[1%] whitespace-nowrap align-top"
                  >
                    Last updated
                  </th>
                  <th
                    class="text-right font-medium py-3 pr-0 pl-4 w-[1%] whitespace-nowrap align-top"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {#each proposals as proposal, i (proposal._id)}
                  {@const slug = voteSlugs[proposal.voteId]}
                  {@const editHref = slug
                    ? `/dashboard/${slug}/${proposal._id}`
                    : null}
                  {@const rowVote = voteForProposalRow(proposal, votes)}
                  {@const isWithdrawn =
                    proposal.status === "withdrawnByProposer" ||
                    proposal.status === "withdrawnByAdmin"}
                  {@const canEdit =
                    !isWithdrawn &&
                    editHref &&
                    rowVote &&
                    (proposal.status === "draft"
                      ? draftSubmissionOpen(rowVote, policyNow)
                      : proposal.status === "live"
                        ? liveResubmitOpen(rowVote, policyNow)
                        : false)}
                  {@const canWithdrawLive =
                    proposal.status === "live" &&
                    rowVote &&
                    proposerWithdrawOpen(rowVote, policyNow)}
                  {@const editLockedTitle =
                    proposal.status === "draft"
                      ? closedSubmissionTitle
                      : closedReviewTitle}
                  {@const viewUrl = viewHref(proposal)}
                  {@const isLastRow = i === proposals.length - 1}
                  <tr
                    class="border-b hover:bg-muted/50 {isLastRow
                      ? 'border-border'
                      : 'border-border/50'}"
                  >
                    <td class="py-3 pl-0 pr-4 text-left align-top min-w-0">
                      <div class="flex flex-wrap items-start gap-2">
                        {#if isWithdrawn}
                          <span class="font-medium">
                            {displayTitle(proposal)}
                          </span>
                        {:else if canEdit && editHref}
                          <a
                            href={editHref}
                            class="text-primary hover:underline font-medium"
                          >
                            {displayTitle(proposal)}
                          </a>
                        {:else if editHref}
                          <span
                            class="font-medium text-muted-foreground"
                            title={editLockedTitle}
                          >
                            {displayTitle(proposal)}
                          </span>
                        {:else}
                          <span class="font-medium">
                            {displayTitle(proposal)}
                          </span>
                        {/if}
                        {#if isWithdrawn}
                          <button
                            type="button"
                            class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-destructive text-white cursor-pointer hover:bg-destructive/90"
                            aria-label="View withdrawal details"
                            onclick={() =>
                              openWithdrawalDetailsDialog(proposal)}
                          >
                            {proposal.status === "withdrawnByAdmin"
                              ? "Withdrawn by Admin"
                              : "Withdrawn"}
                          </button>
                        {:else}
                          <span
                            class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-white {proposal.status === 'live'
                              ? 'bg-green-600'
                              : 'bg-black'}"
                          >
                            {formatStatus(proposal.status)}
                          </span>
                        {/if}
                      </div>
                    </td>
                    <td
                      class="py-3 px-4 w-[1%] text-muted-foreground whitespace-nowrap align-top"
                    >
                      {formatUpdatedAt(proposal.updatedAt)}
                    </td>
                    <td
                      class="py-3 pr-0 pl-4 w-[1%] whitespace-nowrap text-right align-top"
                    >
                      <div class="inline-flex items-center justify-end gap-1">
                        {#if isWithdrawn}
                          <Button
                            variant="outline"
                            size="icon"
                            disabled
                            aria-label="Edit proposal"
                            title="Cannot edit withdrawn proposal"
                          >
                            <PencilIcon class="size-4" />
                          </Button>
                        {:else if canEdit && editHref}
                          <Button
                            variant="outline"
                            size="icon"
                            href={editHref}
                            aria-label="Edit proposal"
                            title="Edit proposal"
                          >
                            <PencilIcon class="size-4" />
                          </Button>
                        {:else if editHref}
                          <Button
                            variant="outline"
                            size="icon"
                            disabled
                            aria-label="Edit proposal unavailable"
                            title={editLockedTitle}
                          >
                            <PencilIcon class="size-4" />
                          </Button>
                        {:else}
                          <Button
                            variant="outline"
                            size="icon"
                            disabled
                            aria-label="Edit proposal"
                            title="Edit (vote slug unknown)"
                          >
                            <PencilIcon class="size-4" />
                          </Button>
                        {/if}
                        {#if viewUrl}
                          <Button
                            variant="outline"
                            size="icon"
                            href={viewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="View proposal"
                            title="View proposal"
                          >
                            <EyeIcon class="size-4" />
                          </Button>
                        {:else}
                          <Button
                            variant="outline"
                            size="icon"
                            disabled
                            aria-label="View proposal"
                            title="View proposal (no vote slug)"
                          >
                            <EyeIcon class="size-4" />
                          </Button>
                        {/if}
                        {#if proposal.status === "draft"}
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="Delete draft"
                            title="Delete draft proposal"
                            onclick={() => openDeleteDialog(proposal)}
                          >
                            <Trash2Icon class="size-4 text-black" />
                          </Button>
                        {:else if proposal.status === "live"}
                          {#if canWithdrawLive}
                            <Button
                              variant="outline"
                              size="icon"
                              aria-label="Withdraw proposal"
                              title="Withdraw proposal"
                              onclick={() => openWithdrawDialog(proposal)}
                            >
                              <Trash2Icon class="size-4 text-black" />
                            </Button>
                          {:else}
                            <Button
                              variant="outline"
                              size="icon"
                              disabled
                              aria-label="Withdraw proposal unavailable"
                              title={closedWithdrawTitle}
                            >
                              <Trash2Icon class="size-4 text-black opacity-50" />
                            </Button>
                          {/if}
                        {:else if isWithdrawn}
                          <Button
                            variant="outline"
                            size="icon"
                            disabled
                            aria-label="Delete"
                            title="Cannot delete withdrawn proposal"
                          >
                            <Trash2Icon class="size-4 text-black" />
                          </Button>
                        {/if}
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          {#if proposalPagination.totalPages > 1}
            <div class="px-6 pb-2 mt-8">
              <Pagination.Root
                count={proposalPagination.totalItems}
                page={proposalPagination.currentPage}
                perPage={proposalPagination.itemsPerPage || 10}
                onPageChange={(pageNum) => navigatePage(pageNum)}
              >
                {#snippet children({ pages, currentPage })}
                  <Pagination.Content>
                    <Pagination.Item>
                      <Pagination.Previous />
                    </Pagination.Item>
                    {#each pages as p (p.key)}
                      {#if p.type === "ellipsis"}
                        <Pagination.Item>
                          <Pagination.Ellipsis />
                        </Pagination.Item>
                      {:else}
                        <Pagination.Item>
                          <Pagination.Link
                            page={p}
                            isActive={currentPage === p.value}
                          >
                            {p.value}
                          </Pagination.Link>
                        </Pagination.Item>
                      {/if}
                    {/each}
                    <Pagination.Item>
                      <Pagination.Next />
                    </Pagination.Item>
                  </Pagination.Content>
                {/snippet}
              </Pagination.Root>
            </div>
          {/if}
        {/if}
      </Card.Content>
    </Card.Root>
  </div>
</div>

<ProposalDelete
  bind:open={deleteDialogOpen}
  proposal={deleteProposal}
  onSuccess={() => invalidateAll()}
/>
<ProposalWithdrawal
  bind:open={withdrawDialogOpen}
  proposal={withdrawProposal}
  onSuccess={() => invalidateAll()}
/>

<ProposalWithdrawn
  bind:open={withdrawalDetailsDialogOpen}
  proposal={withdrawalDetailsDialogProposal}
/>

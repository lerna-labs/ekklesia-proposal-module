<script>
  import { goto, invalidateAll } from "$app/navigation";
  import { page } from "$app/state";
  import { logout } from "$stores/sessionManager.js";
  import ProposalWithdrawal from "$lib/ProposalWithdrawal.svelte";
  import { formatAda } from "$lib/utils.js";
  import * as Card from "$lib/components/ui/card";
  import * as Pagination from "$lib/components/ui/pagination";
  import * as Button from "$lib/components/ui/button";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import EyeIcon from "@lucide/svelte/icons/eye";
  import LogOutIcon from "@lucide/svelte/icons/log-out";

  let { data } = $props();
  let user = $derived(data.user ?? null);
  let proposals = $derived(data.proposals.data);
  let proposalPagination = $derived(data.proposals.pagination);
  let voteSlugs = $derived(data.voteSlugs ?? {});
  let voteTitles = $derived(data.voteTitles ?? {});

  let withdrawDialogOpen = $state(false);
  let withdrawProposal = $state(null);

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
    if (!updatedAt) return "—";
    const d = new Date(updatedAt);
    return Number.isNaN(d.getTime())
      ? "—"
      : d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  }

  function viewHref(proposal) {
    const slug = voteSlugs[proposal.voteId];
    if (!slug) return null;
    return `/votes/${slug}/${proposal._id}`;
  }
</script>

<div class="container mx-auto max-w-4xl py-8 px-4">
  <h1 class="text-2xl font-semibold mb-6">Dashboard</h1>

  <div class="space-y-6">
    {#if user}
      <Card.Root>
        <Card.Header
          class="flex flex-row flex-wrap items-center justify-between gap-3"
        >
          <Card.Title>Account</Card.Title>
          <Button.Root
            variant="outline"
            class="add-item-btn w-fit cursor-pointer gap-1 text-xs text-white"
            aria-label="Log out"
            size="sm"
            onclick={() => logout()}
          >
            <LogOutIcon class="size-4" />
            Log out
          </Button.Root>
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
          My proposals
          <span class="text-muted-foreground font-normal">
            ({proposalPagination.totalItems})
          </span>
        </Card.Title>
        <Button.Root
          variant="outline"
          class="add-item-btn w-fit cursor-pointer gap-1 text-xs text-white"
          href="/dashboard/new"
          aria-label="New proposal"
          size="sm"
        >
          <PlusIcon class="size-4" />
          New proposal
        </Button.Root>
      </Card.Header>
      <Card.Content>
        {#if !proposals || proposals.length === 0}
          <p class="text-center text-muted-foreground">
            You have not created any proposals yet.
          </p>
        {:else}
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border">
                  <th class="text-left font-medium py-3 pl-0 pr-4">Title</th>
                  <th class="text-right font-medium py-3 px-4">Vote</th>
                  <th class="text-left font-medium py-3 px-4">Last updated</th>
                  <th class="text-right font-medium py-3 pr-0 pl-4 w-[1%]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {#each proposals as proposal, i (proposal._id)}
                  {@const editHref = `/dashboard/${proposal._id}/edit`}
                  {@const viewUrl = viewHref(proposal)}
                  {@const isLastRow = i === proposals.length - 1}
                  <tr
                    class="border-b hover:bg-muted/50 {isLastRow
                      ? 'border-border'
                      : 'border-border/50'}"
                  >
                    <td class="py-3 pl-0 pr-4 text-left">
                      <div class="flex flex-wrap items-center gap-2">
                        <a
                          href={editHref}
                          class="text-primary hover:underline font-medium"
                        >
                          {proposal.title ?? proposal._id}
                        </a>
                        <span
                          class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-black text-white"
                        >
                          {formatStatus(proposal.status)}
                        </span>
                      </div>
                    </td>
                    <td class="py-3 px-4 text-right tabular-nums">
                      {proposal.totalBudget != null
                        ? `${formatAda(proposal.totalBudget)} ADA`
                        : "—"}
                    </td>
                    <td class="py-3 px-4 text-muted-foreground">
                      {formatUpdatedAt(proposal.updatedAt)}
                    </td>
                    <td class="py-3 pr-0 pl-4 text-right">
                      <div class="flex items-center justify-end gap-1">
                        <Button.Root
                          variant="outline"
                          size="icon"
                          href={editHref}
                          aria-label="Edit"
                        >
                          <PencilIcon class="size-4" />
                        </Button.Root>
                        {#if proposal.status === "live" || proposal.status === "draft"}
                          <Button.Root
                            variant="outline"
                            size="icon"
                            aria-label="Withdraw"
                            title="Withdraw"
                            onclick={() => openWithdrawDialog(proposal)}
                          >
                            <Trash2Icon class="size-4 text-black" />
                          </Button.Root>
                        {/if}
                        {#if viewUrl}
                          <Button.Root
                            variant="outline"
                            size="icon"
                            href={viewUrl}
                            aria-label="View"
                            title="View"
                          >
                            <EyeIcon class="size-4" />
                          </Button.Root>
                        {:else}
                          <Button.Root
                            variant="outline"
                            size="icon"
                            disabled
                            aria-label="View"
                            title="View (no vote slug)"
                          >
                            <EyeIcon class="size-4" />
                          </Button.Root>
                        {/if}
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          {#if proposalPagination.totalPages > 1}
            <div class="px-6 pb-6">
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

<ProposalWithdrawal
  bind:open={withdrawDialogOpen}
  proposal={withdrawProposal}
  onSuccess={() => invalidateAll()}
/>

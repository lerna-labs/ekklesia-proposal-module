<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import * as Card from "$lib/components/ui/card";
  import * as Pagination from "$lib/components/ui/pagination";
  import * as Separator from "$lib/components/ui/separator";
  import ProposalCard from "$lib/ProposalCard.svelte";
  import { Button } from "$lib/components/ui/button";
  import Search from "$lib/Search.svelte";
  import SearchFilter from "$lib/SearchFilter.svelte";
  import SearchSort from "$lib/SearchSort.svelte";
  import { shortenString } from "$lib/utils.js";
  import VoteCTA from "$lib/votes/VoteCTA.svelte";
  import XIcon from "@lucide/svelte/icons/x";
  let { data } = $props();
  let vote = $derived(data.vote);
  let proposals = $derived(data.proposals.data);
  let proposalPagination = $derived(data.proposals.pagination);
  let pillars = $derived(data.pillars ?? []);
  const DEFAULT_SORT = "submittedAt";
  const sortFromData = $derived(data.listState?.sort ?? DEFAULT_SORT);
  const ascendingFromData = $derived(
    (data.listState?.direction ?? "asc") !== "desc",
  );
  let sort = $state("submittedAt");
  let ascending = $state(true);
  $effect(() => {
    sort = sortFromData;
    ascending = ascendingFromData;
  });

  const voteSlug = $derived(page.params.voteSlug ?? "");
  const listStateKey = $derived(voteSlug ? `votes.listState.${voteSlug}` : "");
  const LIST_PARAM_KEYS = [
    "search",
    "sort",
    "direction",
    "limit",
    "status",
    "category",
    "proposer",
  ];
  function hasListParams(searchParams) {
    return LIST_PARAM_KEYS.some((k) => searchParams.get(k));
  }
  function getListQueryString(searchParams) {
    const q = new URLSearchParams();
    for (const k of LIST_PARAM_KEYS) {
      const v = searchParams.get(k);
      if (v) q.set(k, v);
    }
    return q.toString();
  }
  let hasTriggeredRestore = false;
  $effect(() => {
    if (typeof window === "undefined" || !listStateKey) return;
    const searchParams = page.url.searchParams;
    if (hasListParams(searchParams)) {
      hasTriggeredRestore = false;
      const qs = getListQueryString(searchParams);
      if (qs) localStorage.setItem(listStateKey, qs);
    } else {
      const saved = localStorage.getItem(listStateKey);
      if (saved && !hasTriggeredRestore) {
        hasTriggeredRestore = true;
        const restored = new URLSearchParams(saved);
        restored.set("page", "1");
        const path = page.url.pathname;
        goto(`${path}?${restored.toString()}`, { replaceState: true });
      }
    }
  });

  const proposerId = $derived(page.url.searchParams.get("proposer") ?? "");
  const shortProposerId = $derived(shortenString(proposerId, 12, true));

  function navigate(pageNum) {
    const pathname = page.url.pathname;
    const searchParams = new URLSearchParams(page.url.searchParams);
    searchParams.set("page", String(pageNum));
    const url = `${pathname}?${searchParams.toString()}`;
    goto(url);
  }

  function clearSearchFromStorage() {
    if (typeof window === "undefined" || !listStateKey) return;
    const saved = localStorage.getItem(listStateKey);
    if (!saved) return;
    const params = new URLSearchParams(saved);
    params.delete("search");
    const qs = params.toString();
    if (qs) localStorage.setItem(listStateKey, qs);
    else localStorage.removeItem(listStateKey);
  }

  function clearProposerFilter() {
    const pathname = page.url.pathname;
    const searchParams = new URLSearchParams(page.url.searchParams);
    searchParams.delete("proposer");
    searchParams.set("page", "1");
    const qs = searchParams.toString();
    if (listStateKey && typeof window !== "undefined") {
      localStorage.setItem(listStateKey, qs);
    }
    goto(qs ? `${pathname}?${qs}` : pathname);
  }

  /** Capture scroll position so it can be restored when navigating back (e.g. from proposal page). */
  export const snapshot = {
    capture: () =>
      typeof window !== "undefined" ? { y: window.scrollY } : { y: 0 },
    restore: (value) => {
      if (typeof window !== "undefined" && value?.y != null) {
        requestAnimationFrame(() =>
          window.scrollTo({ top: value.y, behavior: "instant" }),
        );
      }
    },
  };
</script>

<div class="container mx-auto max-w-4xl py-8 px-4">
  <!-- Vote/Ballot Info -->
  <div class="mb-8">
    <h1 class="text-2xl font-semibold">
      {vote.name || vote.title || "Vote"}
    </h1>
    <!-- {#if vote.description}
      <p class="text-muted-foreground mt-2">{vote.description}</p>
    {/if} -->

    <VoteCTA voteSlug={voteSlug} />

    <div class="mt-4 space-y-2">
      {#if vote.year}
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-muted-foreground">Year:</span>
          <span class="text-sm">{vote.year}</span>
        </div>
      {/if}
      {#if vote.totalAmount !== undefined}
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-muted-foreground">
            Total Amount:
          </span>
          <span class="text-sm font-semibold">
            ${vote.totalAmount?.toLocaleString() || "0"}
          </span>
        </div>
      {/if}
      {#if vote.status}
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-muted-foreground">Status:</span>
          <span class="text-sm">{vote.status}</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Proposals Section -->
  <div class="space-y-6">
    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <h2 class="text-xl font-medium flex flex-wrap items-center gap-2">
        {#if shortProposerId}
          Proposals from {shortProposerId}
        {:else}
          Proposals
        {/if}
        <span class="text-muted-foreground font-normal">
          ({proposalPagination.totalItems})
        </span>
        {#if shortProposerId}
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="text-xs h-7 pl-0 pr-2 gap-1 bg-(--mbo-orange) text-white border-(--mbo-orange) hover:bg-(--mbo-dark-orange) hover:text-white hover:border-(--mbo-dark-orange)"
            onclick={clearProposerFilter}
          >
            <XIcon class="size-3.5 shrink-0 -ml-1" aria-hidden="true" />
            Show all
          </Button>
        {/if}
      </h2>
      <div class="flex items-center gap-1">
        <Search
          placeholder="Search proposals..."
          class="w-full sm:w-64"
          onBeforeClear={clearSearchFromStorage}
        />
        <SearchFilter
          filterOptions={vote.filterOptions ?? []}
          {vote}
          voteId={vote._id}
        />
        <SearchSort
          sortOptions={vote?.sortOptions ?? []}
          bind:sort
          bind:ascending
        />
      </div>
    </div>

    {#if !proposals || proposals.length === 0}
      <Card.Root>
        <Card.Content class="py-12 text-center">
          <p class="text-muted-foreground">No proposals found for this vote.</p>
        </Card.Content>
      </Card.Root>
    {:else}
      <!-- Proposals List -->
      <div class="space-y-4">
        {#each proposals as proposal (proposal._id || proposal.id)}
          <ProposalCard {proposal} {vote} />
        {/each}
      </div>

      <!-- Pagination -->
      {#if proposalPagination.totalPages > 1}
        <Pagination.Root
          count={proposalPagination.totalItems}
          page={proposalPagination.currentPage}
          perPage={proposalPagination.itemsPerPage || 10}
          onPageChange={(pageNum) => navigate(pageNum)}
        >
          {#snippet children({ pages, currentPage })}
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous />
              </Pagination.Item>
              {#each pages as page (page.key)}
                {#if page.type === "ellipsis"}
                  <Pagination.Item>
                    <Pagination.Ellipsis />
                  </Pagination.Item>
                {:else}
                  <Pagination.Item>
                    <Pagination.Link
                      {page}
                      isActive={currentPage === page.value}
                    >
                      {page.value}
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
      {/if}
    {/if}
  </div>
</div>

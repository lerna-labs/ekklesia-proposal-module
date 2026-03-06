<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import * as Card from "$lib/components/ui/card";
  import * as Pagination from "$lib/components/ui/pagination";
  import * as Separator from "$lib/components/ui/separator";
  import ProposalCard from "$lib/ProposalCard.svelte";
  import Search from "$lib/Search.svelte";
  import SearchFilter from "$lib/SearchFilter.svelte";
  import SearchSort from "$lib/SearchSort.svelte";
  import { shortenString } from "$lib/utils.js";
  let { data } = $props();
  let vote = $derived(data.vote);
  let proposals = $derived(data.proposals.data);
  let proposalPagination = $derived(data.proposals.pagination);
  let pillars = $derived(data.pillars ?? []);
  let sort = $state("title");
  let ascending = $state(true);

  const proposerId = $derived(page.url.searchParams.get("proposer") ?? "");
  const shortProposerId = $derived(shortenString(proposerId, 12, true));

  function navigate(pageNum) {
    const pathname = page.url.pathname;
    const searchParams = new URLSearchParams(page.url.searchParams);
    searchParams.set("page", String(pageNum));
    const url = `${pathname}?${searchParams.toString()}`;
    goto(url);
  }
</script>

<div class="container mx-auto max-w-4xl py-8 px-4">
  <!-- Vote/Ballot Info -->
  <div class="mb-8">
    <h1 class="text-2xl font-semibold">
      {vote.name || vote.title || "Vote"}
    </h1>
    {#if vote.description}
      <p class="text-muted-foreground mt-2">{vote.description}</p>
    {/if}
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
      <h2 class="text-xl font-medium">
        {#if shortProposerId}
          Proposals from {shortProposerId}
        {:else}
          Proposals
        {/if}
        <span class="text-muted-foreground font-normal">
          ({proposalPagination.totalItems})
        </span>
      </h2>
      <div class="flex items-center gap-1">
        <Search placeholder="Search proposals..." class="w-full sm:w-64" />
        <SearchFilter categories={pillars} voteId={vote._id} />
        <SearchSort sortOptions={vote?.sortOptions ?? []} bind:sort bind:ascending />
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
          <ProposalCard {proposal} {vote} {pillars} />
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

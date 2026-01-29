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

  /** @type {import('./$types').PageProps} */
  let { data } = $props();

  let budget = $derived(data.budget);
  let proposals = $derived(data.proposals.data);
  let proposalPagination = $derived(data.proposals.pagination);
  let selectedFilters = $state([]);
  let sort = $state("title");
  let ascending = $state(true);

  const filterOptions = [
    { value: "category", label: "Category" },
    { value: "status", label: "Status" },
    { value: "amount", label: "Amount" },
  ];

  /**
   * Navigate to a specific page of proposals. Updates the URL with ?page=N and triggers a reload.
   * @param {number} pageNum - The page number to navigate to (1-based).
   */
  function navigate(pageNum) {
    const pathname = page.url.pathname;
    const searchParams = new URLSearchParams(page.url.searchParams);
    searchParams.set("page", String(pageNum));
    const url = `${pathname}?${searchParams.toString()}`;
    goto(url);
  }
</script>

<div class="container mx-auto max-w-4xl py-8 px-4">
  <!-- Budget/Ballot Info -->
  <Card.Root class="mb-8">
    <Card.Header>
      <Card.Title class="text-2xl">
        {budget.name || budget.title || "Budget"}
      </Card.Title>
      {#if budget.description}
        <Card.Description>{budget.description}</Card.Description>
      {/if}
    </Card.Header>
    <Card.Content class="space-y-4">
      {#if budget.year}
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-muted-foreground">Year:</span>
          <span class="text-sm">{budget.year}</span>
        </div>
      {/if}
      {#if budget.totalAmount !== undefined}
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-muted-foreground">
            Total Amount:
          </span>
          <span class="text-sm font-semibold">
            ${budget.totalAmount?.toLocaleString() || "0"}
          </span>
        </div>
      {/if}
      {#if budget.status}
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-muted-foreground">Status:</span>
          <span class="text-sm">{budget.status}</span>
        </div>
      {/if}
    </Card.Content>
  </Card.Root>

  <Separator.Root class="mb-8" />

  <!-- Proposals Section -->
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h2 class="text-xl font-semibold">
        Proposals
        <span class="text-muted-foreground font-normal">
          ({proposalPagination.totalItems})
        </span>
      </h2>
      <div class="flex items-center gap-2">
        <Search placeholder="Search proposals..." class="w-full sm:w-64" />
        <SearchFilter filters={filterOptions} bind:selected={selectedFilters} />
        <SearchSort bind:sort bind:ascending />
      </div>
    </div>

    {#if !proposals || proposals.length === 0}
      <Card.Root>
        <Card.Content class="py-12 text-center">
          <p class="text-muted-foreground">
            No proposals found for this budget.
          </p>
        </Card.Content>
      </Card.Root>
    {:else}
      <!-- Proposals List -->
      <div class="space-y-4">
        {#each proposals as proposal (proposal._id || proposal.id)}
          <ProposalCard {proposal} budgetSlug={data.slug} />
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

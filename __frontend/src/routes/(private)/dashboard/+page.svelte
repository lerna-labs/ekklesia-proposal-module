<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import * as Card from "$lib/components/ui/card";
  import * as Pagination from "$lib/components/ui/pagination";
  import * as Select from "$lib/components/ui/select";
  import * as Button from "$lib/components/ui/button";
  import ArrowUpDownIcon from "@lucide/svelte/icons/arrow-up-down";

  let { data } = $props();
  let proposals = $derived(data.proposals.data);
  let proposalPagination = $derived(data.proposals.pagination);
  let budgetTitles = $derived(data.budgetTitles ?? {});
  let budgetSlugs = $derived(data.budgetSlugs ?? {});

  const SORT_OPTIONS = [
    { value: "title", label: "Title" },
    { value: "status", label: "Status" },
    { value: "date", label: "Date" },
    { value: "amount", label: "Amount" },
  ];

  const currentSort = $derived(page.url.searchParams.get("sort") ?? "date");
  const currentDirection = $derived(page.url.searchParams.get("direction") ?? "desc");

  function navigatePage(pageNum) {
    const searchParams = new URLSearchParams(page.url.searchParams);
    searchParams.set("page", String(pageNum));
    goto(`${page.url.pathname}?${searchParams.toString()}`);
  }

  function applySort(sort, direction) {
    const searchParams = new URLSearchParams(page.url.searchParams);
    searchParams.set("sort", sort);
    searchParams.set("direction", direction);
    searchParams.set("page", "1");
    goto(`${page.url.pathname}?${searchParams.toString()}`);
  }

  function proposalHref(proposal) {
    const slug = budgetSlugs[proposal.budgetId];
    if (slug) return `/budgets/${slug}/${proposal._id}`;
    return null;
  }

  function formatStatus(status) {
    if (!status) return "";
    return status
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }
</script>

<div class="container mx-auto max-w-4xl py-8 px-4">
  <h1 class="text-2xl font-semibold mb-6">Dashboard</h1>

  <div class="space-y-6">
    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-3">
        <h2 class="text-xl font-semibold">
          My proposals
          <span class="text-muted-foreground font-normal">
            ({proposalPagination.totalItems})
          </span>
        </h2>
        <Button.Root variant="default" href="/dashboard/new">
          New proposal
        </Button.Root>
      </div>
      <div class="flex items-center gap-2">
        <Select.Root
          type="single"
          value={currentSort}
          onValueChange={(v) => v != null && applySort(v, currentDirection)}
        >
          <Select.Trigger class="w-[140px]" aria-label="Sort by">
            <ArrowUpDownIcon class="size-4 opacity-50 mr-1" />
            <span class="line-clamp-1">{SORT_OPTIONS.find((o) => o.value === currentSort)?.label ?? "Sort by"}</span>
          </Select.Trigger>
          <Select.Content>
            {#each SORT_OPTIONS as option (option.value)}
              <Select.Item value={option.value}>{option.label}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
        <Button.Root
          variant="outline"
          size="sm"
          onclick={() => applySort(currentSort, currentDirection === "desc" ? "asc" : "desc")}
          aria-label="Toggle sort direction"
        >
          {currentDirection === "desc" ? "Desc" : "Asc"}
        </Button.Root>
      </div>
    </div>

    {#if !proposals || proposals.length === 0}
      <Card.Root>
        <Card.Content class="py-12 text-center">
          <p class="text-muted-foreground">
            You have not created any proposals yet.
          </p>
        </Card.Content>
      </Card.Root>
    {:else}
      <Card.Root>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left font-medium py-3 px-4">Budget</th>
                <th class="text-left font-medium py-3 px-4">Title</th>
                <th class="text-left font-medium py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {#each proposals as proposal (proposal._id)}
                {@const href = proposalHref(proposal)}
                {@const editHref = `/dashboard/${proposal._id}/edit`}
                <tr class="border-b border-border/50 hover:bg-muted/50">
                  <td class="py-3 px-4 text-muted-foreground">
                    {budgetTitles[proposal.budgetId] ?? proposal.budgetId}
                  </td>
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                      {#if href}
                        <a href={href} class="text-primary hover:underline font-medium">
                          {proposal.title ?? proposal._id}
                        </a>
                      {:else}
                        <span class="font-medium">{proposal.title ?? proposal._id}</span>
                      {/if}
                      <a href={editHref} class="text-sm text-muted-foreground hover:underline">Edit</a>
                    </div>
                  </td>
                  <td class="py-3 px-4">
                    <span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-muted">
                      {formatStatus(proposal.status)}
                    </span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </Card.Root>

      {#if proposalPagination.totalPages > 1}
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
      {/if}
    {/if}
  </div>
</div>

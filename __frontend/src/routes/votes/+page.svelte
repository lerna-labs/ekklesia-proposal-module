<script>
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import * as Card from "$lib/components/ui/card";
  import * as Button from "$lib/components/ui/button";
  import * as Pagination from "$lib/components/ui/pagination";

  let { data } = $props();
  let votes = $derived(data.votes ?? []);
  let meta = $derived(data.meta ?? {});

  function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { dateStyle: "medium" });
  }

  function navigate(pageNum) {
    const pathname = page.url.pathname;
    const searchParams = new URLSearchParams(page.url.searchParams);
    searchParams.set("page", String(pageNum));
    goto(`${pathname}?${searchParams.toString()}`);
  }
</script>

<div class="container mx-auto max-w-4xl py-8 px-4">
  <div class="mb-8">
    <h1 class="text-3xl font-semibold tracking-tight">Votes</h1>
    <p class="text-muted-foreground mt-1">
      Browse vote cycles and view proposals.
    </p>
  </div>

  {#if !votes.length}
    <Card.Root>
      <Card.Content class="py-12 text-center">
        <p class="text-muted-foreground">No votes found.</p>
      </Card.Content>
    </Card.Root>
  {:else}
    <ul class="space-y-4">
      {#each votes as vote (vote._id)}
        <li>
          <Card.Root class="overflow-hidden transition-shadow hover:shadow-md">
            <a href="/votes/{vote.slug ?? vote._id}" class="block">
              <Card.Header>
                <Card.Title class="text-xl">
                  {vote.title ?? "Untitled vote"}
                </Card.Title>
                {#if vote.description}
                  <Card.Description class="line-clamp-2">
                    {vote.description}
                  </Card.Description>
                {/if}
              </Card.Header>
              <Card.Content class="pt-0">
                <dl
                  class="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground"
                >
                  {#if vote.submissionStartDate || vote.submissionEndDate}
                    <div class="flex gap-1">
                      <dt>Submission:</dt>
                      <dd>
                        {formatDate(vote.submissionStartDate)} – {formatDate(
                          vote.submissionEndDate,
                        )}
                      </dd>
                    </div>
                  {/if}
                  {#if vote.slug}
                    <div class="flex gap-1">
                      <dt>Slug:</dt>
                      <dd class="font-mono text-xs">{vote.slug}</dd>
                    </div>
                  {/if}
                </dl>
              </Card.Content>
              <Card.Footer class="border-t pt-4">
                <Button.Root variant="ghost" size="sm" class="w-fit">
                  View proposals →
                </Button.Root>
              </Card.Footer>
            </a>
          </Card.Root>
        </li>
      {/each}
    </ul>

    {#if meta.totalPages > 1}
      <div class="mt-8">
        <Pagination.Root
          count={meta.total}
          page={meta.page}
          perPage={meta.limit}
          onPageChange={(pageNum) => navigate(pageNum)}
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
</div>

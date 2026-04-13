<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { queryStringWithLiteralCommas } from "$lib/utils.js";
  import * as Popover from "$lib/components/ui/popover";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as RadioGroup from "$lib/components/ui/radio-group";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Separator from "$lib/components/ui/separator";
  import ArrowUpDownIcon from "@lucide/svelte/icons/arrow-up-down";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import CheckIcon from "@lucide/svelte/icons/check";

  const DEFAULT_SORT = "submittedAt";

  /** @type {{ sortOptions: { value: string, label: string, field?: string }[], sort?: string, ascending?: boolean, class?: string }} */
  let {
    sortOptions = [],
    sort = $bindable("submittedAt"),
    ascending = $bindable(true),
    class: className = "",
  } = $props();

  const PER_PAGE_OPTIONS = [10, 25, 50, 100];
  const defaultLimit = "10";

  let open = $state(false);
  let pendingSort = $state("submittedAt");
  let pendingDirection = $state("down");
  let pendingLimit = $state("10");

  $effect(() => {
    const valid = new Set(sortOptions.map((o) => o.value));
    const urlSort = page.url.searchParams.get("sort");
    const resolvedSort = urlSort && valid.has(urlSort) ? urlSort : DEFAULT_SORT;
    const urlDirection = page.url.searchParams.get("direction") ?? "desc";
    const urlLimit = page.url.searchParams.get("limit") ?? defaultLimit;
    const resolvedAscending = urlDirection !== "desc";
    const resolvedDirection = urlDirection === "desc" ? "down" : "up";
    const resolvedLimit = PER_PAGE_OPTIONS.includes(Number(urlLimit))
      ? String(urlLimit)
      : defaultLimit;
    sort = resolvedSort;
    ascending = resolvedAscending;
    if (open) {
      pendingSort = resolvedSort;
      pendingDirection = resolvedDirection;
      pendingLimit = resolvedLimit;
    }
  });

  /** True when sort/limit differs from default */
  const hasActiveSort = $derived.by(() => {
    const urlSort = page.url.searchParams.get("sort");
    const valid = new Set(sortOptions.map((o) => o.value));
    const resolvedSort = urlSort && valid.has(urlSort) ? urlSort : DEFAULT_SORT;
    const urlDirection = page.url.searchParams.get("direction") ?? "desc";
    const urlLimit = page.url.searchParams.get("limit") ?? defaultLimit;
    return (
      resolvedSort !== DEFAULT_SORT ||
      urlDirection !== "desc" ||
      urlLimit !== defaultLimit
    );
  });

  function apply() {
    const searchParams = new URLSearchParams(page.url.searchParams);
    searchParams.set("sort", pendingSort);
    searchParams.set("direction", pendingDirection === "down" ? "desc" : "asc");
    searchParams.set("limit", pendingLimit);
    searchParams.set("page", "1");
    const url = `${page.url.pathname}?${queryStringWithLiteralCommas(searchParams)}`;
    goto(url);
    sort = pendingSort;
    ascending = pendingDirection === "up";
    open = false;
  }

  function resetSort() {
    const searchParams = new URLSearchParams(page.url.searchParams);
    searchParams.set("sort", DEFAULT_SORT);
    searchParams.set("direction", "desc");
    searchParams.set("limit", defaultLimit);
    searchParams.set("page", "1");
    const url = `${page.url.pathname}?${queryStringWithLiteralCommas(searchParams)}`;
    goto(url);
    sort = DEFAULT_SORT;
    ascending = false;
    pendingSort = DEFAULT_SORT;
    pendingDirection = "down";
    pendingLimit = defaultLimit;
    open = false;
  }
</script>

<div class={className}>
  {#if sortOptions.length > 0}
    <Popover.Root bind:open>
      <Popover.Trigger
        class={buttonVariants({
          variant: "outline",
          size: "icon",
          class: "cursor-pointer relative",
        })}
        aria-label="Sort options"
      >
        <ArrowUpDownIcon class="size-4" />
        {#if hasActiveSort}
          <span
            class="absolute top-1.5 right-1 size-1.5 rounded-full bg-blue-500 animate-pulse"
            aria-hidden="true"
          ></span>
        {/if}
      </Popover.Trigger>
      <Popover.Content
        align="end"
        class="w-72 min-w-0 max-w-[calc(100vw-1rem)] p-3 overflow-hidden"
      >
        <div class="text-sm font-medium mb-2">Sort Options</div>
        <Separator.Root class="mb-3" />
        <div class="space-y-4">
          <div class="space-y-1">
            <Label class="text-xs text-muted-foreground">Sort by</Label>
            <RadioGroup.Root bind:value={pendingSort} class="grid gap-0 mt-0">
              {#each sortOptions as option (option.value)}
                <div
                  class="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent/50"
                >
                  <RadioGroup.Item
                    value={option.value}
                    id="sort-{option.value}"
                    class="border border-muted-foreground/80"
                  />
                  <Label
                    for="sort-{option.value}"
                    class="cursor-pointer font-normal"
                  >
                    {option.label}
                  </Label>
                </div>
              {/each}
            </RadioGroup.Root>
          </div>

          <div class="grid grid-cols-2 gap-3 min-w-0 overflow-hidden">
            <div class="space-y-2 min-w-0 overflow-hidden">
              <Label class="text-xs text-muted-foreground">Direction</Label>
              <Select.Root
                type="single"
                bind:value={pendingDirection}
                class="min-w-0 overflow-hidden"
              >
                <Select.Trigger
                  class="sort-select-trigger w-full min-w-0 max-w-full justify-between text-sm overflow-hidden pl-2 [&>span]:min-w-0 [&>span]:truncate [&>span]:block"
                  aria-label="Sort direction"
                >
                  <span class="min-w-0 truncate">
                    {pendingDirection === "down" ? "Descending" : "Ascending"}
                  </span>
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="up" label="Ascending">
                    Ascending
                  </Select.Item>
                  <Select.Item value="down" label="Descending">
                    Descending
                  </Select.Item>
                </Select.Content>
              </Select.Root>
            </div>
            <div class="space-y-2 min-w-0 overflow-hidden">
              <Label class="text-xs text-muted-foreground">
                Entries per Page
              </Label>
              <Select.Root
                type="single"
                bind:value={pendingLimit}
                class="min-w-0 overflow-hidden"
              >
                <Select.Trigger
                  class="sort-select-trigger w-full min-w-0 max-w-full justify-between text-sm overflow-hidden pl-2 [&>span]:min-w-0 [&>span]:truncate [&>span]:block"
                  aria-label="Entries per page"
                >
                  <span class="min-w-0 truncate">{pendingLimit} Entries</span>
                </Select.Trigger>
                <Select.Content>
                  {#each PER_PAGE_OPTIONS as option (option)}
                    {@const value = String(option)}
                    <Select.Item {value} label={`${value} Entries`}>
                      {value} Entries
                    </Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
            </div>
          </div>

          <div class="border-t pt-3 flex gap-1">
            {#if hasActiveSort}
              <Button
                type="button"
                variant="destructive"
                size="sm"
                class="flex-1 text-xs text-white"
                aria-label="Reset sort"
                onclick={resetSort}
              >
                <Trash2Icon class="size-4" />
                Reset
              </Button>
            {/if}
            <Button
              type="button"
              variant="default"
              size="sm"
              class="flex-1 text-xs"
              onclick={apply}
            >
              <CheckIcon class="size-4" />
              Apply
            </Button>
          </div>
        </div>
      </Popover.Content>
    </Popover.Root>
  {/if}
</div>

<style>
  /* Ensure select trigger value truncates in narrow grid (e.g. "100 Entries") */
  :global(.sort-select-trigger) {
    overflow: hidden;
  }
  :global(.sort-select-trigger > *:first-child) {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>

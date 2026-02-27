<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import * as Popover from "$lib/components/ui/popover";
  import * as Button from "$lib/components/ui/button";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import * as RadioGroup from "$lib/components/ui/radio-group";
  import * as Separator from "$lib/components/ui/separator";
  import { buttonVariants } from "$lib/components/ui/button";
  import ArrowUpDownIcon from "@lucide/svelte/icons/arrow-up-down";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import CheckIcon from "@lucide/svelte/icons/check";

  const SORT_OPTIONS = [
    { value: "title", label: "Title" },
    { value: "totalBudget", label: "Total Budget" },
    { value: "date", label: "Submission Date" },
    { value: "updatedAt", label: "Last Updated" },
    { value: "commentCount", label: "Comments" },
  ];

  const VALID_SORT = new Set(SORT_OPTIONS.map((o) => o.value));

  /** @type {{ sort?: string, ascending?: boolean, class?: string }} */
  let {
    sort = $bindable("title"),
    ascending = $bindable(true),
    class: className = "",
  } = $props();

  let open = $state(false);
  let pendingSort = $state("title");
  let pendingDescending = $state(false);

  $effect(() => {
    const urlSort = page.url.searchParams.get("sort") ?? "title";
    const urlDirection = page.url.searchParams.get("direction") ?? "asc";
    const resolvedSort = VALID_SORT.has(urlSort) ? urlSort : "title";
    const resolvedAscending = urlDirection !== "desc";
    sort = resolvedSort;
    ascending = resolvedAscending;
    if (open) {
      pendingSort = resolvedSort;
      pendingDescending = !resolvedAscending;
    }
  });

  /** True when sort differs from default (sort !== title or direction === desc) */
  const hasActiveSort = $derived.by(() => {
    const urlSort = page.url.searchParams.get("sort") ?? "title";
    const urlDirection = page.url.searchParams.get("direction") ?? "asc";
    return urlSort !== "title" || urlDirection === "desc";
  });

  function apply() {
    const searchParams = new URLSearchParams(page.url.searchParams);
    searchParams.set("sort", pendingSort);
    searchParams.set("direction", pendingDescending ? "desc" : "asc");
    const url = `${page.url.pathname}?${searchParams.toString()}`;
    goto(url);
    sort = pendingSort;
    ascending = !pendingDescending;
    open = false;
  }

  function resetSort() {
    const searchParams = new URLSearchParams(page.url.searchParams);
    searchParams.set("sort", "title");
    searchParams.set("direction", "asc");
    const url = `${page.url.pathname}?${searchParams.toString()}`;
    goto(url);
    sort = "title";
    ascending = true;
    open = false;
  }
</script>

<div class={className}>
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
    <Popover.Content align="end" class="w-64 p-3">
      <h3 class="text-sm font-medium mb-2">Sort</h3>
      <Separator.Root class="mb-3" />
      <div class="space-y-4">
        <div class="space-y-2">
          <Label class="text-xs text-muted-foreground">Sort by</Label>
          <RadioGroup.Root bind:value={pendingSort} class="grid gap-0 mt-0">
            {#each SORT_OPTIONS as option (option.value)}
              <div
                class="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent/50"
              >
                <RadioGroup.Item
                  value={option.value}
                  id="sort-{option.value}"
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

        <div class="space-y-2">
          <Label class="text-xs text-muted-foreground">Direction</Label>
          <div class="flex items-center gap-2">
            <Switch id="sort-dir" bind:checked={pendingDescending} />
            <Label for="sort-dir" class="cursor-pointer text-sm font-normal">
              {pendingDescending ? "Descending" : "Ascending"}
            </Label>
          </div>
        </div>

        <div class="border-t pt-3 flex gap-1">
          {#if hasActiveSort}
            <Button.Root
              type="button"
              variant="destructive"
              size="sm"
              class="flex-1 text-xs text-white"
              aria-label="Reset sort"
              onclick={resetSort}
            >
              <Trash2Icon class="size-4" />
              Reset
            </Button.Root>
          {/if}
          <Button.Root
            type="button"
            variant="default"
            size="sm"
            class="flex-1 text-xs"
            onclick={apply}
          >
            <CheckIcon class="size-4" />
            Apply
          </Button.Root>
        </div>
      </div>
    </Popover.Content>
  </Popover.Root>
</div>

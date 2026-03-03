<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import * as Popover from "$lib/components/ui/popover";
  import * as Button from "$lib/components/ui/button";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Separator from "$lib/components/ui/separator";
  import { buttonVariants } from "$lib/components/ui/button";
  import { user } from "$stores/sessionManager.js";
  import FilterIcon from "@lucide/svelte/icons/sliders-horizontal";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import CheckIcon from "@lucide/svelte/icons/check";

  /** @type {{ categories?: Array<{ _id: string, title?: string }>, voteId?: string, class?: string }} */
  let { categories = [], voteId = "", class: className = "" } = $props();

  const isVoteAdmin = $derived(
    !!(
      $user?.adminVoteIds &&
      Array.isArray($user.adminVoteIds) &&
      voteId &&
      $user.adminVoteIds.includes(String(voteId))
    ),
  );

  const ALL_CATEGORIES_VALUE = "__all_categories__";
  let open = $state(false);
  /** @type {string[]} */
  let pendingCategories = $state([]);
  let pendingLive = $state(true);
  let pendingWithdrawn = $state(false);
  let pendingDraft = $state(false);
  const STATUS_LIVE = "live";
  const STATUS_WITHDRAWN = "withdrawn";
  const STATUS_DRAFT = "draft";

  const categoryTriggerLabel = $derived(
    pendingCategories.length === 0
      ? "All Categories"
      : pendingCategories.length === 1
        ? (categories.find((c) => String(c._id) === pendingCategories[0])
            ?.title ?? pendingCategories[0])
        : `${pendingCategories.length} Categories`,
  );

  /** True when any filter param is present (category, status) */
  const hasActiveFilters = $derived.by(() => {
    const cat = page.url.searchParams.get("category") ?? "";
    const hasStatus = page.url.searchParams.has("status");
    if (cat.trim()) return true;
    if (hasStatus) return true;
    return false;
  });

  $effect(() => {
    const catParam = page.url.searchParams.get("category") ?? "";
    const statusParam = page.url.searchParams.get("status") ?? "live";
    const terms = statusParam.split(",").map((s) => s.trim().toLowerCase());
    if (open) {
      pendingCategories = catParam
        ? catParam
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
        : [];
      pendingLive = terms.includes(STATUS_LIVE);
      pendingWithdrawn = terms.includes(STATUS_WITHDRAWN);
      pendingDraft = terms.includes(STATUS_DRAFT);
    }
  });

  // When "All Categories" is selected in the multi-select, clear category selection
  $effect(() => {
    if (pendingCategories.includes(ALL_CATEGORIES_VALUE)) {
      pendingCategories = [];
    }
  });

  function apply() {
    const searchParams = new URLSearchParams(page.url.searchParams);
    searchParams.set("page", "1");
    const categoryIds = pendingCategories.filter(
      (id) => id !== ALL_CATEGORIES_VALUE,
    );
    if (categoryIds.length > 0) {
      searchParams.set("category", categoryIds.join(","));
    } else {
      searchParams.delete("category");
    }
    const statusParts = [];
    if (pendingLive) statusParts.push(STATUS_LIVE);
    if (pendingWithdrawn) statusParts.push(STATUS_WITHDRAWN);
    if (pendingDraft && isVoteAdmin) statusParts.push(STATUS_DRAFT);
    const statusValue =
      statusParts.length === 0 ? STATUS_LIVE : statusParts.join(",");
    searchParams.set("status", statusValue);
    // Use literal commas in URL for status and category instead of encoded %2C
    let qs = searchParams.toString();
    for (const key of ["status", "category"]) {
      const match = qs.match(new RegExp(`\\b${key}=([^&]*)`));
      if (match) {
        qs = qs.replace(
          new RegExp(`\\b${key}=[^&]*`),
          key + "=" + decodeURIComponent(match[1]),
        );
      }
    }
    const url = `${page.url.pathname}?${qs}`;
    goto(url);
    open = false;
  }

  function resetFilters() {
    const searchParams = new URLSearchParams(page.url.searchParams);
    searchParams.delete("category");
    searchParams.delete("status");
    searchParams.set("page", "1");
    const url = `${page.url.pathname}?${searchParams.toString()}`;
    goto(url);
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
      aria-label="Filter proposals"
    >
      <FilterIcon class="size-4" />
      {#if hasActiveFilters}
        <span
          class="absolute top-1.5 right-1 size-1.5 rounded-full bg-blue-500 animate-pulse"
          aria-hidden="true"
        ></span>
      {/if}
    </Popover.Trigger>
    <Popover.Content align="end" class="w-64 p-3">
      <h3 class="text-sm font-medium mb-2">Filter</h3>
      <Separator.Root class="mb-3" />
      <div class="space-y-4">
        <div class="space-y-2">
          <Label class="text-xs text-muted-foreground">Category</Label>
          <Select.Root type="multiple" bind:value={pendingCategories}>
            <Select.Trigger
              class="w-full min-w-0 text-foreground data-[placeholder]:text-foreground"
              aria-label="Category"
            >
              <span class="truncate block min-w-0">{categoryTriggerLabel}</span>
            </Select.Trigger>
            <Select.Content>
              <Select.Group aria-label="Categories">
                <Select.Item
                  value={ALL_CATEGORIES_VALUE}
                  label="All Categories"
                >
                  All Categories
                </Select.Item>
                {#each categories as cat (cat._id)}
                  <Select.Item
                    value={String(cat._id)}
                    label={cat.title ?? String(cat._id)}
                  >
                    {cat.title ?? cat._id}
                  </Select.Item>
                {/each}
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </div>
        <div class="space-y-2">
          <Label class="text-xs text-muted-foreground">Status</Label>
          <div class="space-y-0">
            <label
              for="filter-status-live"
              class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent/50"
            >
              <Checkbox id="filter-status-live" bind:checked={pendingLive} />
              <span class="cursor-pointer font-normal">Live</span>
            </label>
            <label
              for="filter-status-withdrawn"
              class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent/50"
            >
              <Checkbox
                id="filter-status-withdrawn"
                bind:checked={pendingWithdrawn}
              />
              <span class="cursor-pointer font-normal">Withdrawn</span>
            </label>
            {#if isVoteAdmin}
              <label
                for="filter-status-draft"
                class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent/50"
              >
                <Checkbox
                  id="filter-status-draft"
                  bind:checked={pendingDraft}
                />
                <span class="cursor-pointer font-normal">Draft</span>
              </label>
            {/if}
          </div>
        </div>
        <div class="border-t pt-3 flex gap-1">
          {#if hasActiveFilters}
            <Button.Root
              type="button"
              variant="destructive"
              size="sm"
              class="flex-1 text-xs text-white"
              aria-label="Reset filters"
              onclick={resetFilters}
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

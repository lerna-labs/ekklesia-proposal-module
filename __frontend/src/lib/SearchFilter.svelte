<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import * as Popover from "$lib/components/ui/popover";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Separator from "$lib/components/ui/separator";
  import { user } from "$stores/sessionManager.js";
  import FilterIcon from "@lucide/svelte/icons/sliders-horizontal";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import CheckIcon from "@lucide/svelte/icons/check";

  /** @type {{ filterOptions?: Array<{ param: string, label: string, field: string, allowedValues?: string[], multiple: boolean, optionsPath?: string, optionValueKey?: string, optionLabelKey?: string }>, vote?: Record<string, unknown>, voteId?: string, class?: string }} */
  let {
    filterOptions = [],
    vote = null,
    voteId = "",
    class: className = "",
  } = $props();

  function getByPath(obj, path) {
    if (!obj || !path) return undefined;
    const parts = path.split(".");
    let current = obj;
    for (const p of parts) {
      current = current?.[p];
      if (current === undefined) return undefined;
    }
    return current;
  }

  const isVoteAdmin = $derived(
    !!(
      $user?.adminVoteIds &&
      Array.isArray($user.adminVoteIds) &&
      voteId &&
      $user.adminVoteIds.includes(String(voteId))
    ),
  );

  const statusOption = $derived(
    filterOptions.find((o) => o.param === "status"),
  );

  /** Options with optionsPath: resolve option list from vote and build { value, label }[] */
  const optionsFromVoteByParam = $derived.by(() => {
    const out =
      /** @type {Record<string, Array<{ value: string, label: string }>>} */ ({});
    for (const opt of filterOptions) {
      if (!opt.optionsPath || !vote) continue;
      const list = getByPath(vote, opt.optionsPath);
      if (!Array.isArray(list)) continue;
      const valueKey = opt.optionValueKey ?? "_id";
      const labelKey = opt.optionLabelKey ?? "title";
      out[opt.param] = list
        .map((item) => ({
          value: String(item[valueKey] ?? ""),
          label: String(item[labelKey] ?? item[valueKey] ?? ""),
        }))
        .filter((o) => o.value);
    }
    return out;
  });

  const categoryOption = $derived(
    filterOptions.find((o) => o.param === "category"),
  );
  const categoryOptionsList = $derived(
    optionsFromVoteByParam["category"] ?? [],
  );

  const ALL_CATEGORIES_VALUE = "__all_categories__";
  let open = $state(false);
  let pendingLive = $state(true);
  let pendingWithdrawn = $state(false);
  let pendingDraft = $state(false);
  /** @type {string[]} */
  let pendingCategories = $state([]);

  /** True when any filter param from filterOptions is present in the URL */
  const hasActiveFilters = $derived.by(() => {
    for (const opt of filterOptions) {
      const val = page.url.searchParams.get(opt.param) ?? "";
      if (val.trim()) return true;
    }
    return false;
  });

  const categoryTriggerLabel = $derived(
    pendingCategories.length === 0
      ? "All Pillars"
      : pendingCategories.length === 1
        ? (categoryOptionsList.find(
            (c) => String(c.value) === pendingCategories[0],
          )?.label ?? pendingCategories[0])
        : `${pendingCategories.length} Pillars`,
  );

  $effect(() => {
    if (!open) return;
    if (statusOption) {
      const statusParam = page.url.searchParams.get("status") ?? "live";
      const terms = statusParam.split(",").map((s) => s.trim().toLowerCase());
      pendingLive = terms.includes("live");
      pendingWithdrawn = terms.includes("withdrawn");
      pendingDraft = terms.includes("draft");
    }
    if (categoryOption) {
      const catParam = page.url.searchParams.get("category") ?? "";
      pendingCategories = catParam
        ? catParam
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
        : [];
    }
  });

  $effect(() => {
    if (pendingCategories.includes(ALL_CATEGORIES_VALUE)) {
      pendingCategories = [];
    }
  });

  function apply() {
    const searchParams = new URLSearchParams(page.url.searchParams);
    searchParams.set("page", "1");

    if (statusOption) {
      const statusParts = [];
      if (pendingLive) statusParts.push("live");
      if (pendingWithdrawn) statusParts.push("withdrawn");
      if (pendingDraft && isVoteAdmin) statusParts.push("draft");
      const statusValue =
        statusParts.length === 0 ? "live" : statusParts.join(",");
      searchParams.set("status", statusValue);
    }

    if (categoryOption) {
      const categoryIds = pendingCategories.filter(
        (id) => id !== ALL_CATEGORIES_VALUE,
      );
      if (categoryIds.length > 0) {
        searchParams.set("category", categoryIds.join(","));
      } else {
        searchParams.delete("category");
      }
    }

    let qs = searchParams.toString();
    // Keep comma-separated values as literal commas in the URL (no %2C encoding)
    for (const opt of filterOptions) {
      if (!opt.multiple) continue;
      const match = qs.match(new RegExp(`\\b${opt.param}=([^&]*)`));
      if (match) {
        qs = qs.replace(
          new RegExp(`\\b${opt.param}=[^&]*`),
          opt.param + "=" + decodeURIComponent(match[1]),
        );
      }
    }
    const url = `${page.url.pathname}?${qs}`;
    goto(url);
    open = false;
  }

  /** Key used by the vote list page to persist list state (filters, sort, etc.). Clear it on reset so the page does not restore old filters from localStorage. */
  const listStateKey = $derived(
    page.params?.voteSlug
      ? `votes.listState.${page.params.voteSlug}`
      : "",
  );

  function resetFilters() {
    const searchParams = new URLSearchParams(page.url.searchParams);
    for (const opt of filterOptions) {
      searchParams.delete(opt.param);
    }
    searchParams.set("page", "1");
    if (typeof window !== "undefined" && listStateKey) {
      try {
        window.localStorage.removeItem(listStateKey);
      } catch (_) {}
    }
    const url = `${page.url.pathname}?${searchParams.toString()}`;
    goto(url);
    open = false;
  }
</script>

<div class={className}>
  {#if filterOptions.length > 0}
    <Popover.Root bind:open>
      <Popover.Trigger
        class={buttonVariants({
          variant: "outline",
          size: "icon",
          class: "relative cursor-pointer",
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
        <h3 class="text-sm font-medium mb-2">Filter Options</h3>
        <Separator.Root class="mb-3" />
        <div class="space-y-4">
          {#if statusOption}
            <div class="space-y-1">
              <Label class="text-xs text-muted-foreground"
                >{statusOption.label}</Label
              >
              <div class="grid gap-0">
                {#if statusOption.allowedValues?.includes("live")}
                  <label
                    for="filter-status-live"
                    class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent/50"
                  >
                    <Checkbox
                      id="filter-status-live"
                      bind:checked={pendingLive}
                      class="border border-muted-foreground/80"
                    />
                    <span class="cursor-pointer font-normal">Live</span>
                  </label>
                {/if}
                {#if statusOption.allowedValues?.includes("withdrawn")}
                  <label
                    for="filter-status-withdrawn"
                    class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent/50"
                  >
                    <Checkbox
                      id="filter-status-withdrawn"
                      bind:checked={pendingWithdrawn}
                      class="border border-muted-foreground/80"
                    />
                    <span class="cursor-pointer font-normal">Withdrawn</span>
                  </label>
                {/if}
                {#if isVoteAdmin && statusOption.allowedValues?.includes("draft")}
                  <label
                    for="filter-status-draft"
                    class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent/50"
                  >
                    <Checkbox
                      id="filter-status-draft"
                      bind:checked={pendingDraft}
                      class="border border-muted-foreground/80"
                    />
                    <span class="cursor-pointer font-normal">Draft</span>
                  </label>
                {/if}
              </div>
            </div>
          {/if}
          {#if categoryOption && categoryOptionsList.length > 0}
            <div class="space-y-2">
              <Label class="text-xs text-muted-foreground"
                >Cardano 2030 Pillars</Label
              >
              <Select.Root type="multiple" bind:value={pendingCategories}>
                <Select.Trigger
                  class="w-full min-w-0 text-foreground data-placeholder:text-foreground"
                  aria-label={categoryOption.label}
                >
                  <span class="truncate block min-w-0"
                    >{categoryTriggerLabel}</span
                  >
                </Select.Trigger>
                <Select.Content>
                  <Select.Group aria-label="Categories">
                    <Select.Item
                      value={ALL_CATEGORIES_VALUE}
                      label="All Pillars"
                    >
                      All Categories
                    </Select.Item>
                    {#each categoryOptionsList as opt (opt.value)}
                      <Select.Item value={opt.value} label={opt.label}>
                        {opt.label}
                      </Select.Item>
                    {/each}
                  </Select.Group>
                </Select.Content>
              </Select.Root>
            </div>
          {/if}
          <div class="border-t pt-3 flex gap-1">
            {#if hasActiveFilters}
              <Button
                type="button"
                variant="destructive"
                size="sm"
                class="flex-1 text-xs text-white"
                aria-label="Reset filters"
                onclick={resetFilters}
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

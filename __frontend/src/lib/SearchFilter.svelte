<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { queryStringWithLiteralCommas } from "$lib/utils.js";
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
  let { filterOptions = [], vote = null, voteId = "", class: className = "" } = $props();

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

  const statusOption = $derived(filterOptions.find((o) => o.param === "status"));

  const nonStatusFilterOptions = $derived(filterOptions.filter((opt) => opt.param !== "status"));

  function formatAllowedValueLabel(value) {
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase();
    if (!normalized) return "";
    return normalized
      .split(/[\s_-]+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  /** Resolve option lists for each filter param from optionsPath or allowedValues. */
  const optionsByParam = $derived.by(() => {
    const out = /** @type {Record<string, Array<{ value: string, label: string }>>} */ ({});
    for (const opt of filterOptions) {
      if (opt.optionsPath && vote) {
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
        continue;
      }

      if (Array.isArray(opt.allowedValues) && opt.allowedValues.length > 0) {
        out[opt.param] = opt.allowedValues
          .map((value) => ({
            value: String(value ?? ""),
            label: formatAllowedValueLabel(value),
          }))
          .filter((o) => o.value);
      }
    }
    return out;
  });

  let open = $state(false);
  let pendingLive = $state(true);
  let pendingWithdrawn = $state(false);
  let pendingDraft = $state(false);
  /** @type {Record<string, string[]>} */
  let pendingSelectionsByParam = $state({});

  /** True when any filter param from filterOptions is present in the URL */
  const hasActiveFilters = $derived.by(() => {
    for (const opt of filterOptions) {
      const val = page.url.searchParams.get(opt.param) ?? "";
      if (val.trim()) return true;
    }
    return false;
  });

  function getTriggerLabel(option, selectedValues, optionsList) {
    const allLabel = "All";
    if (!Array.isArray(selectedValues) || selectedValues.length === 0) {
      return allLabel;
    }
    if (selectedValues.length === 1) {
      const selectedValue = selectedValues[0];
      return optionsList.find((opt) => String(opt.value) === selectedValue)?.label ?? selectedValue;
    }
    return `${selectedValues.length} selected`;
  }

  $effect(() => {
    if (!open) return;
    if (statusOption) {
      const statusParam = page.url.searchParams.get("status") ?? "live";
      const terms = statusParam.split(",").map((s) => s.trim().toLowerCase());
      pendingLive = terms.includes("live");
      pendingWithdrawn = terms.includes("withdrawn");
      pendingDraft = terms.includes("draft");
    }

    /** @type {Record<string, string[]>} */
    const nextPendingSelections = {};
    for (const opt of nonStatusFilterOptions) {
      const paramValue = page.url.searchParams.get(opt.param) ?? "";
      nextPendingSelections[opt.param] = paramValue
        ? paramValue
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
        : [];
    }
    pendingSelectionsByParam = nextPendingSelections;
  });

  function apply() {
    const searchParams = new URLSearchParams(page.url.searchParams);
    searchParams.set("page", "1");

    if (statusOption) {
      const statusParts = [];
      if (pendingLive) statusParts.push("live");
      if (pendingWithdrawn) statusParts.push("withdrawn");
      if (pendingDraft && isVoteAdmin) statusParts.push("draft");
      const statusValue = statusParts.length === 0 ? "live" : statusParts.join(",");
      searchParams.set("status", statusValue);
    }

    for (const opt of nonStatusFilterOptions) {
      const selectedValues = pendingSelectionsByParam[opt.param] ?? [];
      if (selectedValues.length > 0) {
        searchParams.set(opt.param, selectedValues.join(","));
      } else {
        searchParams.delete(opt.param);
      }
    }

    const qs = queryStringWithLiteralCommas(searchParams);
    const url = `${page.url.pathname}?${qs}`;
    goto(url);
    open = false;
  }

  /** Key used by the vote list page to persist list state (filters, sort, etc.). Clear it on reset so the page does not restore old filters from localStorage. */
  const listStateKey = $derived(
    page.params?.voteSlug ? `votes.listState.${page.params.voteSlug}` : "",
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
      } catch (_) {
        // ignore localStorage errors (private mode / quota)
      }
    }
    const qs = queryStringWithLiteralCommas(searchParams);
    const url = qs ? `${page.url.pathname}?${qs}` : page.url.pathname;
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
            class="absolute top-1.5 right-1 size-1.5 animate-pulse rounded-full bg-blue-500"
            aria-hidden="true"
          ></span>
        {/if}
      </Popover.Trigger>
      <Popover.Content align="end" class="w-64 p-3">
        <div class="mb-2 text-sm font-medium">Filter Options</div>
        <Separator.Root class="mb-3" />
        <div class="space-y-4">
          {#if statusOption}
            <div class="space-y-1">
              <Label class="text-muted-foreground text-xs">{statusOption.label}</Label>
              <div class="grid gap-0">
                {#if statusOption.allowedValues?.includes("live")}
                  <label
                    for="filter-status-live"
                    class="hover:bg-accent/50 flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
                  >
                    <Checkbox
                      id="filter-status-live"
                      bind:checked={pendingLive}
                      class="border-muted-foreground/80 border"
                    />
                    <span class="cursor-pointer font-normal">Live</span>
                  </label>
                {/if}
                {#if statusOption.allowedValues?.includes("withdrawn")}
                  <label
                    for="filter-status-withdrawn"
                    class="hover:bg-accent/50 flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
                  >
                    <Checkbox
                      id="filter-status-withdrawn"
                      bind:checked={pendingWithdrawn}
                      class="border-muted-foreground/80 border"
                    />
                    <span class="cursor-pointer font-normal">Withdrawn</span>
                  </label>
                {/if}
                {#if isVoteAdmin && statusOption.allowedValues?.includes("draft")}
                  <label
                    for="filter-status-draft"
                    class="hover:bg-accent/50 flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
                  >
                    <Checkbox
                      id="filter-status-draft"
                      bind:checked={pendingDraft}
                      class="border-muted-foreground/80 border"
                    />
                    <span class="cursor-pointer font-normal">Draft</span>
                  </label>
                {/if}
              </div>
            </div>
          {/if}
          {#each nonStatusFilterOptions as option (option.param)}
            {@const optionList = optionsByParam[option.param] ?? []}
            {@const selectedValues = pendingSelectionsByParam[option.param] ?? []}
            {#if optionList.length > 0}
              <div class="space-y-2">
                <Label class="text-muted-foreground text-xs">{option.label}</Label>
                <Select.Root type="multiple" bind:value={pendingSelectionsByParam[option.param]}>
                  <Select.Trigger
                    class="text-foreground data-placeholder:text-foreground w-full min-w-0"
                    aria-label={option.label}
                  >
                    <span class="block min-w-0 truncate">
                      {getTriggerLabel(option, selectedValues, optionList)}
                    </span>
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Group aria-label={option.label}>
                      {#each optionList as opt (opt.value)}
                        <Select.Item value={opt.value} label={opt.label}>
                          {opt.label}
                        </Select.Item>
                      {/each}
                    </Select.Group>
                  </Select.Content>
                </Select.Root>
              </div>
            {/if}
          {/each}
          <div class="flex gap-1 border-t pt-3">
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

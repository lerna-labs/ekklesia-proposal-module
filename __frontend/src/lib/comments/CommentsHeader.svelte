<script>
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import * as Popover from "$lib/components/ui/popover";
  import * as RadioGroup from "$lib/components/ui/radio-group";
  import * as Separator from "$lib/components/ui/separator";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import ArrowUpDownIcon from "@lucide/svelte/icons/arrow-up-down";
  import FilterIcon from "@lucide/svelte/icons/sliders-horizontal";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import CheckIcon from "@lucide/svelte/icons/check";

  let {
    total = null,
    sortPopoverOpen = $bindable(false),
    filterPopoverOpen = $bindable(false),
    pendingSort = $bindable("date"),
    pendingDescending = $bindable(true),
    pendingProposer = $bindable(false),
    pendingDrep = $bindable(false),
    pendingAdmin = $bindable(false),
    userTypeFilter = [],
    hasActiveSort,
    hasActiveFilter,
    onApplySort,
    onResetSort,
    onApplyFilter,
    onResetFilter,
  } = $props();

  const SORT_OPTIONS = [
    { value: "date", label: "Date" },
    { value: "replycount", label: "Replies" },
    { value: "likecount", label: "Likes" },
  ];
</script>

<div class="flex flex-wrap items-center justify-between gap-2 mb-4">
  <h2 class="text-xl font-medium">
    Comments
    {#if total != null}
      ({total})
    {/if}
  </h2>
  <div class="flex items-center gap-1 ml-auto">
    <Popover.Root bind:open={sortPopoverOpen}>
      <Popover.Trigger
        class={buttonVariants({
          variant: "outline",
          size: "icon",
          class: "cursor-pointer relative size-8",
        })}
        aria-label="Sort comments"
      >
        <ArrowUpDownIcon class="size-4" />
        {#if hasActiveSort}
          <span
            class="absolute top-1 right-1 size-1.5 rounded-full bg-blue-500 animate-pulse"
            aria-hidden="true"
          ></span>
        {/if}
      </Popover.Trigger>
      <Popover.Content align="start" class="w-56 p-3">
        <h3 class="text-sm font-medium mb-2">Sort comments</h3>
        <Separator.Root class="mb-3" />
        <div class="space-y-4">
          <div class="space-y-2">
            <Label class="text-xs text-muted-foreground">Sort by</Label>
            <RadioGroup.Root bind:value={pendingSort} class="grid gap-0 mt-0">
              {#each SORT_OPTIONS as option (option.value)}
                <div class="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent/50">
                  <RadioGroup.Item value={option.value} id="comment-sort-{option.value}" />
                  <Label for="comment-sort-{option.value}" class="cursor-pointer font-normal">
                    {option.label}
                  </Label>
                </div>
              {/each}
            </RadioGroup.Root>
          </div>
          <div class="space-y-2">
            <Label class="text-xs text-muted-foreground">Direction</Label>
            <div class="flex items-center gap-2">
              <Switch id="comment-sort-dir" bind:checked={pendingDescending} />
              <Label for="comment-sort-dir" class="cursor-pointer text-sm font-normal">
                {pendingDescending ? "Descending" : "Ascending"}
              </Label>
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
                onclick={onResetSort}
              >
                <Trash2Icon class="size-4" />
                Reset
              </Button>
            {/if}
            <Button type="button" variant="default" size="sm" class="flex-1 text-xs" onclick={onApplySort}>
              <CheckIcon class="size-4" />
              Apply
            </Button>
          </div>
        </div>
      </Popover.Content>
    </Popover.Root>
    <Popover.Root bind:open={filterPopoverOpen}>
      <Popover.Trigger
        class={buttonVariants({
          variant: "outline",
          size: "icon",
          class: "cursor-pointer relative size-8",
        })}
        aria-label="Filter comments by user type"
      >
        <FilterIcon class="size-4" />
        {#if hasActiveFilter}
          <span
            class="absolute top-1 right-1 size-1.5 rounded-full bg-blue-500 animate-pulse"
            aria-hidden="true"
          ></span>
        {/if}
      </Popover.Trigger>
      <Popover.Content align="start" class="w-56 p-3">
        <h3 class="text-sm font-medium mb-2">Filter by user type</h3>
        <Separator.Root class="mb-3" />
        <div class="space-y-2">
          <label
            for="comment-filter-proposer"
            class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent/50"
          >
            <Checkbox id="comment-filter-proposer" bind:checked={pendingProposer} />
            <span class="font-normal">Proposer</span>
          </label>
          <label
            for="comment-filter-drep"
            class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent/50"
          >
            <Checkbox id="comment-filter-drep" bind:checked={pendingDrep} />
            <span class="font-normal">DRep</span>
          </label>
          <label
            for="comment-filter-admin"
            class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent/50"
          >
            <Checkbox id="comment-filter-admin" bind:checked={pendingAdmin} />
            <span class="font-normal">Admin</span>
          </label>
        </div>
        <div class="border-t pt-3 flex gap-1 mt-3">
          {#if hasActiveFilter}
            <Button
              type="button"
              variant="destructive"
              size="sm"
              class="flex-1 text-xs text-white"
              aria-label="Reset filter"
              onclick={onResetFilter}
            >
              <Trash2Icon class="size-4" />
              Reset
            </Button>
          {/if}
          <Button type="button" variant="default" size="sm" class="flex-1 text-xs" onclick={onApplyFilter}>
            <CheckIcon class="size-4" />
            Apply
          </Button>
        </div>
      </Popover.Content>
    </Popover.Root>
  </div>
</div>

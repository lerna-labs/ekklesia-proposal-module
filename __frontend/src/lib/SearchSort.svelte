<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import * as Popover from "$lib/components/ui/popover";
  import * as Button from "$lib/components/ui/button";
  import * as Label from "$lib/components/ui/label";
  import * as Switch from "$lib/components/ui/switch";
  import * as RadioGroup from "$lib/components/ui/radio-group";
  import { Field, Legend as FieldLegend } from "$lib/components/ui/field";
  import { buttonVariants } from "$lib/components/ui/button";
  import ArrowUpDownIcon from "@lucide/svelte/icons/arrow-up-down";

  const SORT_OPTIONS = [
    { value: "title", label: "Title" },
    { value: "budget", label: "Total Budget" },
    { value: "date", label: "Submission Date" },
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
</script>

<div class={className}>
  <Popover.Root bind:open>
    <Popover.Trigger
      class={buttonVariants({
        variant: "outline",
        size: "icon",
        class: "cursor-pointer",
      })}
      aria-label="Sort options"
    >
      <ArrowUpDownIcon class="size-4" />
    </Popover.Trigger>
    <Popover.Content align="end" class="w-56 p-3">
      <div class="space-y-4">
        <Field orientation="vertical">
          <FieldLegend class="mb-1 border-b pb-2">Sort by</FieldLegend>
          <RadioGroup.Root bind:value={pendingSort} class="grid gap-0 mt-0">
            {#each SORT_OPTIONS as option (option.value)}
              <label
                class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent/50"
              >
                <RadioGroup.Item value={option.value} />
                <Label.Root class="cursor-pointer font-normal">
                  {option.label}
                </Label.Root>
              </label>
            {/each}
          </RadioGroup.Root>
        </Field>

        <div class="flex items-center justify-between gap-2 border-t pt-3">
          <Label.Root for="sort-dir" class="text-sm font-normal">
            {pendingDescending ? "Descending" : "Ascending"}
          </Label.Root>
          <Switch.Root id="sort-dir" bind:checked={pendingDescending} />
        </div>

        <div class="border-t pt-3">
          <Button.Root
            type="button"
            variant="default"
            size="sm"
            class="w-full"
            onclick={apply}
          >
            Apply
          </Button.Root>
        </div>
      </div>
    </Popover.Content>
  </Popover.Root>
</div>

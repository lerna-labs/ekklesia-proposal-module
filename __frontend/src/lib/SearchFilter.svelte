<script>
  import * as Popover from "$lib/components/ui/popover";
  import * as Button from "$lib/components/ui/button";
  import * as Checkbox from "$lib/components/ui/checkbox";
  import * as Label from "$lib/components/ui/label";
  import FilterIcon from "@lucide/svelte/icons/sliders-horizontal";
  import { buttonVariants } from "$lib/components/ui/button";

  /**
   * @typedef {{ value: string, label: string }} FilterOption
   */

  /** @type {{ filters: FilterOption[], selected?: string[], class?: string }} */
  let {
    filters = [],
    selected = $bindable([]),
    class: className = "",
  } = $props();

  let open = $state(false);
  let pending = $state([]);

  $effect(() => {
    if (open) {
      pending = [...(selected ?? [])];
    }
  });

  function toggleFilter(value) {
    if (pending.includes(value)) {
      pending = pending.filter((v) => v !== value);
    } else {
      pending = [...pending, value];
    }
  }

  function apply() {
    selected = [...pending];
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
      aria-label="Filter options"
    >
      <FilterIcon class="size-4" />
    </Popover.Trigger>
    <Popover.Content align="end" class="w-56 p-3">
      <h3 class="text-sm font-medium mb-2">Filter</h3>
      <div class="space-y-1">
        <div class="space-y-1">
          {#each filters as option (option.value)}
            <label
              class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent/50"
            >
              <Checkbox.Root
                checked={pending.includes(option.value)}
                onchange={() => toggleFilter(option.value)}
              />
              <Label.Root class="cursor-pointer font-normal">
                {option.label}
              </Label.Root>
            </label>
          {/each}
        </div>
        <div class="border-t pt-3">
          <Button.Root
            type="button"
            variant="outline"
            size="sm"
            class="w-full text-xs"
            onclick={apply}
          >
            Apply
          </Button.Root>
        </div>
      </div>
    </Popover.Content>
  </Popover.Root>
</div>

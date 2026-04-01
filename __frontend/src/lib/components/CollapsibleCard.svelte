<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import ChevronUpIcon from "@lucide/svelte/icons/chevron-up";

  let {
    expanded = false,
    onToggle,
    expandLabel = "Expand",
    collapseLabel = "Collapse",
    showButton = true,
    class: className = "",
    title,
    children,
    ...restProps
  } = $props();

  const ariaLabel = $derived(expanded ? collapseLabel : expandLabel);
</script>

<Card.Root
  class="py-2 gap-0 {expanded
    ? 'pb-0'
    : 'pb-2'} bg-slate-50 rounded-md border {className}"
  {...restProps}
>
  <Card.Header
    class="flex flex-row gap-1 py-0 pl-4 pr-3 text-sm items-start min-h-10"
  >
    <div class="flex-1 min-w-0 flex min-h-10 items-start">
      <button
        type="button"
        class="min-w-0 w-full text-left cursor-pointer focus:outline-none"
        onclick={onToggle}
        aria-expanded={expanded}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        {#if expanded}
          <span class="pt-2 block text-lg font-medium leading-6">
            {@render title?.()}
          </span>
        {:else}
          <span
            class="pt-2 block overflow-hidden text-ellipsis whitespace-nowrap text-lg font-medium leading-6"
          >
            {@render title?.()}
          </span>
        {/if}
      </button>
    </div>
    {#if showButton}
      <Button
        type="button"
        variant="outline"
        size="icon"
        class="shrink-0 size-8 cursor-pointer top-1 relative"
        title={ariaLabel}
        aria-expanded={expanded}
        aria-label={ariaLabel}
        onclick={onToggle}
      >
        {#if expanded}
          <ChevronUpIcon class="size-4" aria-hidden="true" />
        {:else}
          <ChevronDownIcon class="size-4" aria-hidden="true" />
        {/if}
      </Button>
    {/if}
  </Card.Header>
  {#if expanded}
    <Card.Content class="pl-4 pr-3 pt-0 mt-2 pb-4">
      {@render children?.()}
    </Card.Content>
  {/if}
</Card.Root>

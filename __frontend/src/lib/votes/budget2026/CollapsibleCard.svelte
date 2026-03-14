<script>
  /**
   * Reusable collapsible card with fixed-height header so that:
   * - When closed: one-line title (truncated) is vertically centered with the button.
   * - When opened: button stays in place; title starts at same position (pt-2); full title shown.
   */
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import ChevronUpIcon from "@lucide/svelte/icons/chevron-up";

  let {
    title = "",
    expanded = false,
    onToggle,
    expandLabel = "Expand",
    collapseLabel = "Collapse",
    showButton = true,
    children,
  } = $props();

  const ariaLabel = $derived(expanded ? collapseLabel : expandLabel);
</script>

<Card.Root
  class="py-2 gap-0 {expanded ? 'pb-0' : 'pb-2'} bg-white"
>
  <Card.Header
    class="flex flex-row gap-1 py-0 pl-4 pr-3 text-sm {expanded
      ? 'items-start min-h-10'
      : 'items-center h-10 min-h-10'}"
  >
    <div
      class="flex-1 min-w-0 flex {expanded
        ? 'min-h-10 items-start'
        : 'h-10 items-center'}"
    >
      <button
        type="button"
        class="min-w-0 w-full font-medium text-left cursor-pointer focus:outline-none text-base leading-6 flex items-center gap-2 {expanded
          ? ''
          : 'truncate'}"
        title={title}
        onclick={onToggle}
        aria-expanded={expanded}
        aria-label={ariaLabel}
      >
        {#if expanded}
          <span class="pt-2 block">{title}</span>
        {:else}
          <span class="truncate">{title}</span>
        {/if}
      </button>
    </div>
    {#if showButton}
      <Button
        type="button"
        variant="outline"
        size="icon"
        class="shrink-0 size-8 cursor-pointer"
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

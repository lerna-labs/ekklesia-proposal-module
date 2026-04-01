<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import * as Popover from "$lib/components/ui/popover";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import ChevronUpIcon from "@lucide/svelte/icons/chevron-up";
  import CircleHelpIcon from "@lucide/svelte/icons/circle-help";

  let {
    expanded = false,
    onToggle,
    expandLabel = "Expand",
    collapseLabel = "Collapse",
    showButton = true,
    class: className = "",
    titleClass = "text-lg font-medium leading-6",
    titleRowClass = "",
    popoverButtonLabel = "Show details",
    popoverContentClass = "p-3 text-sm max-w-sm",
    title,
    titleLeading,
    popover,
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
          <span class="pt-2 block {titleClass}">
            <span class="flex items-start gap-2 min-w-0 {titleRowClass}">
              {#if titleLeading}
                <span class="shrink-0 mt-0.5" aria-hidden="true">
                  {@render titleLeading?.()}
                </span>
              {/if}
              <span class="block min-w-0">
                {@render title?.()}
              </span>
            </span>
          </span>
        {:else}
          <span class="pt-2 block {titleClass}">
            <span class="flex items-center gap-2 min-w-0 {titleRowClass}">
              {#if titleLeading}
                <span class="shrink-0" aria-hidden="true">
                  {@render titleLeading?.()}
                </span>
              {/if}
              <span class="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                {@render title?.()}
              </span>
            </span>
          </span>
        {/if}
      </button>
    </div>
    {#if popover}
      <Popover.Root>
        <Popover.Trigger asChild={true}>
          <Button
            type="button"
            variant="outline"
            size="icon"
            class="shrink-0 size-8 cursor-pointer top-1 relative"
            title={popoverButtonLabel}
            aria-label={popoverButtonLabel}
          >
            <CircleHelpIcon class="size-4" aria-hidden="true" />
          </Button>
        </Popover.Trigger>
        <Popover.Content class={popoverContentClass} align="start">
          {@render popover?.()}
        </Popover.Content>
      </Popover.Root>
    {/if}
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

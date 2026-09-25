<script>
  import { cn } from "$lib/utils.js";
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
    /** If 1–6, wraps the title control in that heading level (valid `h*` + `button` pattern). */
    titleHeadingLevel = undefined,
    /** Tighter collapsed shell; uses `denseCollapsedPadding` instead of `collapsedPadding` when collapsed. */
    denseCollapsed = false,
    /** Tailwind `pb-*` when collapsed and not dense (default matches milestone-style cards). */
    collapsedPadding = "pb-2",
    /** Tailwind `pb-*` when collapsed and `denseCollapsed` (slightly more than none, e.g. `pb-1`). */
    denseCollapsedPadding = "pb-1",
    popoverButtonLabel = "Show details",
    popoverContentClass = "p-3 text-sm max-w-sm",
    title,
    titleEyebrow,
    titleLeading,
    /** Rendered after the expand/chevron control (e.g. delete) — matches trailing actions on work package cards. */
    trailingExtra,
    popover,
    children,
    /** Merged into expanded `Card.Content` (e.g. `pb-2` when the card is last above a footer action). */
    contentClass = "",
    ...restProps
  } = $props();

  const ariaLabel = $derived(expanded ? collapseLabel : expandLabel);

  const titleHeadingTag = $derived.by(() => {
    const n = Number(titleHeadingLevel);
    if (!Number.isInteger(n) || n < 1 || n > 6) return null;
    return `h${n}`;
  });

  /** Same grid as title column alignment; minmax(0,1fr) for truncation. */
  const mainRowGridClass = $derived.by(() => {
    const trailing = !!(popover || showButton || trailingExtra);
    if (titleLeading) {
      return trailing ? "grid-cols-[auto_minmax(0,1fr)_auto]" : "grid-cols-[auto_minmax(0,1fr)]";
    }
    return trailing ? "grid-cols-[minmax(0,1fr)_auto]" : "grid-cols-[minmax(0,1fr)]";
  });

  /** Title + eyebrow share this column (past optional icon column). */
  const titleColClass = $derived(titleLeading ? "col-start-2" : "col-start-1");
  /** Eyebrow row 1; title/icon/trailing row 2 when eyebrow exists. */
  const titleRowClassStart = $derived(titleEyebrow ? "row-start-2" : "row-start-1");
  const trailingColClass = $derived(titleLeading ? "col-start-3" : "col-start-2");

  const rootPbClass = $derived(
    expanded ? "pb-0" : denseCollapsed ? denseCollapsedPadding : collapsedPadding,
  );
</script>

<Card.Root
  class="gap-0 py-2 {rootPbClass} rounded-md border bg-slate-50 {className}"
  {...restProps}
>
  <!-- Override card-header defaults: grid-rows-[auto_auto] + gap-1.5 adds dead space below our single child -->
  <Card.Header class="min-w-0 grid-rows-1 gap-0 py-1 pr-3 pl-4 text-sm">
    <div class="grid w-full min-w-0 items-start gap-x-2 gap-y-0 {mainRowGridClass}">
      {#if titleEyebrow}
        <div class="row-start-1 min-w-0 {titleColClass} {titleRowClass} pt-1">
          {@render titleEyebrow?.()}
        </div>
      {/if}

      {#if titleLeading}
        <span
          class="col-start-1 flex shrink-0 items-center justify-center self-start pt-1.5 text-lg font-medium {titleRowClassStart}"
          aria-hidden="true"
        >
          {@render titleLeading?.()}
        </span>
      {/if}

      {#if titleHeadingTag}
        <svelte:element
          this={titleHeadingTag}
          class="m-0 min-w-0 p-0 font-[inherit] {titleClass} {titleColClass} {titleRowClassStart}"
        >
          <button
            type="button"
            class="w-full min-w-0 cursor-pointer overflow-hidden border-0 bg-transparent p-0 text-left focus:outline-none"
            onclick={onToggle}
            aria-expanded={expanded}
            aria-label={ariaLabel}
            title={ariaLabel}
          >
            {#if expanded}
              <span class="block w-full pt-1">{@render title?.()}</span>
            {:else}
              <span
                class="block w-full min-w-0 truncate pt-1 *:min-w-0 *:truncate *:overflow-hidden"
              >
                {@render title?.()}
              </span>
            {/if}
          </button>
        </svelte:element>
      {:else}
        <button
          type="button"
          class="w-full min-w-0 overflow-hidden text-left focus:outline-none {titleClass} {titleColClass} {titleRowClassStart}"
          onclick={onToggle}
          aria-expanded={expanded}
          aria-label={ariaLabel}
          title={ariaLabel}
        >
          {#if expanded}
            <span class="block w-full pt-1">{@render title?.()}</span>
          {:else}
            <span class="block w-full min-w-0 truncate pt-1 *:min-w-0 *:truncate *:overflow-hidden">
              {@render title?.()}
            </span>
          {/if}
        </button>
      {/if}

      {#if popover || showButton || trailingExtra}
        <div
          class="flex shrink-0 flex-row items-center gap-1 justify-self-end {trailingColClass} {titleRowClassStart}"
        >
          {#if popover}
            <div class="flex shrink-0 items-center">
              <Popover.Root>
                <Popover.Trigger asChild={true}>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    class="size-8 shrink-0 cursor-pointer"
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
            </div>
          {/if}
          {#if showButton}
            <Button
              type="button"
              variant="outline"
              size="icon"
              class="size-8 shrink-0 cursor-pointer"
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
          {#if trailingExtra}
            {@render trailingExtra?.()}
          {/if}
        </div>
      {/if}
    </div>
  </Card.Header>
  {#if expanded}
    <Card.Content class={cn("mt-2 pt-0 pr-3 pb-4 pl-4", contentClass)}>
      {@render children?.()}
    </Card.Content>
  {/if}
</Card.Root>

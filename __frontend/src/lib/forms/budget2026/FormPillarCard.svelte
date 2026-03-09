<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import Markdown from "$lib/base/Markdown.svelte";
  import LandmarkIcon from "@lucide/svelte/icons/landmark";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import ChevronUpIcon from "@lucide/svelte/icons/chevron-up";
  import CheckIcon from "@lucide/svelte/icons/check";
  import XIcon from "@lucide/svelte/icons/x";

  let {
    pillar = {},
    selected = false,
    onselect,
    splitBy = ":",
    class: className = "",
  } = $props();

  let expanded = $state(false);

  const title = $derived((pillar?.title ?? pillar?._id ?? "").toString());
  const description = $derived((pillar?.description ?? "").toString().trim());

  const colonIndex = $derived(title.indexOf(splitBy));
  const firstPart = $derived(
    colonIndex >= 0 ? title.slice(0, colonIndex).trim() : "",
  );
  const secondPart = $derived(
    colonIndex >= 0 ? title.slice(colonIndex + 1).trim() : title,
  );

  function toggleExpand(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    expanded = !expanded;
  }

  function toggleSelect(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    onselect?.();
  }
</script>

<Card.Root
  class="pt-4 {expanded ? 'pb-0' : 'pb-1'} rounded-md border {selected
    ? 'bg-(--mbo-electric-blue) text-white border-(--mbo-electric-blue)'
    : 'bg-slate-100 dark:bg-slate-800 border-muted-foreground/20'} {className}"
>
  <Card.Header class="flex flex-col gap-0.5 pt-0 pb-1 pl-4 pr-3 text-sm">
    {#if firstPart}
      <button
        type="button"
        class="w-full text-left cursor-pointer focus:outline-none flex items-center gap-1.5 shrink-0 {selected
          ? 'text-white/80'
          : 'text-muted-foreground'}"
        {title}
        onclick={toggleSelect}
      >
        <LandmarkIcon class="size-4 shrink-0" aria-hidden="true" />
        <span class="text-xs">{firstPart}</span>
      </button>
    {/if}
    <div class="flex flex-row items-center gap-1 min-w-0 w-full">
      <button
        type="button"
        class="min-w-0 flex-1 text-left cursor-pointer focus:outline-none"
        {title}
        aria-pressed={selected}
        onclick={toggleSelect}
      >
        <span
          class="text-lg font-medium truncate block {selected
            ? 'text-white'
            : 'text-foreground'}"
        >
          {secondPart}
        </span>
      </button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        class="shrink-0 size-8 cursor-pointer bg-white text-black border-border hover:bg-white hover:text-black"
        title={selected ? "Deselect pillar" : "Select pillar"}
        aria-pressed={selected}
        aria-label={selected ? "Deselect pillar" : "Select pillar"}
        onclick={toggleSelect}
      >
        {#if selected}
          <XIcon class="size-4" aria-hidden="true" />
        {:else}
          <CheckIcon class="size-4" aria-hidden="true" />
        {/if}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        class="shrink-0 size-8 cursor-pointer bg-white text-black border-border hover:bg-white hover:text-black"
        title={expanded ? "Collapse" : "Expand"}
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse" : "Expand"}
        onclick={toggleExpand}
      >
        {#if expanded}
          <ChevronUpIcon class="size-4" aria-hidden="true" />
        {:else}
          <ChevronDownIcon class="size-4" aria-hidden="true" />
        {/if}
      </Button>
    </div>
  </Card.Header>
  {#if expanded}
    <Card.Content
      class="pl-4 pr-3 pt-0 pb-4 -mt-4 {selected
        ? 'text-white/90'
        : 'text-muted-foreground'}"
    >
      {#if description}
        <div class="text-sm **:first:mt-0 [&_.markdown]:text-inherit">
          <Markdown content={description} />
        </div>
      {:else}
        <p class="text-sm">No description.</p>
      {/if}
    </Card.Content>
  {/if}
</Card.Root>

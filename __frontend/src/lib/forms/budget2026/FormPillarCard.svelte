<script>
  import * as Card from "$lib/components/ui/card";
  import Markdown from "$lib/base/Markdown.svelte";
  import LandmarkIcon from "@lucide/svelte/icons/landmark";

  let {
    pillar = {},
    selected = false,
    onselect,
    splitBy = ":",
    class: className = "",
  } = $props();

  const title = $derived((pillar?.title ?? pillar?._id ?? "").toString());
  const description = $derived((pillar?.description ?? "").toString().trim());

  const colonIndex = $derived(title.indexOf(splitBy));
  const firstPart = $derived(
    colonIndex >= 0 ? title.slice(0, colonIndex).trim() : "",
  );
  const secondPart = $derived(
    colonIndex >= 0 ? title.slice(colonIndex + 1).trim() : title,
  );

  function toggleSelect(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    onselect?.();
  }
</script>

<Card.Root
  role="button"
  tabindex="0"
  class="pt-4 pb-4 rounded-md border cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring {selected
    ? 'bg-(--mbo-electric-blue) text-white border-(--mbo-electric-blue)'
    : 'bg-slate-100 dark:bg-slate-800 border-muted-foreground/20'} {className}"
  onclick={toggleSelect}
  onkeydown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleSelect(e);
    }
  }}
>
  <Card.Header class="flex flex-col gap-0.5 pt-0 pb-1 pl-4 pr-4 text-sm">
    {#if firstPart}
      <div
        class="flex items-center gap-1.5 shrink-0 {selected
          ? 'text-white/80'
          : 'text-muted-foreground'}"
      >
        <LandmarkIcon class="size-4 shrink-0" aria-hidden="true" />
        <span class="text-xs">{firstPart}</span>
      </div>
    {/if}
    <div class="min-w-0 w-full" aria-pressed={selected}>
      <span
        class="text-lg font-medium truncate block {selected
          ? 'text-white'
          : 'text-foreground'}"
      >
        {secondPart}
      </span>
    </div>
  </Card.Header>
  <Card.Content
    class="pl-4 pr-4 pt-0 pb-0 -mt-4 {selected
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
</Card.Root>

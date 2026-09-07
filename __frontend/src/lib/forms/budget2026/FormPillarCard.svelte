<script>
  import * as Card from "$lib/components/ui/card";
  import Markdown from "$lib/base/Markdown.svelte";
  import LandmarkIcon from "@lucide/svelte/icons/landmark";

  let {
    pillar = {},
    selected = false,
    onselect,
    readOnly = false,
    splitBy = ":",
    class: className = "",
    ...restProps
  } = $props();

  const title = $derived((pillar?.title ?? pillar?._id ?? "").toString());
  const description = $derived((pillar?.description ?? "").toString().trim());

  const colonIndex = $derived(title.indexOf(splitBy));
  const firstPart = $derived(colonIndex >= 0 ? title.slice(0, colonIndex).trim() : "");
  const secondPart = $derived(colonIndex >= 0 ? title.slice(colonIndex + 1).trim() : title);

  function toggleSelect(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    onselect?.();
  }
</script>

<Card.Root
  role={readOnly ? undefined : "button"}
  tabindex={readOnly ? undefined : 0}
  aria-pressed={readOnly ? undefined : selected}
  class="focus-visible:ring-ring rounded-md border pt-4 pb-4 focus:outline-none focus-visible:ring-2 {readOnly
    ? 'cursor-default'
    : 'cursor-pointer'} {selected
    ? 'border-(--mbo-electric-blue) bg-(--mbo-electric-blue) text-white'
    : 'border-muted-foreground/20 bg-slate-50'} {className}"
  {...restProps}
  onclick={readOnly ? () => {} : toggleSelect}
  onkeydown={readOnly
    ? () => {}
    : (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleSelect(e);
        }
      }}
>
  <Card.Header class="flex flex-col gap-0.5 pt-0 pr-4 pb-1 pl-4 text-sm">
    {#if firstPart}
      <div
        class="flex shrink-0 items-center gap-1.5 {selected
          ? 'text-white/80'
          : 'text-muted-foreground'}"
      >
        <LandmarkIcon class="size-4 shrink-0" aria-hidden="true" />
        <span class="text-xs">{firstPart}</span>
      </div>
    {/if}
    <div class="w-full min-w-0">
      <span
        class="mt-2 block truncate text-lg font-medium {selected
          ? 'text-white'
          : 'text-foreground'}"
      >
        {secondPart}
      </span>
    </div>
  </Card.Header>
  <Card.Content
    class="-mt-6 pt-0 pr-4 pb-0 pl-4 {selected ? 'text-white/90' : 'text-muted-foreground'}"
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

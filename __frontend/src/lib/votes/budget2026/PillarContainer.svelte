<script>
  import * as Popover from "$lib/components/ui/popover";
  import { Badge } from "$lib/components/ui/badge";
  import { buttonVariants } from "$lib/components/ui/button";
  import Markdown from "$lib/base/Markdown.svelte";
  import LandmarkIcon from "@lucide/svelte/icons/landmark";

  let {
    title = "",
    content = "",
    expanded = false,
    ontoggle,
    splitBy = ":",
    class: className = "",
  } = $props();

  const colonIndex = $derived(title.indexOf(splitBy));
  const firstPart = $derived(
    colonIndex >= 0 ? title.slice(0, colonIndex).trim() : "",
  );
  const displayName = $derived(
    colonIndex >= 0 ? title.slice(colonIndex + 1).trim() : title,
  );
</script>

<Popover.Root>
  <Popover.Trigger
    class="group cursor-pointer focus:outline-none focus:ring-0 rounded-md {className}"
    title="View pillar details"
  >
    <Badge
      variant="secondary"
      class="bg-(--mbo-electric-blue) text-white group-hover:bg-(--mbo-cardano-blue) group-active:bg-(--mbo-cardano-blue) text-sm font-medium gap-1.5 select-none"
    >
      <LandmarkIcon class="size-3.5 shrink-0" aria-hidden="true" />
      <span>{displayName || title || "Pillar"}</span>
    </Badge>
  </Popover.Trigger>
  <Popover.Content
    class="sm:max-w-lg max-h-[70vh] overflow-y-auto flex flex-col gap-3 p-4"
    align="start"
  >
    <div class="shrink-0 flex flex-col gap-0.5">
      <div class="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <LandmarkIcon
          class="size-4 shrink-0 text-(--mbo-electric-blue)"
          aria-hidden="true"
        />
        <span>{firstPart || "Pillar"}</span>
      </div>
      <span class="font-medium text-foreground"
        >{displayName || title || "Pillar details"}</span
      >
    </div>
    <div class="text-sm **:first:mt-0 [&_.markdown]:text-inherit min-w-0">
      {#if content?.trim()}
        <Markdown {content} />
      {:else}
        <p class="text-muted-foreground">No description.</p>
      {/if}
    </div>
    <Popover.Close
      type="button"
      class="{buttonVariants({ variant: 'outline', size: 'sm' })} self-start"
    >
      Close
    </Popover.Close>
  </Popover.Content>
</Popover.Root>

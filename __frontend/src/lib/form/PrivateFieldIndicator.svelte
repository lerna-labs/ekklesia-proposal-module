<script>
  import * as Popover from "$lib/components/ui/popover/index.js";
  import EyeOffIcon from "@lucide/svelte/icons/eye-off";
  let { class: className } = $props();

  const notPublicMessage =
    "Information for Intersect only, will not be displayed publicly";
</script>

<Popover.Root>
  <Popover.Trigger
    class="shrink-0 p-0 cursor-pointer text-muted-foreground hover:text-foreground {className ?? ''}"
    type="button"
    aria-label={notPublicMessage}
  >
    <EyeOffIcon class="size-4" strokeWidth={2} />
  </Popover.Trigger>
  <Popover.Content class="text-xs p-2 max-w-[240px]">
    {notPublicMessage}
  </Popover.Content>
</Popover.Root>

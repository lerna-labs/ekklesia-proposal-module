<script>
  import * as Popover from "$lib/components/ui/popover/index.js";
  import EyeOffIcon from "@lucide/svelte/icons/eye-off";
  let { class: className } = $props();

  const notPublicMessage = "Information for Intersect only, will not be displayed publicly";
</script>

<Popover.Root>
  <Popover.Trigger
    openOnHover
    class="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer p-0 {className ??
      ''}"
    type="button"
    aria-label={notPublicMessage}
  >
    <EyeOffIcon class="size-4" strokeWidth={2} />
  </Popover.Trigger>
  <Popover.Content class="max-w-[240px] p-2 text-xs">
    {notPublicMessage}
  </Popover.Content>
</Popover.Root>

<script>
  import * as Popover from "$lib/components/ui/popover/index.js";
  import InfoIcon from "@lucide/svelte/icons/info";
  let { content, class: className } = $props();
</script>

<Popover.Root>
  <Popover.Trigger class="ml-0 p-0 cursor-pointer {className}">
    <InfoIcon class="size-4 text-muted-foreground ml-0 p-0" />
  </Popover.Trigger>
  <Popover.Content class="text-sm p-2">{content}</Popover.Content>
</Popover.Root>

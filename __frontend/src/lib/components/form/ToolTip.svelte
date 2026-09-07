<script>
  import * as Popover from "$lib/components/ui/popover/index.js";
  import CircleQuestionMarkIcon from "@lucide/svelte/icons/circle-question-mark";
  let { content, class: className, fieldLabel } = $props();

  let triggerAriaLabel = $derived(
    fieldLabel?.trim() ? `More information about ${fieldLabel.trim()}` : "More information",
  );
</script>

<Popover.Root>
  <Popover.Trigger
    openOnHover
    class="ml-0 cursor-pointer p-0 {className}"
    aria-label={triggerAriaLabel}
  >
    <CircleQuestionMarkIcon
      class="text-muted-foreground ml-0 size-4 p-0"
      strokeWidth={2}
      aria-hidden="true"
    />
  </Popover.Trigger>
  <Popover.Content class="w-fit max-w-[300px] min-w-0 p-2 text-xs">
    {content}
  </Popover.Content>
</Popover.Root>

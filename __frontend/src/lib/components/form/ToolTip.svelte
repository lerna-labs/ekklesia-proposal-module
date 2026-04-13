<script>
  import * as Popover from "$lib/components/ui/popover/index.js";
  import CircleQuestionMarkIcon from "@lucide/svelte/icons/circle-question-mark";
  let { content, class: className, fieldLabel } = $props();

  let triggerAriaLabel = $derived(
    fieldLabel?.trim()
      ? `More information about ${fieldLabel.trim()}`
      : "More information",
  );
</script>

<Popover.Root>
  <Popover.Trigger
    openOnHover
    class="ml-0 p-0 cursor-pointer {className}"
    aria-label={triggerAriaLabel}
  >
    <CircleQuestionMarkIcon
      class="size-4 text-muted-foreground ml-0 p-0"
      strokeWidth={2}
      aria-hidden="true"
    />
  </Popover.Trigger>
  <Popover.Content class="text-xs p-2 max-w-[300px] min-w-0 w-fit">
    {content}
  </Popover.Content>
</Popover.Root>

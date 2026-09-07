<script>
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button } from "$lib/components/ui/button";
  import Textarea from "$lib/components/form/Textarea.svelte";

  let {
    comment = null,
    value = $bindable(""),
    validationErrors = null,
    onClose,
    onSave,
  } = $props();

  const open = $derived(!!comment);
</script>

<Dialog.Root
  {open}
  onOpenChange={(isOpen) => {
    if (!isOpen) onClose?.();
  }}
>
  <Dialog.Content class="flex max-h-[90dvh] min-h-0 flex-col sm:max-w-[500px]">
    <form
      class="flex min-h-0 flex-1 flex-col"
      onsubmit={(e) => {
        e.preventDefault();
        onSave?.();
      }}
    >
      <Dialog.Header class="shrink-0">
        <Dialog.Title>Edit Comment</Dialog.Title>
      </Dialog.Header>
      <div class="min-h-0 flex-1 overflow-y-auto px-1.5 py-4">
        <Textarea
          id="edit-content"
          label="Comment"
          bind:value
          {validationErrors}
          maxLength={2000}
        />
      </div>
      <Dialog.Footer class="shrink-0">
        <Button type="button" variant="outline" size="sm" onclick={() => onClose?.()}>
          Cancel
        </Button>
        <Button type="submit" size="sm">Save</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

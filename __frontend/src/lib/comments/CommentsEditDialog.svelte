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
  <Dialog.Content class="sm:max-w-[500px] max-h-[90dvh] flex flex-col min-h-0">
    <form
      class="flex flex-col min-h-0 flex-1"
      onsubmit={(e) => {
        e.preventDefault();
        onSave?.();
      }}
    >
      <Dialog.Header class="shrink-0">
        <Dialog.Title>Edit Comment</Dialog.Title>
      </Dialog.Header>
      <div class="py-4 overflow-y-auto min-h-0 flex-1">
        <Textarea
          id="edit-content"
          label="Comment"
          bind:value
          {validationErrors}
          maxLength={2000}
        />
      </div>
      <Dialog.Footer class="shrink-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onclick={() => onClose?.()}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm">Save</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

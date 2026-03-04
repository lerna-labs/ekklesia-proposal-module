<script>
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button } from "$lib/components/ui/button";
  import Textarea from "$lib/components/form/Textarea.svelte";

  let {
    open = $bindable(false),
    replyTo = null,
    value = $bindable(""),
    submitError = $bindable(null),
    isSubmitting = false,
    authorLabel = (c) => c?.author?.name ?? "Anonymous",
    onClose,
    onSubmit,
  } = $props();
</script>

<Dialog.Root
  bind:open
  onOpenChange={(isOpen) => {
    if (!isOpen) onClose?.();
  }}
>
  <Dialog.Content class="sm:max-w-[500px]">
    <form
      onsubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      <Dialog.Header>
        <Dialog.Title>
          {#if replyTo}
            Reply to {authorLabel(replyTo)}
          {:else}
            Add Comment
          {/if}
        </Dialog.Title>
      </Dialog.Header>
      <div class="py-4">
        {#key open && replyTo ? replyTo._id : open ? "add" : "closed"}
          <Textarea
            id="comment-content"
            label="Comment"
            bind:value
            placeholder="Write your comment (markdown supported)"
            required
            maxLength={2000}
          />
        {/key}
        {#if submitError}
          <p class="text-sm text-destructive mt-2">{submitError}</p>
        {/if}
      </div>
      <Dialog.Footer>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onclick={() => onClose?.()}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save Comment"}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

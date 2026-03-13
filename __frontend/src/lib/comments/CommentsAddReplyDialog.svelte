<script>
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
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

<AlertDialog.Root
  bind:open
  onOpenChange={(open) => {
    if (!open) onClose?.();
  }}
>
  <AlertDialog.Content
    class="sm:max-w-[650px] max-h-[90dvh] overflow-y-auto flex flex-col"
  >
    <form
      onsubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      <AlertDialog.Header>
        <AlertDialog.Title>
          {#if replyTo}
            Reply to {authorLabel(replyTo)}
          {:else}
            Add Comment
          {/if}
        </AlertDialog.Title>
      </AlertDialog.Header>
      <div class="py-4">
        {#key replyTo ? replyTo._id : "add"}
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
      <AlertDialog.Footer>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onclick={() => onClose?.()}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting} class="text-xs">
          {isSubmitting ? "Saving…" : "Save Comment"}
        </Button>
      </AlertDialog.Footer>
    </form>
  </AlertDialog.Content>
</AlertDialog.Root>

<script>
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button } from "$lib/components/ui/button";
  import * as Select from "$lib/components/ui/select/index.js";
  import Input from "$lib/form/Input.svelte";

  let {
    comment = null,
    category = $bindable(""),
    reason = $bindable(""),
    error = $bindable(null),
    onClose,
    onSubmit,
  } = $props();

  const open = $derived(!!comment);

  const WITHDRAWAL_CATEGORIES = [
    "Inappropriate content",
    "Spam",
    "Policy violation",
    "Duplicate",
    "Other",
  ];
</script>

<Dialog.Root
  {open}
  onOpenChange={(isOpen) => {
    if (!isOpen) onClose?.();
  }}
>
    <Dialog.Content class="sm:max-w-[425px]">
      <form
        onsubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
        }}
      >
        <Dialog.Header>
          <Dialog.Title>Withdraw Comment</Dialog.Title>
          <Dialog.Description>
            This will withdraw the comment. The author will see the withdrawal reason.
          </Dialog.Description>
        </Dialog.Header>
        <div class="py-4 space-y-4">
          <Select.Root
            type="single"
            value={category || undefined}
            onValueChange={(v) => (category = v != null ? String(v) : "")}
            required
          >
            <Select.Trigger class="w-full data-placeholder:text-muted-foreground">
              <span class="truncate block min-w-0">
                {category || "Select reason…"}
              </span>
            </Select.Trigger>
            <Select.Content>
              {#each WITHDRAWAL_CATEGORIES as cat}
                <Select.Item value={cat}>{cat}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
          <Input
            id="withdraw-reason"
            label="Reason (optional)"
            bind:value={reason}
            placeholder="Additional details…"
          />
          {#if error}
            <p class="text-sm text-destructive">{error}</p>
          {/if}
        </div>
        <Dialog.Footer>
          <Button type="button" variant="outline" size="sm" onclick={() => onClose?.()}>
            Cancel
          </Button>
          <Button type="submit" size="sm" variant="destructive">Withdraw</Button>
        </Dialog.Footer>
      </form>
    </Dialog.Content>
</Dialog.Root>

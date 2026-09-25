<script>
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button } from "$lib/components/ui/button";
  import * as Select from "$lib/components/ui/select/index.js";
  import Input from "$lib/components/form/Input.svelte";

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
  <Dialog.Content class="flex max-h-[90dvh] min-h-0 flex-col sm:max-w-[425px]">
    <form
      class="flex min-h-0 flex-1 flex-col"
      onsubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      <Dialog.Header class="shrink-0">
        <Dialog.Title>Withdraw Comment</Dialog.Title>
        <Dialog.Description>
          This will withdraw the comment. The author will see the withdrawal reason.
        </Dialog.Description>
      </Dialog.Header>
      <div class="min-h-0 flex-1 space-y-4 overflow-y-auto py-4">
        <Select.Root
          type="single"
          value={category || undefined}
          onValueChange={(v) => (category = v != null ? String(v) : "")}
          required
        >
          <Select.Trigger class="data-placeholder:text-muted-foreground w-full">
            <span class="block min-w-0 truncate">
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
          <p class="text-destructive text-sm">{error}</p>
        {/if}
      </div>
      <Dialog.Footer class="shrink-0">
        <Button type="button" variant="outline" size="sm" onclick={() => onClose?.()}>
          Cancel
        </Button>
        <Button type="submit" size="sm" variant="destructive">Withdraw</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

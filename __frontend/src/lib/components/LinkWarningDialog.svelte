<script>
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import { toast } from "svelte-sonner";
  import { Copy } from "lucide-svelte";

  let open = $state(false);
  let pendingLink = $state(null);

  export function show(href, title) {
    pendingLink = { href, title: title ?? href };
    open = true;
  }

  function confirmOpenLink() {
    if (pendingLink?.href) {
      window.open(pendingLink.href, "_blank", "noopener,noreferrer");
    }
    open = false;
    pendingLink = null;
  }

  $effect(() => {
    if (!open) pendingLink = null;
  });

  async function copyLink() {
    if (!pendingLink?.href) return;
    try {
      await navigator.clipboard.writeText(pendingLink.href);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Be Careful!</Dialog.Title>
      <Dialog.Description>
        You are about to open an external link to:
        {#if pendingLink}
          <div
            class="border-input bg-background my-2 flex w-full items-center overflow-hidden rounded-md border shadow-xs"
          >
            <input
              type="text"
              readonly
              value={pendingLink.href}
              class="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 pl-2 font-mono text-xs outline-none read-only:cursor-default"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="size-8 shrink-0 cursor-pointer rounded-none border-0 shadow-none hover:bg-transparent"
              aria-label="Copy link"
              onclick={copyLink}
            >
              <Copy class="size-4" />
            </Button>
          </div>
        {/if}
        Exercise caution and verify the website's authenticity before sharing personal information. To
        proceed, click 'Continue' otherwise click 'Cancel'.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer class="gap-2">
      <Dialog.Close type="button" class={buttonVariants({ variant: "outline" })}>
        Cancel
      </Dialog.Close>
      <Button onclick={confirmOpenLink}>Continue</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

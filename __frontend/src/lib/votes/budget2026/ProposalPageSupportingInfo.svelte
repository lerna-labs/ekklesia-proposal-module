<script>
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Button from "$lib/components/ui/button";
  import * as InputGroup from "$lib/components/ui/input-group";
  import { Copy } from "lucide-svelte";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link";

  let { proposal } = $props();

  const links = $derived(
    Array.isArray(proposal?.metaData?.supportingInfoLinks)
      ? proposal.metaData.supportingInfoLinks.filter(
          (link) => link?.url && typeof link.url === "string",
        )
      : [],
  );

  let linkDialogOpen = $state(false);
  let pendingLink = $state(null);

  function openLinkWarning(href, title) {
    pendingLink = { href, title: title || href };
    linkDialogOpen = true;
  }

  function confirmOpenLink() {
    if (pendingLink?.href) {
      window.open(pendingLink.href, "_blank", "noopener,noreferrer");
    }
    linkDialogOpen = false;
    pendingLink = null;
  }

  function cancelOpenLink() {
    linkDialogOpen = false;
    pendingLink = null;
  }

  async function copyLink() {
    if (!pendingLink?.href) return;
    try {
      await navigator.clipboard.writeText(pendingLink.href);
    } catch {
      // clipboard API unavailable
    }
  }
</script>

{#if links.length > 0}
  <section class="text-sm mb-8 mt-10">
    <h2 class="text-2xl font-medium mb-4">Other supporting information</h2>
    <ul class="space-y-0.5 list-none p-0">
      {#each links as link (link.url)}
        <li>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary hover:underline inline-flex items-center gap-1 text-sm cursor-pointer"
            onclick={(e) => {
              e.preventDefault();
              openLinkWarning(link.url, link.title?.trim() || link.url);
            }}
          >
            <ChevronRightIcon class="size-4 shrink-0" aria-hidden="true" />
            {link.title?.trim() || link.url}
            <ExternalLinkIcon class="size-3.5 shrink-0" aria-hidden="true" />
          </a>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<Dialog.Root bind:open={linkDialogOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Be Careful!</Dialog.Title>
      <Dialog.Description>
        You are about to open an external link to:
        {#if pendingLink}
          <InputGroup.Root class="my-2">
            <InputGroup.Input
              value={pendingLink.href}
              readonly
              class="font-mono text-sm"
            />
            <InputGroup.Addon align="inline-end">
              <InputGroup.Button
                type="button"
                size="icon-sm"
                aria-label="Copy link"
                onclick={copyLink}
              >
                <Copy class="size-4" />
              </InputGroup.Button>
            </InputGroup.Addon>
          </InputGroup.Root>
        {/if}
        Exercise caution and verify the website's authenticity before sharing personal
        information. To proceed, click 'Continue' otherwise click 'Cancel'.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer class="gap-2">
      <Button.Root variant="outline" onclick={cancelOpenLink}>
        Cancel
      </Button.Root>
      <Button.Root onclick={confirmOpenLink}>Continue</Button.Root>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

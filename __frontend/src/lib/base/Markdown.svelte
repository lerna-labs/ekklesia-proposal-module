<script>
  import MarkdownIt from "markdown-it";
  import { Copy } from "lucide-svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Button from "$lib/components/ui/button";
  import * as InputGroup from "$lib/components/ui/input-group";
  const md = new MarkdownIt({ html: false, linkify: true });

  function renderMarkdown(text) {
    if (text == null || String(text).trim() === "") return "";
    return md.render(String(text));
  }

  let { content = "", class: className = "" } = $props();
  const html = $derived(renderMarkdown(content ?? ""));

  let linkDialogOpen = $state(false);
  let pendingLink = $state(null);

  function handleContainerClick(event) {
    const anchor = event.target.closest("a");
    if (!anchor || !anchor.href) return;
    event.preventDefault();
    pendingLink = {
      href: anchor.href,
      title: anchor.title || anchor.textContent?.trim() || anchor.href,
    };
    linkDialogOpen = true;
  }

  function confirmOpenLink() {
    if (pendingLink?.href) {
      window.open(pendingLink.href, "_blank");
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
      // clipboard API unavailable (e.g. non-HTTPS)
    }
  }
</script>

{#if html}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_click_events_have_key_events -->
  <div
    class="markdown max-w-none {className}"
    data-slot="markdown"
    role="article"
    onclick={handleContainerClick}
    onkeydown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        const anchor = e.target.closest("a");
        if (anchor?.href) {
          e.preventDefault();
          pendingLink = {
            href: anchor.href,
            title: anchor.title || anchor.textContent?.trim() || anchor.href,
          };
          linkDialogOpen = true;
        }
      }
    }}
  >
    {@html html}
  </div>
{:else}
  <span class="text-muted-foreground">—</span>
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

<style>
  /* Propagate wrapper font-size/line-height to rendered markdown content (e.g. when class="text-[0.65rem]" is passed). */
  :global(div.markdown *) {
    font-size: inherit;
    line-height: inherit;
  }

  :global(div.markdown a) {
    color: var(--mbo-electric-blue) !important;
    text-decoration: none !important;
    border-bottom: 1px dashed var(--mbo-electric-blue) !important;
    padding-bottom: 2px;
  }

  :global(div.markdown a:hover) {
    color: var(--mbo-cardano-blue) !important;
    border-bottom: 1px dashed var(--mbo-cardano-blue) !important;
  }

  :global(div.markdown ul) {
    list-style-type: disc;
    padding-left: 1.5rem;
    margin: 0.5rem 0;
  }

  :global(div.markdown ol) {
    list-style-type: decimal;
    padding-left: 1.5rem;
    margin: 0.5rem 0;
  }

  :global(div.markdown blockquote) {
    border-left: 3px solid lightgrey;
    padding-left: 1rem;
    margin-bottom: 1rem;
    color: var(--mbo-text-gray);
  }

  :global(div.markdown blockquote p) {
    margin: 0.25rem 0;
  }

  :global(div.markdown blockquote p:first-child),
  :global(div.markdown blockquote p:last-child) {
    margin: 0;
  }
</style>

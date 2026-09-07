<script>
  import MarkdownIt from "markdown-it";
  import LinkWarningDialog from "$lib/components/LinkWarningDialog.svelte";

  const md = new MarkdownIt({ html: false, linkify: true });

  function renderMarkdown(text) {
    if (text == null || String(text).trim() === "") return "";
    return md.render(String(text));
  }

  let { content = "", class: className = "" } = $props();
  let linkWarningDialog;
  const html = $derived(renderMarkdown(content ?? ""));

  function handleContainerClick(event) {
    const anchor = event.target.closest("a");
    if (!anchor || !anchor.href) return;
    event.preventDefault();
    linkWarningDialog.show(anchor.href, anchor.title || anchor.textContent?.trim() || anchor.href);
  }

  function handleContainerKeydown(e) {
    if (e.key === "Enter" || e.key === " ") {
      const anchor = e.target.closest("a");
      if (anchor?.href) {
        e.preventDefault();
        linkWarningDialog.show(
          anchor.href,
          anchor.title || anchor.textContent?.trim() || anchor.href,
        );
      }
    }
  }
</script>

{#if html}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="markdown max-w-none {className}"
    data-slot="markdown"
    role="article"
    onclick={handleContainerClick}
    onkeydown={handleContainerKeydown}
  >
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- markdown-it html:false + link click intercept -->
    {@html html}
  </div>
{:else}
  <span class="text-muted-foreground">—</span>
{/if}

<LinkWarningDialog bind:this={linkWarningDialog} />

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
    margin-bottom: 1rem;
  }

  :global(div.markdown ol) {
    list-style-type: decimal;
    padding-left: 1.5rem;
    margin: 0.5rem 0;
    margin-bottom: 1rem;
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

  :global(div.markdown p) {
    margin-bottom: 1rem;
  }

  :global(div.markdown p:last-child) {
    margin-bottom: 0;
  }

  :global(div.markdown blockquote p:first-child),
  :global(div.markdown blockquote p:last-child) {
    margin: 0;
  }
</style>

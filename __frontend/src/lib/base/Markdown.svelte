<script>
  import MarkdownIt from "markdown-it";

  const md = new MarkdownIt({ html: false, linkify: true });

  function renderMarkdown(text) {
    if (text == null || String(text).trim() === "") return "";
    return md.render(String(text));
  }

  let { content = "", class: className = "" } = $props();

  const html = $derived(renderMarkdown(content ?? ""));
</script>

{#if html}
  <div
    class="markdown prose prose-sm max-w-none dark:prose-invert {className}"
    data-slot="markdown"
  >
    {@html html}
  </div>
{:else}
  <span class="text-muted-foreground">—</span>
{/if}

<style>
  :global(.markdown ul) {
    list-style-type: disc;
    padding-left: 1.5rem;
    margin: 0.5rem 0;
  }

  :global(.markdown ol) {
    list-style-type: decimal;
    padding-left: 1.5rem;
    margin: 0.5rem 0;
  }
</style>

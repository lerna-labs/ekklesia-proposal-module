<script lang="ts">
  import {
    BoldButton,
    ItalicButton,
    UnderlineButton,
    Divider,
    Toolbar,
    UndoButton,
    RedoButton,
    formatBulletList,
    formatNumberedList,
    formatQuote,
    formatParagraph,
  } from "svelte-lexical";
</script>

<Toolbar>
  {#snippet children({ editor, activeEditor, blockType })}
    <UndoButton />
    <RedoButton />
    <Divider />
    <BoldButton />
    <ItalicButton />
    <UnderlineButton />
    <Divider />
    <button
      type="button"
      onclick={() => formatBulletList(activeEditor, blockType)}
      class="toolbar-item spaced"
      class:active={blockType === "bullet"}
      title="Bullet List"
      aria-label="Format as bullet list"
    >
      <i class="icon bullet-list"></i>
    </button>
    <button
      type="button"
      onclick={() => formatNumberedList(activeEditor, blockType)}
      class="toolbar-item spaced"
      class:active={blockType === "number"}
      title="Numbered List"
      aria-label="Format as numbered list"
    >
      <i class="icon numbered-list"></i>
    </button>
    <Divider />
    <button
      type="button"
      onclick={() => {
        if (blockType === "quote") {
          formatParagraph(activeEditor);
        } else {
          formatQuote(activeEditor, blockType);
        }
      }}
      class="toolbar-item spaced"
      class:active={blockType === "quote"}
      title={blockType === "quote" ? "Unquote" : "Quote"}
      aria-label={blockType === "quote"
        ? "Remove quote formatting"
        : "Format as quote"}
    >
      <i class="icon quote"></i>
    </button>
  {/snippet}
</Toolbar>

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
  {/snippet}
</Toolbar>

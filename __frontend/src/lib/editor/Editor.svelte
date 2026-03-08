<script>
  import {
    Composer,
    ContentEditable,
    RichTextPlugin,
    HistoryPlugin,
    ListPlugin,
    LinkPlugin,
    FloatingLinkEditorPlugin,
    MarkdownShortcutPlugin,
    convertToMarkdownString,
    ALL_TRANSFORMERS,
    UNORDERED_LIST,
    ORDERED_LIST,
    LINK,
    convertFromMarkdownString,
  } from "svelte-lexical";
  import { ListNode, ListItemNode, QuoteNode, LinkNode } from "svelte-lexical";
  import { theme } from "svelte-lexical/dist/themes/default";
  import {
    $getRoot as getRoot,
    $createParagraphNode as createParagraphNode,
  } from "lexical";
  import EditorToolbar from "./EditorToolbar.svelte";
  import PreventLinkNavigationPlugin from "./link/PreventLinkNavigationPlugin.svelte";
  import "./editor.css";
  /** When true, the quote formatting option is shown in the toolbar. Default false. */
  let { quote = false, initialQuotedContent, value = $bindable("") } = $props();

  const initialConfig = {
    theme: theme,
    nodes: [ListNode, ListItemNode, QuoteNode, LinkNode],
    onError: (error) => {
      throw error;
    },
    editorState: () => {
      if (value != null && value !== "") {
        return convertFromMarkdownString(value, ALL_TRANSFORMERS);
      }
      if (initialQuotedContent?.content) {
        // Wrap content in markdown blockquote syntax (e.g. when replying to a comment)
        const quotedContent = initialQuotedContent.content
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n");
        return convertFromMarkdownString(quotedContent, ALL_TRANSFORMERS);
      }
      return null;
    },
  };

  let composer = $state(Composer);
  let editorScroller = $state(null);

  $effect(() => {
    if (!composer) return;
    const editor = composer.getEditor();
    return editor.registerUpdateListener(() => {
      editor.read(() => {
        value = convertToMarkdownString(ALL_TRANSFORMERS);
      });
    });
  });

  /** When value is set from outside (e.g. API prefill after mount), show it in the editor if the editor is still empty. */
  $effect(() => {
    if (!composer || value == null || String(value).trim() === "") return;
    const editor = composer.getEditor();
    const state = editor.getEditorState();
    if (!state) return;
    let currentMarkdown = "";
    state.read(() => {
      currentMarkdown = convertToMarkdownString(ALL_TRANSFORMERS);
    });
    if (currentMarkdown.trim() !== "") return;
    editor.update(() => {
      convertFromMarkdownString(value, ALL_TRANSFORMERS);
    });
  });

  /** When content looks like a reply (starts with ">"), ensure a paragraph after the quote and move cursor there so the user types after the quote. */
  let hasMovedCursorToEnd = $state(false);
  $effect(() => {
    const val = value ?? "";
    if (val.trim() === "") {
      hasMovedCursorToEnd = false;
      return;
    }
    const isReplyWithQuote = /^>/m.test(val);
    if (!isReplyWithQuote || hasMovedCursorToEnd || !composer) return;
    const editor = composer.getEditor();
    const id = setTimeout(() => {
      editor.update(() => {
        const root = getRoot();
        const last = root.getLastChild();
        if (last && last.getType() === "quote") {
          root.append(createParagraphNode());
        }
        root.selectEnd();
      });
      editor.focus();
      hasMovedCursorToEnd = true;
    }, 150);
    return () => clearTimeout(id);
  });

  // List and link transformers for markdown shortcuts (e.g. "1. ", "- ", [text](url))
  const markdownTransformers = [UNORDERED_LIST, ORDERED_LIST, LINK];
</script>

<Composer {initialConfig} bind:this={composer}>
  <div class="editor-shell svelte-lexical">
    <EditorToolbar {quote} />
    <div class="editor-container">
      <div class="editor-scroller" bind:this={editorScroller}>
        <div class="editor">
          <ContentEditable />
        </div>
      </div>
      <RichTextPlugin />
      <HistoryPlugin />
      <ListPlugin />
      <LinkPlugin />
      {#if editorScroller}
        <FloatingLinkEditorPlugin anchorElem={editorScroller} />
        <PreventLinkNavigationPlugin anchorElem={editorScroller} />
      {/if}
      <MarkdownShortcutPlugin transformers={markdownTransformers} />
    </div>
  </div>
</Composer>

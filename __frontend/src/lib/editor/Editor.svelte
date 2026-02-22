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
    $getSelection as getSelection,
    $isRangeSelection as isRangeSelection,
    CLICK_COMMAND,
    COMMAND_PRIORITY_HIGH,
  } from "lexical";
  import { $isLinkNode as isLinkNode } from "@lexical/link";
  import { $findMatchingParent as findMatchingParent } from "@lexical/utils";
  import EditorToolbar from "./EditorToolbar.svelte";
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
    const unregisterUpdate = editor.registerUpdateListener(() => {
      editor.read(() => {
        value = convertToMarkdownString(ALL_TRANSFORMERS);
      });
    });
    const unregisterClick = editor.registerCommand(
      CLICK_COMMAND,
      (event) => {
        const selection = getSelection();
        if (!isRangeSelection(selection)) return false;
        const node = selection.anchor.getNode();
        const link = findMatchingParent(node, isLinkNode);
        if (link && isLinkNode(link)) {
          const url = link.getURL?.();
          if (url) {
            event?.preventDefault?.();
            window.open(url, "_blank", "noopener,noreferrer");
            return true;
          }
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH
    );
    return () => {
      unregisterUpdate();
      unregisterClick();
    };
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

  // List and link transformers for markdown shortcuts (e.g. "1. ", "- ", [text](url))
  const markdownTransformers = [UNORDERED_LIST, ORDERED_LIST, LINK];

  let isSaving = $state(false);

  const saveComment = () => {
    isSaving = true;
    const editor = composer.getEditor();

    // Convert editor content directly to markdown
    editor.read(() => {
      const markdown = convertToMarkdownString(ALL_TRANSFORMERS);
      console.log("Markdown:", markdown);
      // TODO: Save markdown to database
    });

    isSaving = false;
  };
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
      {/if}
      <MarkdownShortcutPlugin transformers={markdownTransformers} />
    </div>
  </div>
</Composer>

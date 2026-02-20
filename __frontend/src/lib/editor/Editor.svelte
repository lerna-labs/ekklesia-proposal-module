<script>
  import {
    Composer,
    ContentEditable,
    RichTextPlugin,
    HistoryPlugin,
    ListPlugin,
    MarkdownShortcutPlugin,
    convertToMarkdownString,
    ALL_TRANSFORMERS,
    UNORDERED_LIST,
    ORDERED_LIST,
    convertFromMarkdownString,
  } from "svelte-lexical";
  import { ListNode, ListItemNode, QuoteNode } from "svelte-lexical";
  import { theme } from "svelte-lexical/dist/themes/default";
  import EditorToolbar from "./EditorToolbar.svelte";
  import "./editor.css";
  /** When true, the quote formatting option is shown in the toolbar. Default false. */
  let { quote = false, initialQuotedContent, value = $bindable("") } = $props();

  const initialConfig = {
    theme: theme,
    nodes: [ListNode, ListItemNode, QuoteNode],
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

  $effect(() => {
    if (!composer) return;
    const editor = composer.getEditor();
    const unregister = editor.registerUpdateListener(() => {
      editor.read(() => {
        value = convertToMarkdownString(ALL_TRANSFORMERS);
      });
    });
    return () => unregister();
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

  // Use both list transformers - ORDERED_LIST should handle "1. " pattern
  const listTransformers = [UNORDERED_LIST, ORDERED_LIST];

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
      <div class="editor-scroller">
        <div class="editor">
          <ContentEditable />
        </div>
      </div>
      <RichTextPlugin />
      <HistoryPlugin />
      <ListPlugin />
      <MarkdownShortcutPlugin transformers={listTransformers} />
    </div>
  </div>
</Composer>

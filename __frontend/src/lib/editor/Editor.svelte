<script>
  import { onMount } from "svelte";
  import {
    Composer,
    ContentEditable,
    RichTextPlugin,
    HistoryPlugin,
    ListPlugin,
    LinkPlugin,
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
    TOGGLE_LINK_COMMAND,
    $isLinkNode as isLinkNode,
  } from "@lexical/link";
  import { $findMatchingParent as findMatchingParent } from "@lexical/utils";
  import {
    $getRoot as getRoot,
    $createParagraphNode as createParagraphNode,
    $getSelection as getSelection,
    $isRangeSelection as isRangeSelection,
    COMMAND_PRIORITY_HIGH,
  } from "lexical";
  import { z } from "zod";
  import EditorToolbar from "./EditorToolbar.svelte";
  import PreventLinkNavigationPlugin from "./link/PreventLinkNavigationPlugin.svelte";
  import CustomLinkEditorPlugin from "./link/CustomLinkEditorPlugin.svelte";
  import "./editor.css";

  /** Set to true to log editor link-command and validation to the console. */
  const DEBUG_EDITOR = false;

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
  let linkEditorToolbarSlot = $state(null);

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

  $effect(() => {
    if (!composer) return;
    const editor = composer.getEditor();
    if (DEBUG_EDITOR) console.log("[Editor] registering TOGGLE_LINK_COMMAND listener", !!editor);
    const httpUrl = z.url({ protocol: /^https?$/, hostname: z.regexes.domain });
    const mailtoUrl = z.url({ protocol: /^mailto$/ });
    const telUrl = z.url({ protocol: /^tel$/ });
    const linkUrl = z.union([httpUrl, mailtoUrl, telUrl]);

    function isValidUrl(url) {
      const result = linkUrl.safeParse(url);
      if (DEBUG_EDITOR) console.log("[Editor] isValidUrl", {
        url,
        valid: result.success,
        issues: result.success ? null : result.error.issues,
      });
      return result.success;
    }

    function setLinkEditorInvalid(invalid) {
      const el = document.querySelector(".link-editor");
      if (el) el.classList.toggle("link-invalid", invalid);
    }

    return editor.registerCommand(
      TOGGLE_LINK_COMMAND,
      (payload) => {
        if (DEBUG_EDITOR) console.log("[Editor] TOGGLE_LINK_COMMAND", payload);
        if (payload === null) {
          if (DEBUG_EDITOR) console.log("[Editor] passthrough (delete)", payload);
          setLinkEditorInvalid(false);
          return false;
        }
        const isPopoverOpen = !!document.querySelector(
          ".link-editor .link-input",
        );
        if (payload === "https://" && !isPopoverOpen) {
          if (DEBUG_EDITOR) console.log("[Editor] passthrough (open popover)", payload);
          setLinkEditorInvalid(false);
          return false;
        }
        if (!isValidUrl(payload)) {
          setLinkEditorInvalid(true);
          // setTimeout(() => {
          //   editor.update(() => {
          //     editor.dispatchCommand(TOGGLE_LINK_COMMAND, payload);
          //   });
          // }, 50);
          return false;
        }
        if (DEBUG_EDITOR) console.log("[Editor] valid URL, applying and closing popover");
        setLinkEditorInvalid(false);
        queueMicrotask(() => {
          editor.update(() => {
            const sel = getSelection();
            if (!isRangeSelection(sel)) return;
            const node = sel.anchor.getNode();
            const linkNode = isLinkNode(node)
              ? node
              : findMatchingParent(node, isLinkNode);
            if (linkNode) {
              const parent = linkNode.getParent();
              if (parent) {
                const idx = linkNode.getIndexWithinParent();
                parent.select(idx + 1, idx + 1);
              }
            }
          });
        });
        return false;
      },
      COMMAND_PRIORITY_HIGH,
    );
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
    <div class="toolbar-row">
      <EditorToolbar {quote} />
      <div class="link-editor-toolbar-slot" bind:this={linkEditorToolbarSlot}></div>
    </div>
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
        <CustomLinkEditorPlugin anchorElem={editorScroller} toolbarSlotElem={linkEditorToolbarSlot} />
        <PreventLinkNavigationPlugin anchorElem={editorScroller} />
      {/if}
      <MarkdownShortcutPlugin transformers={markdownTransformers} />
    </div>
  </div>
</Composer>

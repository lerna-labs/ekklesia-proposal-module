<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
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
  } from "svelte-lexical";
  import { ListNode, ListItemNode } from "svelte-lexical";
  import { theme } from "svelte-lexical/dist/themes/default";

  import {
    $getRoot as getRoot,
    $createTextNode as createTextNode,
    $createParagraphNode as createParagraphNode,
  } from "svelte-lexical";

  import EditorToolbar from "./EditorToolbar.svelte";

  const initialConfig = {
    theme: theme,
    nodes: [ListNode, ListItemNode],
    onError: (error) => {
      throw error;
    },
    editorState: () => {},
  };

  let composer = $state(Composer);

  // Use both list transformers - ORDERED_LIST should handle "1. " pattern
  const listTransformers = [UNORDERED_LIST, ORDERED_LIST];

  const saveComment = () => {
    const editor = composer.getEditor();
    editor.read(() => {
      const markdown = convertToMarkdownString(ALL_TRANSFORMERS);
      console.log(markdown);
    });
  };
</script>

<Card.Root class="gap-0 mt-4">
  <Card.Header class="pb-0 mb-0">
    <Card.Title>Comment</Card.Title>
    <Card.Description>Add a comment to the proposal</Card.Description>
  </Card.Header>
  <Card.Content class="pt-4 pb-4">
    <Composer {initialConfig} bind:this={composer}>
      <div class="editor-shell svelte-lexical">
        <EditorToolbar />
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
  </Card.Content>
  <Card.Footer class="flex justify-end gap-1">
    <Button variant="outline" size="sm" class="text-xs">Save</Button>
    <Button variant="outline" size="sm" class="text-xs">Cancel</Button>
  </Card.Footer>
</Card.Root>

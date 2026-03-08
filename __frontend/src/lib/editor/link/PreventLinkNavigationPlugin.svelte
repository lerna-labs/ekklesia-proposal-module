<script>
  import { $isLinkNode as isLinkNode } from "@lexical/link";
  import { $findMatchingParent as findMatchingParent } from "@lexical/utils";
  import {
    CLICK_COMMAND,
    COMMAND_PRIORITY_HIGH,
    $getNearestNodeFromDOMNode as getNearestNodeFromDOMNode,
  } from "lexical";
  import { onMount } from "svelte";
  import { getEditor } from "svelte-lexical";

  let { anchorElem = document.body } = $props();
  const editor = getEditor();

  onMount(() => {
    return editor.registerCommand(
      CLICK_COMMAND,
      (payload, targetEditor) => {
        const event = payload;
        const target = event?.target;
        if (!target?.closest || event.metaKey || event.ctrlKey) return false;
        if (!anchorElem?.contains(target) || target.closest(".link-editor")) return false;

        const editorToUse = targetEditor ?? editor;
        let handled = false;
        editorToUse.read(() => {
          const node = getNearestNodeFromDOMNode(target);
          if (!node) return;
          const linkNode = findMatchingParent(node, isLinkNode);
          if (!isLinkNode(linkNode)) return;
          event.preventDefault();
          handled = true;
        });
        return handled;
      },
      COMMAND_PRIORITY_HIGH,
    );
  });
</script>

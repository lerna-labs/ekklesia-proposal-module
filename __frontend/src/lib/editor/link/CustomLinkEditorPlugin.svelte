<script>
  import { onMount } from "svelte";
  import { getEditor, sanitizeUrl } from "svelte-lexical";
  import { TOGGLE_LINK_COMMAND, $isLinkNode as isLinkNode } from "@lexical/link";
  import { $findMatchingParent as findMatchingParent, mergeRegister } from "@lexical/utils";
  import {
    $getSelection as getSelection,
    $isRangeSelection as isRangeSelection,
    $isNodeSelection as isNodeSelection,
    getDOMSelection,
    COMMAND_PRIORITY_HIGH,
  } from "lexical";
  import getSelectedNode from "./getSelectionInfo.js";
  import { setFloatingElemPositionForLinkEditor } from "./setFloatingElemPositionForLinkEditor.js";
  import { isValidLinkUrl } from "./linkValidation.js";
  import { toast } from "svelte-sonner";
  import "./custom-link-editor.css";

  let { anchorElem = document.body, toolbarSlotElem = null } = $props();

  let editorRef = $state(null);
  let isOpen = $state(false);
  let addMode = $state(false);
  let url = $state("");
  let invalid = $state(false);
  let lastRect = $state(null);
  let justClosedByUser = $state(false);

  const editor = getEditor();

  function updatePosition() {
    if (toolbarSlotElem || !editorRef || !anchorElem || !editor) return;
    if (lastRect) {
      setFloatingElemPositionForLinkEditor(lastRect, editorRef, anchorElem);
    } else if (!isOpen) {
      setFloatingElemPositionForLinkEditor(null, editorRef, anchorElem);
    }
  }

  $effect(() => {
    if (isOpen) {
      document.body.setAttribute("data-custom-link-open", "");
    } else {
      document.body.removeAttribute("data-custom-link-open");
    }
    return () => document.body.removeAttribute("data-custom-link-open");
  });

  $effect(() => {
    if (!editorRef) return;
    const parent = toolbarSlotElem ?? anchorElem;
    if (parent && !parent.contains(editorRef)) {
      parent.appendChild(editorRef);
    }
  });

  $effect(() => {
    updatePosition();
  });

  function getLinkUrlAndRect() {
    const selection = getSelection();
    let linkUrl = "";
    let domRect = null;
    const rootElement = editor.getRootElement();
    const nativeSelection = getDOMSelection(editor._window);

    if (isRangeSelection(selection)) {
      const node = getSelectedNode(selection);
      const linkParent = findMatchingParent(node, isLinkNode);
      if (isLinkNode(linkParent)) {
        linkUrl = linkParent.getURL();
      } else if (isLinkNode(node)) {
        linkUrl = node.getURL();
      }
      if (nativeSelection && rootElement?.contains(nativeSelection.anchorNode)) {
        domRect = nativeSelection.focusNode?.parentElement?.getBoundingClientRect?.() ?? null;
      }
    } else if (isNodeSelection(selection)) {
      const nodes = selection.getNodes();
      if (nodes.length > 0) {
        const node = nodes[0];
        const parent = node.getParent();
        if (isLinkNode(parent)) {
          linkUrl = parent.getURL();
        } else if (isLinkNode(node)) {
          linkUrl = node.getURL();
        }
        const element = editor.getElementByKey(node.getKey());
        if (element) {
          domRect = element.getBoundingClientRect();
        }
      }
    }
    return { linkUrl, domRect };
  }

  onMount(() => {
    return mergeRegister(
      editor.registerCommand(
        TOGGLE_LINK_COMMAND,
        (payload) => {
          if (payload === null) return false;
          if (payload === "https://") {
            const alreadyOpen = !!document.querySelector(".custom-link-editor");
            if (alreadyOpen) return false;
            isOpen = true;
            addMode = true;
            url = "";
            invalid = false;
            queueMicrotask(() => {
              editor.getEditorState().read(() => {
                const { domRect } = getLinkUrlAndRect();
                if (domRect) {
                  lastRect = {
                    top: domRect.top + 40,
                    left: domRect.left,
                    width: domRect.width,
                    height: domRect.height,
                  };
                }
              });
            });
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerUpdateListener(({ editorState }) => {
        if (justClosedByUser) return;
        editorState.read(() => {
          const { linkUrl, domRect } = getLinkUrlAndRect();
          if (linkUrl !== "") {
            if (!isOpen) {
              isOpen = true;
              addMode = false;
              url = linkUrl;
              invalid = false;
            } else if (!addMode) {
              url = linkUrl;
            }
            if (domRect) {
              lastRect = {
                top: domRect.top + 40,
                left: domRect.left,
                width: domRect.width,
                height: domRect.height,
              };
            }
          } else if (!addMode) {
            isOpen = false;
            lastRect = null;
          }
        });
      }),
    );
  });

  function handleCancel() {
    justClosedByUser = true;
    editor.update(() => {
      const sel = getSelection();
      if (isRangeSelection(sel)) {
        const node = sel.anchor.getNode();
        const linkNode = isLinkNode(node) ? node : findMatchingParent(node, isLinkNode);
        if (linkNode) {
          const parent = linkNode.getParent();
          if (parent) {
            const idx = linkNode.getIndexWithinParent();
            parent.select(idx + 1, idx + 1);
          }
        }
      }
    });
    isOpen = false;
    addMode = false;
    invalid = false;
    lastRect = null;
    editor.getRootElement()?.focus();
    queueMicrotask(() => {
      justClosedByUser = false;
    });
  }

  function handleConfirm() {
    let toApply = url.trim();
    if (toApply && !/^(https?|mailto|tel):/i.test(toApply)) {
      toApply = "https://" + toApply;
    }
    if (!isValidLinkUrl(toApply)) {
      invalid = true;
      toast.error("Please enter a valid URL.");
      return;
    }
    invalid = false;
    const sanitized = sanitizeUrl(toApply);
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, sanitized);
    queueMicrotask(() => {
      editor.update(() => {
        const sel = getSelection();
        if (!isRangeSelection(sel)) return;
        const node = sel.anchor.getNode();
        const linkNode = isLinkNode(node) ? node : findMatchingParent(node, isLinkNode);
        if (linkNode) {
          const parent = linkNode.getParent();
          if (parent) {
            const idx = linkNode.getIndexWithinParent();
            parent.select(idx + 1, idx + 1);
          }
        }
      });
      isOpen = false;
      addMode = false;
      lastRect = null;
    });
  }

  function handleRemoveLink() {
    justClosedByUser = true;
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    queueMicrotask(() => {
      editor.update(() => {
        const sel = getSelection();
        if (isRangeSelection(sel)) {
          const node = sel.anchor.getNode();
          const linkNode = isLinkNode(node) ? node : findMatchingParent(node, isLinkNode);
          if (linkNode) {
            const parent = linkNode.getParent();
            if (parent) {
              const idx = linkNode.getIndexWithinParent();
              parent.select(idx + 1, idx + 1);
            }
          }
        }
      });
      isOpen = false;
      addMode = false;
      invalid = false;
      lastRect = null;
      editor.getRootElement()?.focus();
      justClosedByUser = false;
    });
  }

  function preventDefault(e) {
    e.preventDefault();
  }

  function handleOpenInNewTab() {
    const targetUrl = url?.trim();
    if (targetUrl && /^(https?|mailto|tel):/i.test(targetUrl)) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    bind:this={editorRef}
    class="link-editor custom-link-editor"
    class:link-invalid={invalid}
    role="dialog"
    aria-label="Edit link"
  >
    <input
      type="text"
      class="link-input"
      bind:value={url}
      placeholder="https://"
      onkeydown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleConfirm();
        }
        if (e.key === "Escape") handleCancel();
      }}
    />
    <div>
      {#if addMode}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
          class="link-cancel"
          role="button"
          tabindex="0"
          style="display: inline-flex"
          onmousedown={preventDefault}
          onclick={handleCancel}
        ></div>
      {:else}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
          class="link-open-external"
          role="button"
          tabindex="0"
          title="Open in new tab"
          aria-label="Open in new tab"
          onmousedown={preventDefault}
          onclick={handleOpenInNewTab}
        ></div>
      {/if}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        class="link-confirm"
        role="button"
        tabindex="0"
        onmousedown={preventDefault}
        onclick={handleConfirm}
      ></div>
      {#if !addMode}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
          class="link-trash"
          role="button"
          tabindex="0"
          title="Remove link"
          aria-label="Remove link"
          onmousedown={preventDefault}
          onclick={handleRemoveLink}
        ></div>
      {/if}
    </div>
  </div>
{/if}

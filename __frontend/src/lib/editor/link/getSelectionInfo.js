import { $isAtNodeEnd as isAtNodeEnd } from "@lexical/selection";

export default function getSelectedNode(selection) {
  const anchorNode = selection.anchor.getNode();
  const focusNode = selection.focus.getNode();
  if (anchorNode === focusNode) {
    return anchorNode;
  }
  const isBackward = selection.isBackward();
  if (isBackward) {
    return isAtNodeEnd(selection.focus) ? anchorNode : focusNode;
  }
  return isAtNodeEnd(selection.anchor) ? focusNode : anchorNode;
}

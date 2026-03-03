<script>
  /**
   * Single work package card for the work packages list: shows name and edit/delete actions.
   */
  import * as Card from "$lib/components/ui/card/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import TrashIcon from "@lucide/svelte/icons/trash-2";

  let {
    name = "",
    onEdit,
    onDelete,
  } = $props();

  const displayName = $derived(name || "Unnamed work package");
</script>

<Card.Root class="py-2">
  <Card.Header class="flex flex-row items-center gap-2 py-0 pl-4 pr-2 text-sm">
    <button
      type="button"
      class="min-w-0 flex-1 font-medium truncate text-left cursor-pointer focus:outline-none"
      title={displayName}
      onclick={onEdit}
    >
      {displayName}
    </button>
    <Button
      type="button"
      variant="outline"
      size="icon"
      class="shrink-0 size-8 cursor-pointer"
      aria-label="Edit work package"
      onclick={onEdit}
    >
      <PencilIcon class="size-4" />
    </Button>
    <Button
      type="button"
      variant="outline"
      size="icon"
      class="shrink-0 size-8 cursor-pointer"
      aria-label="Remove work package"
      onclick={onDelete}
    >
      <TrashIcon class="size-4" />
    </Button>
  </Card.Header>
</Card.Root>

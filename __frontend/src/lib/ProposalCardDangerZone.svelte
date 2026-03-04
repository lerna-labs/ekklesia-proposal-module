<script>
  import * as Card from "$lib/components/ui/card";
  import * as Button from "$lib/components/ui/button";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";

  /** @type {{ onWithdrawClick: () => void, title?: string, description?: string }} */
  let {
    onWithdrawClick,
    title = "Danger zone",
    description = "Withdraw this proposal. This action cannot be undone.",
  } = $props();
</script>

<Card.Root class="w-full border-2 border-destructive rounded-xl p-4 gap-0">
  <Card.Header class="p-0 pb-2">
    <Card.Title class="text-sm font-semibold">{title}</Card.Title>
    <Card.Description class="text-xs text-muted-foreground mt-0.5 mb-2">
      {description}
    </Card.Description>
  </Card.Header>
  <Card.Content class="p-0 px-0 pt-0">
    <Button.Root
      variant="destructive"
      size="sm"
      class="text-xs bg-destructive text-white hover:bg-destructive/90 px-3"
      aria-label="Withdraw proposal"
      title="Withdraw proposal"
      onclick={onWithdrawClick}
    >
      <Trash2Icon class="size-4 mr-1" />
      Withdraw Proposal
    </Button.Root>
  </Card.Content>
</Card.Root>

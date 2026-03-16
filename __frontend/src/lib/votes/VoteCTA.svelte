<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { loggedIn, showLogin, user } from "$stores/sessionManager.js";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import UserIcon from "@lucide/svelte/icons/user";
  import FileTextIcon from "@lucide/svelte/icons/file-text";

  let { voteSlug = "" } = $props();
</script>

<Card.Root class="mt-4">
  <Card.Header class="pb-0">
    <Card.Title class="text-base">Submit your proposal</Card.Title>
  </Card.Header>
  <Card.Content class="flex flex-wrap gap-2 pt-0!">
    <Button
      href="/dashboard/{voteSlug}/new"
      data-walletsigner-action="navigateAfterLogin"
      variant="default"
      size="sm"
      class="add-item-btn w-fit cursor-pointer gap-1 text-xs text-white"
    >
      <PlusIcon class="size-4 shrink-0" aria-hidden="true" />
      Create New Proposal
    </Button>
    <Button
      href="/dashboard#proposals"
      data-walletsigner-action="navigateAfterLogin"
      variant="outline"
      size="sm"
      class=" w-fit cursor-pointer gap-1 text-xs "
    >
      <UserIcon class="size-4 shrink-0" aria-hidden="true" />
      My Drafts
    </Button>
  </Card.Content>
</Card.Root>

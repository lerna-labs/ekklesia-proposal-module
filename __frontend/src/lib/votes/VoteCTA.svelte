<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { loggedIn, showLogin, user } from "$stores/sessionManager.js";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import UserIcon from "@lucide/svelte/icons/user";
  import FileTextIcon from "@lucide/svelte/icons/file-text";

  let { voteSlug = "" } = $props();

  const createHref = $derived(
    voteSlug ? `/dashboard/${voteSlug}/new` : "/dashboard",
  );

  const myProposalsHref = $derived(
    voteSlug && $user?.userId
      ? `/votes/${voteSlug}?proposer=${encodeURIComponent($user.userId)}&page=1&status=live,withdrawn,draft`
      : "/dashboard",
  );

  const blueButtonClass =
    "text-xs cursor-pointer bg-(--mbo-electric-blue) text-white hover:bg-(--mbo-cardano-blue) hover:border-(--mbo-cardano-blue) border-0";

  function openLogin() {
    showLogin.set(true);
  }
</script>

<Card.Root class="mt-4">
  <Card.Header class="pb-2">
    <Card.Title class="text-base">Your proposal</Card.Title>
  </Card.Header>
  <Card.Content class="flex flex-wrap gap-2">
    {#if $loggedIn}
      <Button
        href={createHref}
        variant="default"
        size="sm"
        class={blueButtonClass}
      >
        <PlusIcon class="size-4 shrink-0" aria-hidden="true" />
        Create New Proposal
      </Button>
      <Button
        href="/dashboard"
        variant="outline"
        size="sm"
        class={blueButtonClass}
      >
        <UserIcon class="size-4 shrink-0" aria-hidden="true" />
        Go to Dashboard
      </Button>
      <Button
        href={myProposalsHref}
        variant="outline"
        size="sm"
        class={blueButtonClass}
      >
        <FileTextIcon class="size-4 shrink-0" aria-hidden="true" />
        My Proposals
      </Button>
    {:else}
      <Button
        type="button"
        variant="default"
        size="sm"
        class={blueButtonClass}
        onclick={openLogin}
      >
        <PlusIcon class="size-4 shrink-0" aria-hidden="true" />
        Create New Proposal
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        class={blueButtonClass}
        onclick={openLogin}
      >
        <UserIcon class="size-4 shrink-0" aria-hidden="true" />
        Go to Dashboard
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        class={blueButtonClass}
        onclick={openLogin}
      >
        <FileTextIcon class="size-4 shrink-0" aria-hidden="true" />
        My Proposals
      </Button>
    {/if}
  </Card.Content>
</Card.Root>

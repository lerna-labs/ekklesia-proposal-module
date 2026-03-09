<script>
  import * as Card from "$lib/components/ui/card";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import Markdown from "$lib/base/Markdown.svelte";
  import HomeIcon from "@lucide/svelte/icons/home";
  import UserIcon from "@lucide/svelte/icons/user";

  let { proposal, vote } = $props();

  let trackRecordOpen = $state(false);

  const trackRecord = $derived(proposal?.metaData?.trackRecord ?? "");
  const hasTrackRecord = $derived(trackRecord.trim().length > 0);

  const proposerName = $derived(
    proposal?.metaData?.proposerDetails?.name ?? "",
  );
  const legalEntityType = $derived(
    proposal?.metaData?.contractingParty?.legalEntityType ?? "",
  );
  const links = $derived(
    Array.isArray(proposal?.metaData?.proposerDetails?.links)
      ? proposal.metaData.proposerDetails.links.filter(
          (l) => (l?.title ?? "").trim() || (l?.url ?? "").trim(),
        )
      : [],
  );
  const proposerHref = $derived(
    vote?.slug && proposal?.proposerId
      ? `/votes/${vote.slug}?proposer=${encodeURIComponent(proposal.proposerId)}&page=1`
      : null,
  );
</script>

<Card.Root class="h-full">
  <Card.Header>
    <Card.Title class="flex items-center gap-2">
      {#if legalEntityType === "company"}
        <HomeIcon class="size-4 shrink-0" aria-hidden="true" />
      {:else}
        <UserIcon class="size-4 shrink-0" aria-hidden="true" />
      {/if}
      Proposer
    </Card.Title>
  </Card.Header>
  <Card.Content class="space-y-3 text-sm">
    {#if proposerName.trim()}
      <div>
        <p class="font-medium text-muted-foreground mb-1">Name</p>
        {#if proposerHref}
          <a
            href={proposerHref}
            class="font-medium text-foreground hover:underline"
          >
            {proposerName}
          </a>
        {:else}
          <p class="font-medium">{proposerName}</p>
        {/if}
      </div>
    {/if}
    {#if legalEntityType.trim()}
      <div>
        <p class="font-medium text-muted-foreground mb-1">Entity type</p>
        <p class="capitalize">{legalEntityType}</p>
      </div>
    {/if}
    {#if links.length > 0}
      <div>
        <p class="font-medium text-muted-foreground mb-1">Links</p>
        <ul class="space-y-1">
          {#each links as link (link.url)}
            <li>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary hover:underline"
              >
                {link.title || link.url}
              </a>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
    {#if hasTrackRecord}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onclick={() => (trackRecordOpen = true)}
        >
          Track Record
        </Button>
      </div>
    {/if}
    {#if !proposerName.trim() && !legalEntityType.trim() && links.length === 0 && !hasTrackRecord}
      <p class="text-muted-foreground">No proposer details available.</p>
    {/if}
  </Card.Content>
</Card.Root>

<Dialog.Root bind:open={trackRecordOpen}>
  <Dialog.Content class="sm:max-w-lg max-h-[90dvh] overflow-y-auto flex flex-col">
    <Dialog.Header>
      <Dialog.Title>Track Record</Dialog.Title>
      <Dialog.Description class="sr-only">
        Proposer's track record and relevant experience
      </Dialog.Description>
    </Dialog.Header>
    <div class="text-sm py-2 **:first:mt-0">
      <Markdown content={trackRecord} />
    </div>
  </Dialog.Content>
</Dialog.Root>

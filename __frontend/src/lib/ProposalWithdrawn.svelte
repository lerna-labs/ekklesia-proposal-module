<script>
  import * as Alert from "$lib/components/ui/alert-dialog/index.js";
  import { formatUtcInstant } from "$lib/formatUtc.js";
  import Markdown from "$lib/base/Markdown.svelte";

  let { proposal, open = $bindable(false) } = $props();
</script>

<Alert.Root bind:open>
  <Alert.Content class="sm:max-w-md">
    {#if proposal}
      {@const wd = proposal.withdrawalDetails}
      {@const withdrawalDate = wd?.date
        ? formatUtcInstant(wd.date, {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "—"}
      <Alert.Header>
        <Alert.Title>
          {proposal.status === "withdrawnByAdmin"
            ? "Proposal Withdrawn by Admin"
            : "Proposal Withdrawn by Proposer"}
        </Alert.Title>
        <Alert.Description>
          This proposal was withdrawn on {withdrawalDate}
        </Alert.Description>
      </Alert.Header>
      {#if wd}
        <div class="space-y-1 text-sm">
          {#if wd.category}
            <p class="flex items-center gap-2">
              <span class="text-muted-foreground font-medium">Reason:</span>
              <span
                class="inline-flex items-center rounded-md bg-black px-2 py-0.5 text-xs font-medium text-white"
              >
                {wd.category}
              </span>
            </p>
          {/if}
          {#if wd.comment}
            <div>
              <span class="text-muted-foreground font-medium">Details:</span>
              <Markdown content={wd.comment} class="mt-0.5 text-sm" />
            </div>
          {/if}
        </div>
      {/if}
    {/if}
    <Alert.Footer>
      <Alert.Cancel>Close</Alert.Cancel>
    </Alert.Footer>
  </Alert.Content>
</Alert.Root>

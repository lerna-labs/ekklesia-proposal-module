<script>
  import * as Alert from "$lib/components/ui/alert-dialog/index.js";
  import Markdown from "$lib/base/Markdown.svelte";

  let { proposal, open = $bindable(false) } = $props();
</script>

<Alert.Root bind:open>
  <Alert.Content class="sm:max-w-md">
    {#if proposal}
      {@const wd = proposal.withdrawalDetails}
      {@const withdrawalDate = wd?.date
        ? new Date(wd.date).toLocaleString(undefined, {
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
              <span class="font-medium text-muted-foreground">Reason:</span>
              <span
                class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-black text-white"
              >
                {wd.category}
              </span>
            </p>
          {/if}
          {#if wd.comment}
            <div>
              <span class="font-medium text-muted-foreground">Details:</span>
              <Markdown content={wd.comment} class="text-sm mt-0.5" />
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

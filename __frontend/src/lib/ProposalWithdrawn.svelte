<script>
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Button from "$lib/components/ui/button";
  import Markdown from "$lib/base/Markdown.svelte";

  let { proposal, open = $bindable(false) } = $props();
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md">
    {#if proposal}
      {@const wd = proposal.withdrawalDetails}
      {@const withdrawalDate = wd?.date
        ? new Date(wd.date).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "—"}
      <Dialog.Header>
        <Dialog.Title>
          {proposal.status === "withdrawnByAdmin"
            ? "Proposal Withdrawn by Admin"
            : "Proposal Withdrawn by Proposer"}
        </Dialog.Title>
        <Dialog.Description>
          This proposal was withdrawn on {withdrawalDate}
        </Dialog.Description>
      </Dialog.Header>
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
    <Dialog.Footer>
      <Button.Root variant="outline" onclick={() => (open = false)}>
        Close
      </Button.Root>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

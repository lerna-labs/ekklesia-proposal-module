<script>
  import * as Card from "$lib/components/ui/card";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import Editor from "$lib/editor/Editor.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  let { comments } = $props();
  let isOpen = $state(false);
  let replyTo = $state(null);
</script>

<h2 class="text-xl font-medium mb-4">Comments ({comments.length})</h2>
{#each comments.filter((c) => c.replyTo === null) as comment}
  <Card.Root class="mb-4">
    <Card.Header>
      <Card.Title class="flex justify-between pb-0">
        <div class="text-sm font-medium">
          {comment.user?.name || comment.user?._id || "Anonymous"}
          {#if comment.authorType === "admin"}
            <Badge
              variant="secondary"
              class="text-xs bg-(--mbo-orange) text-white ml-1"
            >
              Admin
            </Badge>
          {/if}

          {#if comment.authorType === "proposer"}
            <Badge
              variant="secondary"
              class="text-xs bg-(--mbo-electric-blue) text-white ml-1"
            >
              Proposer
            </Badge>
          {/if}
        </div>
        <div class="text-xs text-muted-foreground font-normal">
          {new Date(comment.createdAt).toLocaleString()}
        </div>
      </Card.Title>
    </Card.Header>
    <Card.Content class="text-sm">
      {comment.content}
    </Card.Content>
    <Card.Footer>
      <Button
        variant="secondary"
        size="sm"
        class="text-xs"
        onclick={() => {
          replyTo = comment;
          isOpen = true;
        }}
      >
        Reply
      </Button>
    </Card.Footer>
  </Card.Root>

  {#each comments.filter((c) => c.replyTo === comment._id) as reply}
    <Card.Root class="mb-4 ml-8">
      <Card.Header>
        <Card.Title class="flex justify-between pb-0">
          <div class="text-sm font-medium">
            {reply.user?.name || reply.user?._id || "Anonymous"}
            {#if reply.authorType === "admin"}
              <Badge
                variant="secondary"
                class="text-xs bg-(--mbo-orange) text-white ml-1"
              >
                Admin
              </Badge>
            {/if}
            {#if reply.authorType === "proposer"}
              <Badge
                variant="secondary"
                class="text-xs bg-(--mbo-electric-blue) text-white ml-1"
              >
                Proposer
              </Badge>
            {/if}
          </div>
          <div class="text-xs text-muted-foreground font-normal">
            {new Date(reply.createdAt).toLocaleString()}
          </div>
        </Card.Title>
      </Card.Header>
      <Card.Content class="text-sm">
        {reply.content}
      </Card.Content>
      <Card.Footer>
        <Button variant="secondary" size="sm" class="text-xs">Reply</Button>
      </Card.Footer>
    </Card.Root>
  {/each}
{/each}

<Dialog.Root
  bind:open={isOpen}
  onOpenChange={(open) => {
    if (!open) {
      isOpen = false;
      replyTo = null;
    }
  }}
>
  <Dialog.Trigger class={buttonVariants({ variant: "outline" })}>
    Add Comment
  </Dialog.Trigger>
  <Dialog.Content class="sm:max-w-[425px]">
    <Dialog.Header>
      <Dialog.Title>
        {#if replyTo}
          Reply to "{replyTo.user?.name || replyTo.user?._id || "Anonymous"}"
        {:else}
          Add Comment
        {/if}
      </Dialog.Title>
    </Dialog.Header>
    <Editor quote={replyTo} />
    <Dialog.Footer>
      <Dialog.Close
        class={buttonVariants({
          variant: "outline",
          size: "sm",
          class: "text-xs",
        })}
      >
        Cancel
      </Dialog.Close>
      <Button type="submit" class="text-xs" size="sm">Save Comment</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

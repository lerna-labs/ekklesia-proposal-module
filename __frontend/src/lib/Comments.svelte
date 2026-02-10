<script>
  import * as Card from "$lib/components/ui/card";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import Editor from "$lib/editor/Editor.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  let { comments } = $props();
  let isOpen = $state(false);
  let replyTo = $state(null);

  const apiUrl = typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : "/api/v0";

  // API spec §3.6: comments is array of top-level comments; accept { data } or array. user.type: "proposer"|"admin"|"user"
  let list = $derived(Array.isArray(comments) ? comments : (comments?.data ?? []));

  // Lazy-loaded replies: commentId -> { loading, error, data, meta } (API spec §3.8 GET /comments/{commentId}/replies)
  let repliesByParent = $state({});

  async function loadReplies(commentId) {
    if (repliesByParent[commentId]) return;
    repliesByParent = { ...repliesByParent, [commentId]: { loading: true, error: null, data: [], meta: null } };
    try {
      const res = await fetch(`${apiUrl}/comments/${commentId}/replies`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok) {
        repliesByParent = {
          ...repliesByParent,
          [commentId]: { loading: false, error: json?.message ?? res.statusText, data: [], meta: null },
        };
        return;
      }
      repliesByParent = {
        ...repliesByParent,
        [commentId]: {
          loading: false,
          error: null,
          data: json.data ?? [],
          meta: json.meta ?? {},
        },
      };
    } catch (e) {
      repliesByParent = {
        ...repliesByParent,
        [commentId]: { loading: false, error: e.message ?? "Failed to load replies", data: [], meta: null },
      };
    }
  }

  function toggleReplies(comment) {
    const id = comment._id;
    const state = repliesByParent[id];
    if (state?.data?.length) {
      // Collapse: clear loaded replies so next click re-fetches (or we could keep and hide – re-fetch is simpler)
      const next = { ...repliesByParent };
      delete next[id];
      repliesByParent = next;
    } else {
      loadReplies(id);
    }
  }

  function isRepliesExpanded(commentId) {
    const state = repliesByParent[commentId];
    return state && (state.loading || state.data?.length > 0);
  }
</script>

<h2 class="text-xl font-medium mb-4">Comments ({list.length})</h2>
{#each list as comment (comment._id)}
  <Card.Root class="mb-4">
    <Card.Header>
      <Card.Title class="flex justify-between pb-0">
        <div class="text-sm font-medium">
          {comment.user?.name || comment.user?._id || "Anonymous"}
          {#if (comment.user?.type ?? comment.authorType) === "admin"}
            <Badge
              variant="secondary"
              class="text-xs bg-(--mbo-orange) text-white ml-1"
            >
              Admin
            </Badge>
          {/if}

          {#if (comment.user?.type ?? comment.authorType) === "proposer"}
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
    <Card.Footer class="flex flex-wrap items-center gap-2">
      {#if (comment.replyCount ?? 0) > 0}
        <Button
          variant="ghost"
          size="sm"
          class="text-xs text-muted-foreground h-auto py-1 px-2"
          onclick={() => toggleReplies(comment)}
        >
          {#if repliesByParent[comment._id]?.loading}
            Loading…
          {:else if isRepliesExpanded(comment._id)}
            Hide {comment.replyCount} reply(ies)
          {:else}
            View {comment.replyCount} reply(ies)
          {/if}
        </Button>
      {/if}
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

  <!-- Lazy-loaded replies (API §3.8) -->
  {#if (comment.replyCount ?? 0) > 0 && isRepliesExpanded(comment._id)}
    {@const state = repliesByParent[comment._id]}
    {#if state?.loading}
      <div class="ml-6 mb-4 pl-4 border-l-2 border-muted text-sm text-muted-foreground">Loading replies…</div>
    {:else if state?.error}
      <div class="ml-6 mb-4 pl-4 border-l-2 border-muted text-sm text-destructive">{state.error}</div>
    {:else if state?.data?.length}
      <div class="ml-6 mb-4 space-y-3">
        {#each state.data as reply (reply._id)}
          <Card.Root class="border-muted">
            <Card.Header class="py-2">
              <Card.Title class="flex justify-between items-center gap-2 text-xs pb-0">
                <div class="font-medium">
                  {reply.user?.name || reply.user?._id || "Anonymous"}
                  {#if (reply.user?.type ?? reply.authorType) === "admin"}
                    <Badge variant="secondary" class="text-[10px] bg-(--mbo-orange) text-white ml-1">Admin</Badge>
                  {/if}
                  {#if (reply.user?.type ?? reply.authorType) === "proposer"}
                    <Badge variant="secondary" class="text-[10px] bg-(--mbo-electric-blue) text-white ml-1">Proposer</Badge>
                  {/if}
                </div>
                <span class="text-muted-foreground font-normal shrink-0">{new Date(reply.createdAt).toLocaleString()}</span>
              </Card.Title>
            </Card.Header>
            <Card.Content class="py-1 text-sm">
              {reply.content}
            </Card.Content>
          </Card.Root>
        {/each}
        {#if state.meta?.hasNextPage}
          <p class="text-xs text-muted-foreground">More replies (pagination not yet implemented)</p>
        {/if}
      </div>
    {/if}
  {/if}
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

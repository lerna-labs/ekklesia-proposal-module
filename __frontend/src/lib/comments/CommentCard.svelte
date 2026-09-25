<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { shortenString } from "$lib/utils.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import Markdown from "$lib/base/Markdown.svelte";
  import { formatUtcInstant } from "$lib/formatUtc.js";
  import Timestamp from "./CommentCardTimestamp.svelte";
  import { commentAuthorLabel } from "./commentAuthorLabel.js";
  import { Heart, MessageSquare, MessagesSquare, Pencil, Trash2Icon } from "lucide-svelte";

  let {
    comment,
    isReply = false,
    currentUserId = null,
    showReplyButton = false,
    showLikeButton = false,
    showReplyCountButton = false,
    likeDisabled = false,
    likeDisabledTitle = "",
    replyDisabled = false,
    replyDisabledTitle = "",
    withdrawDisabled = false,
    withdrawDisabledTitle = "",
    isVoteAdmin = false,
    /** When replies were fetched, API total (handles stale embedded replyCount). */
    loadedReplyTotal = null,
    authorLabel = commentAuthorLabel,
    canEditComment = () => false,
    onToggleLike,
    onToggleReplies,
    onReply,
    onEdit,
    onWithdraw,
  } = $props();

  const isOwn = $derived(currentUserId && comment?.author?._id === currentUserId);

  const displayReplyCount = $derived.by(() => {
    const api = comment?.replyCount ?? 0;
    const loaded =
      loadedReplyTotal != null && typeof loadedReplyTotal === "number" ? loadedReplyTotal : null;
    if (loaded != null) return Math.max(api, loaded);
    return api;
  });
</script>

<Card.Root
  class="mb-4 {isReply ? 'ml-4' : ''} {comment?.withdrawalDetails ? 'bg-white opacity-50' : ''}"
>
  <Card.Header>
    <Card.Title class="flex flex-wrap items-start justify-between gap-2 pb-0">
      <div class="flex flex-wrap items-center gap-1.5 text-sm font-medium">
        {authorLabel(comment)}
        {#if comment?.author?.type === "admin"}
          <Badge variant="secondary" class="bg-(--mbo-orange) text-xs text-white">Admin</Badge>
        {/if}
        {#if comment?.author?.type === "proposer"}
          <Badge variant="secondary" class="bg-(--mbo-electric-blue) text-xs text-white"
            >Proposer</Badge
          >
        {/if}
        {#if comment?.author?._id?.startsWith?.("drep")}
          <Badge variant="secondary" class="bg-black text-xs text-white">DRep</Badge>
        {/if}
        {#if isOwn}
          <Badge variant="secondary" class="bg-(--mbo-electric-blue) text-xs text-white"
            >Your Comment</Badge
          >
        {/if}
        {#if comment?.withdrawalDetails}
          <Badge variant="destructive" class="text-xs">Withdrawn</Badge>
        {/if}
      </div>
      <span class="text-muted-foreground shrink-0 text-xs font-normal">
        <Timestamp value={comment?.createdAt} />
      </span>
    </Card.Title>
  </Card.Header>
  <Card.Content class="text-sm wrap-anywhere">
    {#if comment?.withdrawalDetails}
      <div class="space-y-2">
        <div class="text-black line-through">
          <Markdown content={comment?.content ?? ""} class="text-sm" />
        </div>
        <p class="text-black italic">
          Withdrawn. Reason: {comment.withdrawalDetails.category}
          {#if comment.withdrawalDetails.comment}
            — {comment.withdrawalDetails.comment}
          {/if}
        </p>

        <p class="text-xs text-black italic">
          Withdrawn on {formatUtcInstant(comment.withdrawalDetails.date, {
            dateStyle: "long",
            timeStyle: "short",
          })}
          by {shortenString(comment.withdrawalDetails.userId, 12, true)}
        </p>
      </div>
    {:else}
      <Markdown content={comment?.content ?? ""} class="text-sm" />
    {/if}
  </Card.Content>
  <Card.Footer class="flex flex-wrap items-center justify-between gap-2">
    <div class="flex flex-wrap items-center gap-2">
      {#if showLikeButton && !comment?.withdrawalDetails}
        <Button
          variant="outline"
          size="sm"
          class="text-xs"
          disabled={isOwn || likeDisabled}
          title={isOwn ? undefined : likeDisabled ? likeDisabledTitle || undefined : undefined}
          aria-label={isOwn
            ? undefined
            : likeDisabled
              ? `Like unavailable. ${likeDisabledTitle}`
              : "Like comment"}
          onclick={() => onToggleLike?.(comment)}
        >
          <Heart class="size-3.5 {comment?.userLiked ? 'text-destructive fill-current' : ''}" />
          <span class="ml-1">{comment?.likeCount ?? 0}</span>
        </Button>
      {/if}
      {#if showReplyCountButton && displayReplyCount > 0}
        <Button
          variant="outline"
          size="sm"
          class="text-xs"
          title="Total replies in this thread (including nested replies)."
          aria-label="Toggle replies, {displayReplyCount}"
          onclick={() => onToggleReplies?.(comment)}
        >
          <MessagesSquare class="size-3.5" />
          <span class="ml-1">{displayReplyCount}</span>
        </Button>
      {/if}
    </div>
    <div class="ml-auto flex flex-wrap items-center gap-2">
      {#if showReplyButton && !comment?.withdrawalDetails}
        <Button
          variant="secondary"
          size="sm"
          class="bg-(--mbo-electric-blue) text-xs text-white hover:border-(--mbo-cardano-blue) hover:bg-(--mbo-cardano-blue)"
          disabled={isOwn || replyDisabled}
          title={isOwn ? undefined : replyDisabled ? replyDisabledTitle || undefined : undefined}
          aria-label={isOwn
            ? undefined
            : replyDisabled
              ? `Reply unavailable. ${replyDisabledTitle}`
              : "Reply to comment"}
          onclick={() => onReply?.(comment)}
        >
          <MessageSquare class="size-3.5" />
          <span class="ml-1">Reply</span>
        </Button>
      {/if}
      {#if canEditComment(comment) && !comment?.withdrawalDetails}
        <Button
          variant="secondary"
          size="sm"
          class="bg-(--mbo-electric-blue) text-xs text-white hover:border-(--mbo-cardano-blue) hover:bg-(--mbo-cardano-blue)"
          onclick={() => onEdit?.(comment)}
        >
          <Pencil class="size-3.5" />
          <span class="ml-1">Edit</span>
        </Button>
      {/if}
      {#if isVoteAdmin && !comment?.withdrawalDetails}
        <Button
          variant="destructive"
          size="sm"
          class="bg-destructive hover:bg-destructive/90 text-xs text-white"
          disabled={withdrawDisabled}
          aria-label={withdrawDisabled
            ? `Withdraw comment unavailable. ${withdrawDisabledTitle}`
            : "Withdraw comment"}
          title={withdrawDisabled ? withdrawDisabledTitle || undefined : "Withdraw comment"}
          onclick={() => onWithdraw?.(comment)}
        >
          <Trash2Icon class="mr-1 size-4" />
          Withdraw Comment
        </Button>
      {/if}
    </div>
  </Card.Footer>
</Card.Root>

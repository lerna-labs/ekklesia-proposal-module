<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { shortenString } from "$lib/utils.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import Markdown from "$lib/base/Markdown.svelte";
  import Timestamp from "$lib/base/Timestamp.svelte";
  import {
    Heart,
    MessageSquare,
    MessagesSquare,
    Pencil,
    Trash2Icon,
  } from "lucide-svelte";

  let {
    comment,
    isReply = false,
    currentUserId = null,
    canComment = false,
    showReplyButton = false,
    showLikeButton = false,
    showReplyCountButton = false,
    canLike = false,
    likeDisabled = false,
    isVoteAdmin = false,
    repliesData = [],
    authorLabel = (c) => {
      const a = c?.author;
      const name = a?.name && String(a.name).trim();
      if (name) return name;
      const id = a?._id ?? "";
      return shortenString(id, 12, true) || "—";
    },
    canEditComment = () => false,
    onToggleLike,
    onToggleReplies,
    onReply,
    onEdit,
    onWithdraw,
  } = $props();

  const isOwn = $derived(
    currentUserId && comment?.author?._id === currentUserId,
  );
</script>

<Card.Root
  class="mb-4 {isReply ? 'ml-4' : ''} {comment?.withdrawalDetails
    ? 'bg-white opacity-50'
    : ''}"
>
  <Card.Header>
    <Card.Title class="flex flex-wrap justify-between items-start gap-2 pb-0">
      <div class="flex flex-wrap items-center gap-1.5 font-medium text-sm">
        {authorLabel(comment)}
        {#if comment?.author?.type === "admin"}
          <Badge
            variant="secondary"
            class="text-xs bg-(--mbo-orange) text-white"
          >
            Admin
          </Badge>
        {/if}
        {#if comment?.author?.type === "proposer"}
          <Badge
            variant="secondary"
            class="text-xs bg-(--mbo-electric-blue) text-white"
          >
            Proposer
          </Badge>
        {/if}
        {#if comment?.author?._id?.startsWith?.("drep")}
          <Badge variant="secondary" class="text-xs bg-black text-white">
            DRep
          </Badge>
        {/if}
        {#if isOwn}
          <Badge
            variant="secondary"
            class="text-xs bg-(--mbo-electric-blue) text-white"
          >
            Your Comment
          </Badge>
        {/if}
        {#if comment?.withdrawalDetails}
          <Badge variant="destructive" class="text-xs">Withdrawn</Badge>
        {/if}
      </div>
      <span class="text-muted-foreground font-normal shrink-0 text-xs">
        <Timestamp value={comment?.createdAt} />
      </span>
    </Card.Title>
  </Card.Header>
  <Card.Content class="text-sm">
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

        <p class="text-black italic text-xs">
          Withdrawn on {new Date(comment.withdrawalDetails.date).toLocaleString(
            undefined,
            {
              dateStyle: "long",
              timeStyle: "short",
            },
          )}
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
          onclick={() => onToggleLike?.(comment)}
        >
          <Heart
            class="size-3.5 {comment?.userLiked
              ? 'fill-current text-destructive'
              : ''}"
          />
          <span class="ml-1">{comment?.likeCount ?? 0}</span>
        </Button>
      {/if}
      {#if showReplyCountButton && (comment?.replyCount ?? 0) > 0}
        <Button
          variant="outline"
          size="sm"
          class="text-xs"
          onclick={() => onToggleReplies?.(comment)}
        >
          <MessagesSquare class="size-3.5" />
          <span class="ml-1">{comment?.replyCount ?? 0}</span>
        </Button>
      {/if}
    </div>
    <div class="flex flex-wrap items-center gap-2 ml-auto">
      {#if showReplyButton && !comment?.withdrawalDetails}
        <Button
          variant="secondary"
          size="sm"
          class="text-xs bg-(--mbo-electric-blue) text-white hover:bg-(--mbo-cardano-blue) hover:border-(--mbo-cardano-blue)"
          disabled={isOwn}
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
          class="text-xs bg-(--mbo-electric-blue) text-white hover:bg-(--mbo-cardano-blue) hover:border-(--mbo-cardano-blue)"
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
          class="text-xs bg-destructive text-white hover:bg-destructive/90"
          aria-label="Withdraw comment"
          title="Withdraw comment"
          onclick={() => onWithdraw?.(comment)}
        >
          <Trash2Icon class="size-4 mr-1" />
          Withdraw Comment
        </Button>
      {/if}
    </div>
  </Card.Footer>
</Card.Root>

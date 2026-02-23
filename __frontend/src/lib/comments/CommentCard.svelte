<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import Markdown from "$lib/base/Markdown.svelte";
  import { Heart, MessageSquare, MessagesSquare } from "lucide-svelte";

  let {
    comment,
    isReply = false,
    currentUserId = null,
    canComment = false,
    canLike = false,
    isVoteAdmin = false,
    repliesData = [],
    authorLabel = (c) => c?.user?.name ?? "Anonymous",
    canEditComment = () => false,
    onToggleLike,
    onToggleReplies,
    onReply,
    onEdit,
    onWithdraw,
  } = $props();

  const isOwn = $derived(currentUserId && comment?.user?._id === currentUserId);
</script>

<Card.Root class="mb-4 {isReply ? 'ml-4' : ''}">
  <Card.Header>
    <Card.Title class="flex flex-wrap justify-between items-start gap-2 pb-0">
      <div class="flex flex-wrap items-center gap-1.5 font-medium text-sm">
        {authorLabel(comment)}
        {#if (comment?.user?.type ?? comment?.userType) === "admin"}
          <Badge variant="secondary" class="text-xs bg-(--mbo-orange) text-white">Admin</Badge>
        {/if}
        {#if (comment?.user?.type ?? comment?.userType) === "proposer"}
          <Badge variant="secondary" class="text-xs bg-(--mbo-electric-blue) text-white">Proposer</Badge>
        {/if}
        {#if comment?.user?._id?.startsWith?.("drep")}
          <Badge variant="secondary" class="text-xs">DRep</Badge>
        {/if}
        {#if isOwn}
          <Badge variant="secondary" class="text-xs bg-(--mbo-electric-blue) text-white">Your Comment</Badge>
        {/if}
        {#if comment?.withdrawalDetails}
          <Badge variant="destructive" class="text-xs">Withdrawn</Badge>
        {/if}
      </div>
      <span class="text-muted-foreground font-normal shrink-0 text-xs">
        {new Date(comment?.createdAt).toLocaleString()}
      </span>
    </Card.Title>
  </Card.Header>
  <Card.Content class="text-sm">
    {#if comment?.withdrawalDetails}
      <p class="text-muted-foreground italic">
        {#if isReply}
          This comment was withdrawn.
          {#if isOwn}
            Reason: {comment.withdrawalDetails.category}
            {#if comment.withdrawalDetails.comment}
              — {comment.withdrawalDetails.comment}
            {/if}
          {/if}
        {:else}
          This comment was withdrawn. {#if isOwn}
            Reason: {comment.withdrawalDetails.category}
            {#if comment.withdrawalDetails.comment}
              — {comment.withdrawalDetails.comment}
            {/if}
          {/if}
        {/if}
      </p>
    {:else}
      <Markdown content={comment?.content ?? ""} class="text-sm" />
    {/if}
  </Card.Content>
  {#if !isReply}
    <Card.Footer class="flex flex-wrap items-center gap-2">
      {#if canLike && !comment?.withdrawalDetails}
        <Button
          variant="outline"
          size="sm"
          class="text-xs"
          onclick={() => onToggleLike?.(comment)}
        >
          <Heart
            class="size-3.5 {comment?.userLiked ? 'fill-current text-destructive' : ''}"
          />
          <span class="ml-1">{comment?.likeCount ?? 0}</span>
        </Button>
      {/if}
      {#if (comment?.replyCount ?? 0) > 0}
        {@const rc = comment.replyCount ?? 0}
        <Button
          variant="outline"
          size="sm"
          class="text-xs"
          onclick={() => onToggleReplies?.(comment)}
        >
          <MessagesSquare class="size-3.5" />
          <span class="ml-1">
            {#if repliesData?.length}
              Hide {rc} {rc === 1 ? "reply" : "replies"}
            {:else}
              View {rc} {rc === 1 ? "reply" : "replies"}
            {/if}
          </span>
        </Button>
      {/if}
      {#if canComment && !comment?.withdrawalDetails}
        <Button
          variant="secondary"
          size="sm"
          class="text-xs bg-(--mbo-electric-blue) text-white hover:bg-(--mbo-cardano-blue) hover:border-(--mbo-cardano-blue)"
          onclick={() => onReply?.(comment)}
        >
          <MessageSquare class="size-3.5" />
          <span class="ml-1">Reply</span>
        </Button>
      {/if}
      {#if canEditComment(comment)}
        <Button variant="ghost" size="sm" class="text-xs" onclick={() => onEdit?.(comment)}>
          Edit
        </Button>
      {/if}
      {#if isVoteAdmin && !comment?.withdrawalDetails}
        <Button
          variant="ghost"
          size="sm"
          class="text-xs text-destructive"
          onclick={() => onWithdraw?.(comment)}
        >
          Withdraw
        </Button>
      {/if}
    </Card.Footer>
  {/if}
</Card.Root>

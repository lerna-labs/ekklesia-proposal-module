<script>
  import CommentCard from "./CommentCard.svelte";
  import CommentThread from "./CommentThread.svelte";
  import CommentsReplyLoading from "./CommentsReplyLoading.svelte";

  let {
    comment,
    isReply = false,
    repliesByParent = {},
    currentUserId = null,
    canComment = false,
    canLike = false,
    isVoteAdmin = false,
    authorLabel,
    canEditComment,
    onToggleLike,
    onToggleReplies,
    onReply,
    onEdit,
    onWithdraw,
  } = $props();
</script>

<CommentCard
  {comment}
  {isReply}
  {currentUserId}
  {canComment}
  {canLike}
  {isVoteAdmin}
  repliesData={repliesByParent[comment._id]?.data ?? []}
  {authorLabel}
  {canEditComment}
  {onToggleLike}
  {onToggleReplies}
  {onReply}
  {onEdit}
  {onWithdraw}
/>

{#if (comment.replyCount ?? 0) > 0 && repliesByParent[comment._id]}
  {@const replyState = repliesByParent[comment._id]}
  {#if replyState.error}
    <div class="ml-6 mb-4 pl-4 border-l-2 border-muted text-sm text-destructive">
      {replyState.error}
    </div>
  {:else if replyState.loading}
    <CommentsReplyLoading loading={replyState.loading} />
  {:else if replyState.data?.length}
    <div class="ml-6 mb-4 space-y-3">
      {#each replyState.data as reply (reply._id)}
        <CommentThread
          comment={reply}
          isReply={true}
          {repliesByParent}
          {currentUserId}
          {canComment}
          {canLike}
          {isVoteAdmin}
          {authorLabel}
          {canEditComment}
          {onToggleLike}
          {onToggleReplies}
          {onReply}
          {onEdit}
          {onWithdraw}
        />
      {/each}
    </div>
  {/if}
{/if}

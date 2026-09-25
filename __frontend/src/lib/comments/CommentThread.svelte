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
    showReplyButton = false,
    showLikeButton = false,
    showReplyCountButton = false,
    canLike = false,
    likeDisabled = false,
    likeDisabledTitle = "",
    replyDisabled = false,
    replyDisabledTitle = "",
    withdrawDisabled = false,
    withdrawDisabledTitle = "",
    isVoteAdmin = false,
    readOnly = false,
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
  showReplyButton={!readOnly && showReplyButton}
  {showLikeButton}
  {showReplyCountButton}
  {canLike}
  likeDisabled={readOnly || likeDisabled}
  {likeDisabledTitle}
  replyDisabled={readOnly || replyDisabled}
  {replyDisabledTitle}
  withdrawDisabled={readOnly || withdrawDisabled}
  {withdrawDisabledTitle}
  isVoteAdmin={!readOnly && isVoteAdmin}
  repliesData={repliesByParent[comment._id]?.data ?? []}
  {authorLabel}
  canEditComment={readOnly ? () => false : canEditComment}
  {onToggleLike}
  {onToggleReplies}
  {onReply}
  {onEdit}
  {onWithdraw}
  loadedReplyTotal={repliesByParent[comment._id]?.meta?.total ?? null}
/>

{#if repliesByParent[comment._id] && !repliesByParent[comment._id].collapsed}
  {@const replyState = repliesByParent[comment._id]}
  {#if replyState.error}
    <div class="border-muted text-destructive mb-4 ml-6 border-l-2 pl-4 text-sm">
      {replyState.error}
    </div>
  {:else if replyState.loading}
    <CommentsReplyLoading loading={replyState.loading} />
  {:else if replyState.data?.length}
    <div class="mb-4 ml-6 space-y-3">
      {#each replyState.data as reply (reply._id)}
        <CommentThread
          comment={reply}
          isReply={true}
          {repliesByParent}
          {currentUserId}
          {canComment}
          {showReplyButton}
          {showLikeButton}
          {showReplyCountButton}
          {canLike}
          {likeDisabled}
          {likeDisabledTitle}
          {replyDisabled}
          {replyDisabledTitle}
          {withdrawDisabled}
          {withdrawDisabledTitle}
          {isVoteAdmin}
          {readOnly}
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

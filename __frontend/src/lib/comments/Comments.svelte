<script>
  import { Button } from "$lib/components/ui/button";
  import { toast } from "svelte-sonner";
  import { untrack } from "svelte";
  import { user, showLogin, loggedIn } from "$stores/sessionManager.js";
  import { fetchJson } from "./fetchJson.js";
  import { commentAuthorLabel as authorLabel } from "./commentAuthorLabel.js";
  import CommentsHeader from "./CommentsHeader.svelte";
  import CommentCard from "./CommentCard.svelte";
  import CommentsAddReplyDialog from "./CommentsAddReplyDialog.svelte";
  import CommentsEditDialog from "./CommentsEditDialog.svelte";
  import CommentsWithdrawDialog from "./CommentsWithdrawDialog.svelte";
  import CommentsReplyLoading from "./CommentsReplyLoading.svelte";
  import CommentThread from "./CommentThread.svelte";
  import {
    feedbackActionsOpen,
    feedbackWindowActionsDisabledTitle,
  } from "$lib/voteWindowPolicy.js";

  let { proposalId, proposal, vote, readOnly = false } = $props();

  let currentUserId = $derived($user?.userId ?? null);

  let commentsState = $state({
    data: [],
    meta: {},
    loading: true,
    error: null,
  });
  let sort = $state("date");
  let direction = $state("desc");
  let userTypeFilter = $state([]);
  let page = $state(1);
  let sortPopoverOpen = $state(false);
  let filterPopoverOpen = $state(false);
  let pendingSort = $state("date");
  let pendingDescending = $state(true);
  let pendingProposer = $state(false);
  let pendingDrep = $state(false);
  let pendingAdmin = $state(false);

  let repliesByParent = $state({});
  let addDialogOpen = $state(false);
  let replyTo = $state(null);
  let commentValue = $state("");
  let submitError = $state(null);
  let isSubmitting = $state(false);
  let editComment = $state(null);
  let editValue = $state("");
  let editValidationErrors = $state(null);
  let withdrawComment = $state(null);
  let withdrawCategory = $state("");
  let withdrawReason = $state("");
  let withdrawError = $state(null);

  /** When true, open add/reply dialog after login. Cleared when modal is closed without login. */
  let pendingAddAfterLogin = $state(false);
  /** Comment to reply to after login, or null for new top-level comment. */
  let pendingReplyTo = $state(null);

  /** Bumps every 60s so feedback-window disabled state updates without navigation. */
  let policyNowMs = $state(Date.now());
  $effect(() => {
    const id = setInterval(() => {
      policyNowMs = Date.now();
    }, 60000);
    return () => clearInterval(id);
  });

  const policyNow = $derived(new Date(policyNowMs));

  /** Show comment actions chrome (new / reply / like) for live, non-withdrawn proposal context. */
  const showCommentActionChrome = $derived(
    proposal?.status === "live" && !readOnly,
  );

  const feedbackOpen = $derived(
    showCommentActionChrome && vote && feedbackActionsOpen(vote, policyNow),
  );

  const feedbackClosedTitle = $derived(
    vote && showCommentActionChrome && !feedbackOpen
      ? feedbackWindowActionsDisabledTitle(vote, policyNow)
      : "",
  );

  const canComment = $derived(currentUserId && feedbackOpen);

  const canLike = $derived(currentUserId && feedbackOpen);

  const isVoteAdmin = $derived(
    currentUserId &&
      vote?.admins &&
      Array.isArray(vote.admins) &&
      vote.admins.includes(currentUserId),
  );

  const hasActiveSort = $derived(sort !== "date" || direction !== "desc");
  const hasActiveFilter = $derived(userTypeFilter.length > 0);

  $effect(() => {
    if (sortPopoverOpen) {
      pendingSort = sort;
      pendingDescending = direction === "desc";
    }
    if (filterPopoverOpen) {
      pendingProposer = userTypeFilter.includes("proposer");
      pendingDrep = userTypeFilter.includes("drep");
      pendingAdmin = userTypeFilter.includes("admin");
    }
  });

  let addDialogClearTimeoutId = 0;

  function scheduleDeferredClear() {
    if (addDialogClearTimeoutId) {
      clearTimeout(addDialogClearTimeoutId);
      addDialogClearTimeoutId = 0;
    }
    addDialogClearTimeoutId = setTimeout(() => {
      replyTo = null;
      commentValue = "";
      submitError = null;
      pendingAddAfterLogin = false;
      pendingReplyTo = null;
      addDialogClearTimeoutId = 0;
    }, 250);
  }

  // When user logs in and had clicked Add Comment or Reply, open the add dialog once user data is ready
  $effect(() => {
    if (!$loggedIn || !pendingAddAfterLogin || !currentUserId) return;
    const replyToComment = pendingReplyTo ?? null;
    pendingAddAfterLogin = false;
    pendingReplyTo = null;
    const isOwnComment =
      replyToComment &&
      replyToComment.author?._id != null &&
      replyToComment.author._id === currentUserId;
    if (isOwnComment) {
      toast.info("You can't reply to your own comment.");
      return;
    }
    queueMicrotask(() => openAddDialog(replyToComment));
  });

  function canEditComment(c) {
    const authorId = c?.author?._id;
    if (!currentUserId || !authorId) return false;
    if (authorId !== currentUserId) return false;
    const createdAt = c.createdAt ? new Date(c.createdAt).getTime() : 0;
    return Date.now() - createdAt <= 15 * 60 * 1000;
  }

  async function loadComments() {
    commentsState = {
      ...untrack(() => commentsState),
      loading: true,
      error: null,
    };
    try {
      const userTypeParam =
        userTypeFilter.length > 0
          ? `&userType=${userTypeFilter.join(",")}`
          : "";
      const { ok, status, json } = await fetchJson(
        `/comments?proposal=${proposalId}&sort=${sort}&direction=${direction}&page=${page}&limit=20${userTypeParam}`,
      );
      if (!ok) {
        const msg = json?.message ?? `Error ${status}`;
        commentsState = { data: [], meta: {}, loading: false, error: msg };
        toast.error(msg);
        return;
      }
      commentsState = {
        data: json.data ?? [],
        meta: json.meta ?? {},
        loading: false,
        error: null,
      };
    } catch (err) {
      const msg = err?.message ?? "Failed to load comments";
      commentsState = { data: [], meta: {}, loading: false, error: msg };
      toast.error(msg);
    }
  }

  $effect(() => {
    if (proposalId) untrack(() => loadComments());
  });

  function applySort() {
    sort = pendingSort;
    direction = pendingDescending ? "desc" : "asc";
    page = 1;
    sortPopoverOpen = false;
    loadComments();
  }

  function resetSort() {
    pendingSort = "date";
    pendingDescending = true;
    sort = "date";
    direction = "desc";
    page = 1;
    sortPopoverOpen = false;
    loadComments();
  }

  function applyFilter() {
    userTypeFilter = [
      ...(pendingProposer ? ["proposer"] : []),
      ...(pendingDrep ? ["drep"] : []),
      ...(pendingAdmin ? ["admin"] : []),
    ];
    page = 1;
    filterPopoverOpen = false;
    loadComments();
  }

  function resetFilter() {
    pendingProposer = false;
    pendingDrep = false;
    pendingAdmin = false;
    userTypeFilter = [];
    page = 1;
    filterPopoverOpen = false;
    loadComments();
  }

  async function loadReplies(commentId, force = false) {
    const existing = repliesByParent[commentId];
    if (!force && (existing?.data?.length || existing?.loading)) return;
    repliesByParent = {
      ...repliesByParent,
      [commentId]: { loading: true, error: null, data: [], meta: null },
    };
    try {
      const { ok, json } = await fetchJson(
        `/comments/${commentId}/replies?page=1&limit=20`,
      );
      if (!ok) {
        const msg = json?.message ?? "Failed to load replies";
        repliesByParent = {
          ...repliesByParent,
          [commentId]: { loading: false, error: msg, data: [], meta: null },
        };
        toast.error(msg);
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
    } catch (err) {
      const msg = err?.message ?? "Failed to load replies";
      repliesByParent = {
        ...repliesByParent,
        [commentId]: { loading: false, error: msg, data: [], meta: null },
      };
      toast.error(msg);
    }
  }

  function toggleReplies(c) {
    const id = c._id;
    const state = repliesByParent[id];
    if (state?.data?.length) {
      const next = { ...repliesByParent };
      delete next[id];
      repliesByParent = next;
    } else {
      loadReplies(id);
    }
  }

  function requestLoginModal() {
    showLogin.set(false);
    queueMicrotask(() => showLogin.set(true));
  }

  function feedbackActionBlockedMessage() {
    const now = new Date(policyNowMs);
    if (!vote) return "Vote is not loaded.";
    return (
      feedbackWindowActionsDisabledTitle(vote, now) ||
      "Comments and replies are not available."
    );
  }

  async function openAddDialog(replyingTo = null) {
    if (!currentUserId) {
      pendingAddAfterLogin = true;
      pendingReplyTo = replyingTo;
      requestLoginModal();
      toast.info("Please log in to comment or reply.");
      return;
    }
    if (!vote || !feedbackActionsOpen(vote, new Date(policyNowMs))) {
      toast.error(feedbackActionBlockedMessage());
      return;
    }
    if (addDialogClearTimeoutId) {
      clearTimeout(addDialogClearTimeoutId);
      addDialogClearTimeoutId = 0;
    }
    replyTo = replyingTo;
    commentValue = replyingTo
      ? (replyingTo.content ?? "")
          .split("\n")
          .map((l) => `> ${l}`)
          .join("\n")
      : "";
    submitError = null;
    await import("$lib/editor/Editor.svelte");
    addDialogOpen = true;
  }

  async function submitComment() {
    if (!vote || !feedbackActionsOpen(vote, new Date(policyNowMs))) {
      submitError = feedbackActionBlockedMessage();
      toast.error(feedbackActionBlockedMessage());
      return;
    }
    const content = String(commentValue ?? "").trim();
    if (!content) {
      submitError = "Comment cannot be empty.";
      toast.error("Comment cannot be empty.");
      return;
    }
    if (content.length > 2000) {
      submitError = "Comment must be at most 2000 characters.";
      toast.error("Comment must be at most 2000 characters.");
      return;
    }
    isSubmitting = true;
    submitError = null;
    const body = { proposalId, content };
    if (replyTo) body.parentId = replyTo._id;
    const { ok, json } = await fetchJson("/comments", {
      method: "POST",
      body: JSON.stringify(body),
    });
    isSubmitting = false;
    if (!ok) {
      submitError = json?.message ?? "Failed to post comment.";
      toast.error(json?.message ?? "Failed to post comment.");
      return;
    }
    toast.success(replyTo ? "Reply posted" : "Comment posted");
    const parentId = replyTo?._id;
    addDialogOpen = false;
    scheduleDeferredClear();
    await loadComments();
    if (parentId) {
      loadReplies(parentId, true);
    }
  }

  function closeAddDialog() {
    addDialogOpen = false;
    scheduleDeferredClear();
  }

  async function toggleLike(c) {
    if (!currentUserId) {
      requestLoginModal();
      toast.info("Please log in to like.");
      return;
    }
    if (!vote || !feedbackActionsOpen(vote, new Date(policyNowMs))) {
      toast.error(feedbackActionBlockedMessage());
      return;
    }
    if (!canLike) return;
    const { ok, json } = await fetchJson(`/comments/${c._id}/like`, {
      method: "POST",
    });
    if (!ok) {
      toast.error(json?.message ?? "Failed to update like");
      return;
    }
    const updated = {
      ...c,
      likeCount: json.likeCount ?? c.likeCount,
      userLiked: json.liked ?? false,
    };
    const idx = commentsState.data.findIndex((x) => x._id === c._id);
    if (idx >= 0) {
      commentsState = {
        ...commentsState,
        data: commentsState.data.map((x) => (x._id === c._id ? updated : x)),
      };
      return;
    }
    for (const parentId of Object.keys(repliesByParent)) {
      const entry = repliesByParent[parentId];
      if (!entry?.data?.length) continue;
      const i = entry.data.findIndex((x) => x._id === c._id);
      if (i >= 0) {
        repliesByParent = {
          ...repliesByParent,
          [parentId]: {
            ...entry,
            data: entry.data.map((x) => (x._id === c._id ? updated : x)),
          },
        };
        return;
      }
    }
  }

  function openEdit(c) {
    editComment = c;
    editValue = c.content ?? "";
    editValidationErrors = null;
  }

  async function saveEdit() {
    if (!editComment) return;
    const content = String(editValue ?? "").trim();
    if (!content) {
      editValidationErrors = {
        properties: {
          "edit-content": { errors: ["Comment cannot be empty."] },
        },
      };
      return;
    }
    if (content.length > 2000) {
      editValidationErrors = {
        properties: {
          "edit-content": {
            errors: ["Comment must be at most 2000 characters."],
          },
        },
      };
      return;
    }
    editValidationErrors = null;
    const { ok, json } = await fetchJson(`/comments/${editComment._id}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
    if (!ok) {
      toast.error(json?.message ?? "Failed to update comment");
      return;
    }
    toast.success("Comment updated");
    const parentId = editComment?.parentId;
    editComment = null;
    editValue = "";
    await loadComments();
    if (parentId) loadReplies(parentId, true);
  }

  function closeEdit() {
    editComment = null;
    editValue = "";
    editValidationErrors = null;
  }

  function openWithdraw(c) {
    withdrawComment = c;
    withdrawCategory = "";
    withdrawReason = "";
    withdrawError = null;
  }

  async function submitWithdraw() {
    if (!vote || !feedbackActionsOpen(vote, new Date(policyNowMs))) {
      withdrawError = feedbackActionBlockedMessage();
      toast.error(feedbackActionBlockedMessage());
      return;
    }
    if (!withdrawComment || !withdrawCategory) {
      withdrawError = "Please select a category.";
      toast.error("Please select a category.");
      return;
    }
    const { ok, json } = await fetchJson(
      `/comments/${withdrawComment._id}/withdraw`,
      {
        method: "PUT",
        body: JSON.stringify({
          category: withdrawCategory,
          comment: withdrawReason || undefined,
        }),
      },
    );
    if (!ok) {
      withdrawError = json?.message ?? "Failed to withdraw.";
      toast.error(json?.message ?? "Failed to withdraw comment");
      return;
    }
    toast.success("Comment withdrawn");
    const parentId = withdrawComment.parentId;
    withdrawComment = null;
    withdrawCategory = "";
    withdrawReason = "";
    await loadComments();
    if (parentId) loadReplies(parentId, true);
  }

  function closeWithdraw() {
    withdrawComment = null;
    withdrawCategory = "";
    withdrawReason = "";
    withdrawError = null;
  }
</script>

<section id="comments">
  <CommentsHeader
    total={commentsState.meta?.threadTotal ?? commentsState.meta?.total ?? proposal?.commentCount}
    bind:sortPopoverOpen
    bind:filterPopoverOpen
    bind:pendingSort
    bind:pendingDescending
    bind:pendingProposer
    bind:pendingDrep
    bind:pendingAdmin
    {userTypeFilter}
    {hasActiveSort}
    {hasActiveFilter}
    onApplySort={applySort}
    onResetSort={resetSort}
    onApplyFilter={applyFilter}
    onResetFilter={resetFilter}
    onAddComment={showCommentActionChrome ? () => openAddDialog(null) : null}
    addCommentDisabled={showCommentActionChrome && !feedbackOpen}
    addCommentDisabledTitle={feedbackClosedTitle}
  />

  {#if commentsState.loading}
    <p class="text-sm text-muted-foreground">Loading comments…</p>
  {:else if commentsState.error}
    <p class="text-sm text-destructive">{commentsState.error}</p>
  {:else}
    <div class="space-y-4">
      {#each commentsState.data as comment (comment._id)}
        <CommentThread
          {comment}
          isReply={false}
          {repliesByParent}
          {currentUserId}
          {readOnly}
          {canComment}
          showReplyButton={showCommentActionChrome}
          showLikeButton={showCommentActionChrome}
          showReplyCountButton={showCommentActionChrome}
          {canLike}
          likeDisabled={!feedbackOpen}
          likeDisabledTitle={feedbackClosedTitle}
          replyDisabled={!feedbackOpen}
          replyDisabledTitle={feedbackClosedTitle}
          withdrawDisabled={!feedbackOpen}
          withdrawDisabledTitle={feedbackClosedTitle}
          isVoteAdmin={!readOnly && isVoteAdmin}
          {authorLabel}
          canEditComment={readOnly ? () => false : canEditComment}
          onToggleLike={toggleLike}
          onToggleReplies={toggleReplies}
          onReply={openAddDialog}
          onEdit={openEdit}
          onWithdraw={openWithdraw}
        />
      {/each}
    </div>

    {#if commentsState.meta?.hasNextPage}
      <Button
        variant="outline"
        size="sm"
        class="mt-4"
        onclick={() => {
          page++;
          loadComments();
        }}
      >
        Load more
      </Button>
    {/if}
  {/if}
</section>

<CommentsAddReplyDialog
  bind:open={addDialogOpen}
  {replyTo}
  bind:value={commentValue}
  bind:submitError
  {isSubmitting}
  {authorLabel}
  onClose={closeAddDialog}
  onSubmit={submitComment}
/>

<CommentsEditDialog
  comment={editComment}
  bind:value={editValue}
  validationErrors={editValidationErrors}
  onClose={closeEdit}
  onSave={saveEdit}
/>

<CommentsWithdrawDialog
  comment={withdrawComment}
  bind:category={withdrawCategory}
  bind:reason={withdrawReason}
  bind:error={withdrawError}
  onClose={closeWithdraw}
  onSubmit={submitWithdraw}
/>

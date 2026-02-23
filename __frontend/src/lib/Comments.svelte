<script>
  import * as Card from "$lib/components/ui/card";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Popover from "$lib/components/ui/popover";
  import * as RadioGroup from "$lib/components/ui/radio-group";
  import * as Separator from "$lib/components/ui/separator";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import Textarea from "$lib/form/Textarea.svelte";
  import Input from "$lib/form/Input.svelte";
  import Markdown from "$lib/base/Markdown.svelte";
  import { untrack } from "svelte";
  import { get } from "svelte/store";
  import { user, jwt, getJWT } from "$stores/sessionManager.js";
  import { Heart, MessageSquare, MessagesSquare } from "lucide-svelte";
  import ArrowUpDownIcon from "@lucide/svelte/icons/arrow-up-down";
  import FilterIcon from "@lucide/svelte/icons/sliders-horizontal";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import CheckIcon from "@lucide/svelte/icons/check";

  let { proposalId, proposal, vote } = $props();

  const API_BASE = typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : "/api/v0";

  let currentUserId = $derived(get(user)?.userId ?? null);

  let commentsState = $state({ data: [], meta: {}, loading: true, error: null });
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

  const SORT_OPTIONS = [
    { value: "date", label: "Date" },
    { value: "replycount", label: "Replies" },
    { value: "likecount", label: "Likes" },
  ];

  const hasActiveSort = $derived(sort !== "date" || direction !== "desc");
  const hasActiveFilter = $derived(userTypeFilter.length > 0);

  $effect(() => {
    if (sortPopoverOpen) {
      pendingSort = sort;
      pendingDescending = direction === "desc";
    }
  });
  $effect(() => {
    if (filterPopoverOpen) {
      pendingProposer = userTypeFilter.includes("proposer");
      pendingDrep = userTypeFilter.includes("drep");
      pendingAdmin = userTypeFilter.includes("admin");
    }
  });
  let repliesByParent = $state({});
  let addDialogOpen = $state(false);
  let replyTo = $state(null);
  let commentValue = $state("");
  let submitError = $state(null);
  let isSubmitting = $state(false);
  let editComment = $state(null);
  let editValue = $state("");
  let withdrawComment = $state(null);
  let withdrawCategory = $state("");
  let withdrawReason = $state("");
  let withdrawError = $state(null);

  const canComment = $derived(
    currentUserId &&
    proposal?.status === "live" &&
    vote?.feedbackEndDate &&
    new Date() < new Date(vote.feedbackEndDate)
  );

  const canLike = $derived(
    currentUserId &&
    proposal?.status === "live" &&
    vote?.feedbackEndDate &&
    new Date() < new Date(vote.feedbackEndDate)
  );

  const isVoteAdmin = $derived(
    currentUserId &&
    vote?.admins &&
    Array.isArray(vote.admins) &&
    vote.admins.includes(currentUserId)
  );

  function authorLabel(c) {
    const u = c?.user;
    if (!u) return "Anonymous";
    if (u.name && String(u.name).trim()) return u.name;
    const id = u._id ?? "";
    if (id.length > 16) return id.slice(0, 12) + "...";
    return id || "Anonymous";
  }

  function canEditComment(c) {
    if (!currentUserId || !c?.user?._id) return false;
    if (c.user._id !== currentUserId) return false;
    const createdAt = c.createdAt ? new Date(c.createdAt).getTime() : 0;
    return Date.now() - createdAt <= 15 * 60 * 1000;
  }

  async function fetchJson(url, options = {}) {
    const token = get(jwt) || getJWT();
    const headers = new Headers(options.headers || {});
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(API_BASE + url, { ...options, headers, credentials: "include" });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, json };
  }

  async function loadComments() {
    commentsState = { ...untrack(() => commentsState), loading: true, error: null };
    const userTypeParam =
      userTypeFilter.length > 0 ? `&userType=${userTypeFilter.join(",")}` : "";
    const { ok, status, json } = await fetchJson(
      `/comments?proposal=${proposalId}&sort=${sort}&direction=${direction}&page=${page}&limit=20${userTypeParam}`
    );
    if (!ok) {
      commentsState = { data: [], meta: {}, loading: false, error: json?.message ?? `Error ${status}` };
      return;
    }
    commentsState = { data: json.data ?? [], meta: json.meta ?? {}, loading: false, error: null };
  }

  $effect(() => {
    if (proposalId) loadComments();
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

  async function loadReplies(commentId) {
    if (repliesByParent[commentId]) return;
    repliesByParent = { ...repliesByParent, [commentId]: { loading: true, error: null, data: [], meta: null } };
    const { ok, json } = await fetchJson(`/comments/${commentId}/replies?page=1&limit=20`);
    if (!ok) {
      repliesByParent = {
        ...repliesByParent,
        [commentId]: { loading: false, error: json?.message ?? "Failed to load", data: [], meta: null },
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

  function openAddDialog(replyingTo = null) {
    replyTo = replyingTo;
    commentValue = replyingTo
      ? replyingTo.content
          .split("\n")
          .map((l) => `> ${l}`)
          .join("\n")
      : "";
    submitError = null;
    addDialogOpen = true;
  }

  async function submitComment() {
    const content = String(commentValue ?? "").trim();
    if (!content) {
      submitError = "Comment cannot be empty.";
      return;
    }
    if (content.length > 2000) {
      submitError = "Comment must be at most 2000 characters.";
      return;
    }
    isSubmitting = true;
    submitError = null;
    const body = { proposalId, content };
    if (replyTo) body.parentId = replyTo._id;
    const { ok, json } = await fetchJson("/comments", { method: "POST", body: JSON.stringify(body) });
    isSubmitting = false;
    if (!ok) {
      submitError = json?.message ?? "Failed to post comment.";
      return;
    }
    const parentId = replyTo?._id;
    addDialogOpen = false;
    replyTo = null;
    commentValue = "";
    await loadComments();
    if (parentId && repliesByParent[parentId]) {
      loadReplies(parentId);
    }
  }

  async function toggleLike(c) {
    if (!canLike) return;
    const { ok, json } = await fetchJson(`/comments/${c._id}/like`, { method: "POST" });
    if (!ok) return;
    c.likeCount = json.likeCount ?? c.likeCount;
    c.userLiked = json.liked ?? false;
  }

  function openEdit(c) {
    editComment = c;
    editValue = c.content ?? "";
  }

  async function saveEdit() {
    if (!editComment) return;
    const content = String(editValue ?? "").trim();
    if (!content) return;
    if (content.length > 2000) return;
    const { ok, json } = await fetchJson(`/comments/${editComment._id}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
    if (!ok) return;
    editComment.content = content;
    editComment = null;
    editValue = "";
    await loadComments();
  }

  function openWithdraw(c) {
    withdrawComment = c;
    withdrawCategory = "";
    withdrawReason = "";
    withdrawError = null;
  }

  async function submitWithdraw() {
    if (!withdrawComment || !withdrawCategory) {
      withdrawError = "Please select a category.";
      return;
    }
    const { ok, json } = await fetchJson(`/comments/${withdrawComment._id}/withdraw`, {
      method: "PUT",
      body: JSON.stringify({ category: withdrawCategory, comment: withdrawReason || undefined }),
    });
    if (!ok) {
      withdrawError = json?.message ?? "Failed to withdraw.";
      return;
    }
    const parentId = withdrawComment.parentId ?? withdrawComment._id;
    withdrawComment = null;
    withdrawCategory = "";
    withdrawReason = "";
    await loadComments();
    if (parentId && repliesByParent[parentId]) loadReplies(parentId);
  }

  const WITHDRAWAL_CATEGORIES = [
    "Inappropriate content",
    "Spam",
    "Policy violation",
    "Duplicate",
    "Other",
  ];
</script>

<section class="mt-8" id="comments">
  <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
    <h2 class="text-xl font-medium">
      Comments
      {#if commentsState.meta?.total != null}
        ({commentsState.meta.total})
      {/if}
    </h2>
    <div class="flex items-center gap-1 ml-auto">
      <Popover.Root bind:open={sortPopoverOpen}>
        <Popover.Trigger
          class={buttonVariants({
            variant: "outline",
            size: "icon",
            class: "cursor-pointer relative size-8",
          })}
          aria-label="Sort comments"
        >
          <ArrowUpDownIcon class="size-4" />
          {#if hasActiveSort}
            <span
              class="absolute top-1 right-1 size-1.5 rounded-full bg-blue-500 animate-pulse"
              aria-hidden="true"
            ></span>
          {/if}
        </Popover.Trigger>
        <Popover.Content align="start" class="w-56 p-3">
          <h3 class="text-sm font-medium mb-2">Sort comments</h3>
          <Separator.Root class="mb-3" />
          <div class="space-y-4">
            <div class="space-y-2">
              <Label class="text-xs text-muted-foreground">Sort by</Label>
              <RadioGroup.Root bind:value={pendingSort} class="grid gap-0 mt-0">
                {#each SORT_OPTIONS as option (option.value)}
                  <div class="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent/50">
                    <RadioGroup.Item value={option.value} id="comment-sort-{option.value}" />
                    <Label for="comment-sort-{option.value}" class="cursor-pointer font-normal">
                      {option.label}
                    </Label>
                  </div>
                {/each}
              </RadioGroup.Root>
            </div>
            <div class="space-y-2">
              <Label class="text-xs text-muted-foreground">Direction</Label>
              <div class="flex items-center gap-2">
                <Switch id="comment-sort-dir" bind:checked={pendingDescending} />
                <Label for="comment-sort-dir" class="cursor-pointer text-sm font-normal">
                  {pendingDescending ? "Descending" : "Ascending"}
                </Label>
              </div>
            </div>
            <div class="border-t pt-3 flex gap-1">
              {#if hasActiveSort}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  class="flex-1 text-xs text-white"
                  aria-label="Reset sort"
                  onclick={resetSort}
                >
                  <Trash2Icon class="size-4" />
                  Reset
                </Button>
              {/if}
              <Button type="button" variant="default" size="sm" class="flex-1 text-xs" onclick={applySort}>
                <CheckIcon class="size-4" />
                Apply
              </Button>
            </div>
          </div>
        </Popover.Content>
      </Popover.Root>
      <Popover.Root bind:open={filterPopoverOpen}>
        <Popover.Trigger
          class={buttonVariants({
            variant: "outline",
            size: "icon",
            class: "cursor-pointer relative size-8",
          })}
          aria-label="Filter comments by user type"
        >
          <FilterIcon class="size-4" />
          {#if hasActiveFilter}
            <span
              class="absolute top-1 right-1 size-1.5 rounded-full bg-blue-500 animate-pulse"
              aria-hidden="true"
            ></span>
          {/if}
        </Popover.Trigger>
        <Popover.Content align="start" class="w-56 p-3">
          <h3 class="text-sm font-medium mb-2">Filter by user type</h3>
          <Separator.Root class="mb-3" />
          <div class="space-y-2">
            <label
              for="comment-filter-proposer"
              class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent/50"
            >
              <Checkbox id="comment-filter-proposer" bind:checked={pendingProposer} />
              <span class="font-normal">Proposer</span>
            </label>
            <label
              for="comment-filter-drep"
              class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent/50"
            >
              <Checkbox id="comment-filter-drep" bind:checked={pendingDrep} />
              <span class="font-normal">DRep</span>
            </label>
            <label
              for="comment-filter-admin"
              class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent/50"
            >
              <Checkbox id="comment-filter-admin" bind:checked={pendingAdmin} />
              <span class="font-normal">Admin</span>
            </label>
          </div>
          <div class="border-t pt-3 flex gap-1 mt-3">
            {#if hasActiveFilter}
              <Button
                type="button"
                variant="destructive"
                size="sm"
                class="flex-1 text-xs text-white"
                aria-label="Reset filter"
                onclick={resetFilter}
              >
                <Trash2Icon class="size-4" />
                Reset
              </Button>
            {/if}
            <Button type="button" variant="default" size="sm" class="flex-1 text-xs" onclick={applyFilter}>
              <CheckIcon class="size-4" />
              Apply
            </Button>
          </div>
        </Popover.Content>
      </Popover.Root>
    </div>
  </div>

  {#if commentsState.loading}
    <p class="text-sm text-muted-foreground">Loading comments…</p>
  {:else if commentsState.error}
    <p class="text-sm text-destructive">{commentsState.error}</p>
  {:else}
    <div class="space-y-4">
      {#each commentsState.data as comment (comment._id)}
        {@const isOwn = currentUserId && comment.user?._id === currentUserId}
        <Card.Root class="mb-4">
          <Card.Header>
            <Card.Title class="flex flex-wrap justify-between items-start gap-2 pb-0">
              <div class="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                {authorLabel(comment)}
                {#if (comment.user?.type ?? comment.userType) === "admin"}
                  <Badge variant="secondary" class="text-xs bg-(--mbo-orange) text-white">Admin</Badge>
                {/if}
                {#if (comment.user?.type ?? comment.userType) === "proposer"}
                  <Badge variant="secondary" class="text-xs bg-(--mbo-electric-blue) text-white">Proposer</Badge>
                {/if}
                {#if comment.user?._id?.startsWith?.("drep")}
                  <Badge variant="secondary" class="text-xs">DRep</Badge>
                {/if}
                {#if isOwn}
                  <Badge variant="outline" class="text-xs">Your Comment</Badge>
                {/if}
                {#if comment.withdrawalDetails}
                  <Badge variant="destructive" class="text-xs">Withdrawn</Badge>
                {/if}
              </div>
              <span class="text-xs text-muted-foreground font-normal shrink-0">
                {new Date(comment.createdAt).toLocaleString()}
              </span>
            </Card.Title>
          </Card.Header>
          <Card.Content class="text-sm">
            {#if comment.withdrawalDetails}
              <p class="text-muted-foreground italic">
                This comment was withdrawn. {#if isOwn}
                  Reason: {comment.withdrawalDetails.category}
                  {#if comment.withdrawalDetails.comment}
                    — {comment.withdrawalDetails.comment}
                  {/if}
                {/if}
              </p>
            {:else}
              <Markdown content={comment.content} class="text-sm" />
            {/if}
          </Card.Content>
          <Card.Footer class="flex flex-wrap items-center gap-2">
            {#if canLike && !comment.withdrawalDetails}
              <Button
                variant="outline"
                size="sm"
                class="text-xs"
                onclick={() => toggleLike(comment)}
              >
                <Heart
                  class="size-3.5 {comment.userLiked ? 'fill-current text-destructive' : ''}"
                />
                <span class="ml-1">{comment.likeCount ?? 0}</span>
              </Button>
            {/if}
            {#if (comment.replyCount ?? 0) > 0}
              {@const rc = comment.replyCount ?? 0}
              <Button
                variant="outline"
                size="sm"
                class="text-xs"
                onclick={() => toggleReplies(comment)}
              >
                <MessagesSquare class="size-3.5" />
                <span class="ml-1">
                  {#if repliesByParent[comment._id]?.data?.length}
                    Hide {rc} {rc === 1 ? "reply" : "replies"}
                  {:else}
                    View {rc} {rc === 1 ? "reply" : "replies"}
                  {/if}
                </span>
              </Button>
            {/if}
            {#if canComment && !comment.withdrawalDetails}
              <Button
                variant="secondary"
                size="sm"
                class="text-xs bg-(--mbo-electric-blue) text-white hover:bg-(--mbo-cardano-blue) hover:border-(--mbo-cardano-blue)"
                onclick={() => openAddDialog(comment)}
              >
                <MessageSquare class="size-3.5" />
                <span class="ml-1">Reply</span>
              </Button>
            {/if}
            {#if canEditComment(comment)}
              <Button variant="ghost" size="sm" class="text-xs" onclick={() => openEdit(comment)}>
                Edit
              </Button>
            {/if}
            {#if isVoteAdmin && !comment.withdrawalDetails && comment.status === "live"}
              <Button
                variant="ghost"
                size="sm"
                class="text-xs text-destructive"
                onclick={() => openWithdraw(comment)}
              >
                Withdraw
              </Button>
            {/if}
          </Card.Footer>
        </Card.Root>

        {#if (comment.replyCount ?? 0) > 0 && repliesByParent[comment._id]}
          {@const replyState = repliesByParent[comment._id]}
          {#if replyState.error}
            <div class="ml-6 mb-4 pl-4 border-l-2 border-muted text-sm text-destructive">
              {replyState.error}
            </div>
          {:else if replyState.data?.length}
            <div class="ml-6 mb-4 space-y-3">
              {#each replyState.data as reply (reply._id)}
                {@const replyOwn = currentUserId && reply.user?._id === currentUserId}
                <Card.Root class="border-muted">
                  <Card.Header class="py-2">
                    <Card.Title class="flex flex-wrap justify-between items-center gap-2 text-xs pb-0">
                      <div class="flex flex-wrap items-center gap-1.5 font-medium">
                        {authorLabel(reply)}
                        {#if (reply.user?.type ?? reply.userType) === "admin"}
                          <Badge variant="secondary" class="text-[10px] bg-(--mbo-orange) text-white">
                            Admin
                          </Badge>
                        {/if}
                        {#if (reply.user?.type ?? reply.userType) === "proposer"}
                          <Badge variant="secondary" class="text-[10px] bg-(--mbo-electric-blue) text-white">
                            Proposer
                          </Badge>
                        {/if}
                        {#if reply.user?._id?.startsWith?.("drep")}
                          <Badge variant="secondary" class="text-[10px]">DRep</Badge>
                        {/if}
                        {#if replyOwn}
                          <Badge variant="outline" class="text-[10px]">Your Comment</Badge>
                        {/if}
                        {#if reply.withdrawalDetails}
                          <Badge variant="destructive" class="text-[10px]">Withdrawn</Badge>
                        {/if}
                      </div>
                      <span class="text-muted-foreground font-normal shrink-0">
                        {new Date(reply.createdAt).toLocaleString()}
                      </span>
                    </Card.Title>
                  </Card.Header>
                  <Card.Content class="py-1 text-sm">
                    {#if reply.withdrawalDetails}
                      <p class="text-muted-foreground italic text-xs">
                        Withdrawn
                        {#if replyOwn}
                          — {reply.withdrawalDetails.category}
                        {/if}
                      </p>
                    {:else}
                      <Markdown content={reply.content} class="text-sm" />
                    {/if}
                  </Card.Content>
                </Card.Root>
              {/each}
            </div>
          {/if}
        {/if}
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

    {#if canComment}
      <Button variant="outline" class="mt-4" onclick={() => openAddDialog()}>
        Add Comment
      </Button>
    {/if}
  {/if}
</section>

<!-- Add / Reply dialog -->
<Dialog.Root
  bind:open={addDialogOpen}
  onOpenChange={(open) => {
    if (!open) {
      addDialogOpen = false;
      replyTo = null;
      commentValue = "";
      submitError = null;
    }
  }}
>
  <Dialog.Content class="sm:max-w-[500px]">
    <form
      onsubmit={(e) => {
        e.preventDefault();
        submitComment();
      }}
    >
      <Dialog.Header>
        <Dialog.Title>
          {#if replyTo}
            Reply to {authorLabel(replyTo)}
          {:else}
            Add Comment
          {/if}
        </Dialog.Title>
      </Dialog.Header>
      <div class="py-4">
        <Textarea
          id="comment-content"
          label="Comment"
          bind:value={commentValue}
          placeholder="Write your comment (markdown supported)"
          required
          maxLength={2000}
        />
        {#if submitError}
          <p class="text-sm text-destructive mt-2">{submitError}</p>
        {/if}
      </div>
      <Dialog.Footer>
        <Dialog.Close class={buttonVariants({ variant: "outline", size: "sm" })}>
          Cancel
        </Dialog.Close>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save Comment"}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<!-- Edit dialog -->
{#if editComment}
  <Dialog.Root
    open={!!editComment}
    onOpenChange={(open) => {
      if (!open) {
        editComment = null;
        editValue = "";
      }
    }}
  >
    <Dialog.Content class="sm:max-w-[500px]">
      <form
        onsubmit={(e) => {
          e.preventDefault();
          saveEdit();
        }}
      >
        <Dialog.Header>
          <Dialog.Title>Edit Comment</Dialog.Title>
        </Dialog.Header>
        <div class="py-4">
          <Textarea
            id="edit-content"
            label="Comment"
            bind:value={editValue}
            maxLength={2000}
          />
        </div>
        <Dialog.Footer>
          <Button type="button" variant="outline" size="sm" onclick={() => (editComment = null)}>
            Cancel
          </Button>
          <Button type="submit" size="sm">Save</Button>
        </Dialog.Footer>
      </form>
    </Dialog.Content>
  </Dialog.Root>
{/if}

<!-- Withdraw dialog -->
{#if withdrawComment}
  <Dialog.Root
    open={!!withdrawComment}
    onOpenChange={(open) => {
      if (!open) {
        withdrawComment = null;
        withdrawCategory = "";
        withdrawReason = "";
        withdrawError = null;
      }
    }}
  >
    <Dialog.Content class="sm:max-w-[425px]">
      <form
        onsubmit={(e) => {
          e.preventDefault();
          submitWithdraw();
        }}
      >
        <Dialog.Header>
          <Dialog.Title>Withdraw Comment</Dialog.Title>
          <Dialog.Description>
            This will withdraw the comment. The author will see the withdrawal reason.
          </Dialog.Description>
        </Dialog.Header>
        <div class="py-4 space-y-4">
          <Select.Root type="single" bind:value={withdrawCategory} required>
            <Select.Trigger class="w-full data-placeholder:text-muted-foreground">
              <span class="truncate block min-w-0">
                {withdrawCategory || "Select reason…"}
              </span>
            </Select.Trigger>
            <Select.Content>
              {#each WITHDRAWAL_CATEGORIES as cat}
                <Select.Item value={cat}>{cat}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
          <Input
            id="withdraw-reason"
            label="Reason (optional)"
            bind:value={withdrawReason}
            placeholder="Additional details…"
          />
          {#if withdrawError}
            <p class="text-sm text-destructive">{withdrawError}</p>
          {/if}
        </div>
        <Dialog.Footer>
          <Button type="button" variant="outline" size="sm" onclick={() => (withdrawComment = null)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" variant="destructive">Withdraw</Button>
        </Dialog.Footer>
      </form>
    </Dialog.Content>
  </Dialog.Root>
{/if}
